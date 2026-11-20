import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { and, eq, ne, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb, schema } from "@/db";
import type { Analysis, Settings, ProposalContent, CatalogItem, Lesson } from "@/db/schema";
import { getFile } from "@/lib/storage";
import { getLines, getSettings, listProjectsWithTotals } from "@/lib/data";
import { computeTotals, lineUnitCost, usd } from "@/lib/totals";
import { costCodeLabel, divisionOfCode, isCostCode } from "@/lib/costcodes";
import { escalationFactor, CURRENT_YEAR } from "@/lib/escalation";
import { structured, uploadToClaude, mimeFor, type Usage, MODEL } from "./client";
import { AnalysisSchema, PackageResultSchema, ProposalSchema } from "./schemas";
import { WORK_PACKAGES, packageCodeList, packageDivisions, groupOf } from "./packages";

type Ctx = { runId: number; projectId: number; usage: Usage };

// ---------- run bookkeeping ----------

async function log(ctx: Ctx, step: string) {
  const db = await getDb();
  await db
    .update(schema.aiRuns)
    .set({ step, log: sql`${schema.aiRuns.log} || ${JSON.stringify([`${new Date().toISOString().slice(11, 19)} ${step}`])}::jsonb` })
    .where(eq(schema.aiRuns.id, ctx.runId));
}

/** Adds token usage to the run row atomically (several steps run at once). */
async function addUsage(ctx: Ctx, u: Usage) {
  ctx.usage.input += u.input;
  ctx.usage.output += u.output;
  ctx.usage.cacheRead += u.cacheRead;
  const db = await getDb();
  await db
    .update(schema.aiRuns)
    .set({
      inputTokens: sql`${schema.aiRuns.inputTokens} + ${u.input}`,
      outputTokens: sql`${schema.aiRuns.outputTokens} + ${u.output}`,
      cacheReadTokens: sql`${schema.aiRuns.cacheReadTokens} + ${u.cacheRead}`,
    })
    .where(eq(schema.aiRuns.id, ctx.runId));
}

export async function startRun(projectId: number, kind: string, origin = "") {
  const db = await getDb();
  const running = await db.select().from(schema.aiRuns).where(and(eq(schema.aiRuns.projectId, projectId), eq(schema.aiRuns.status, "running")));
  // Runs older than 40 minutes are treated as dead (server restarted or a step was lost).
  const live = running.filter((r) => Date.now() - new Date(r.startedAt).getTime() < 40 * 60 * 1000);
  if (live.length) throw new Error("A run is already in progress for this project.");
  for (const r of running) await db.update(schema.aiRuns).set({ status: "error", error: "Interrupted" }).where(eq(schema.aiRuns.id, r.id));
  const [run] = await db.insert(schema.aiRuns).values({ projectId, kind, step: "Starting", secret: nanoid(32), origin }).returning();
  return run.id;
}

export async function finishRun(ctx: Ctx, error?: unknown) {
  const db = await getDb();
  await db
    .update(schema.aiRuns)
    .set({
      status: error ? "error" : "done",
      error: error ? (error instanceof Error ? error.message : String(error)) : null,
      step: error ? "Failed" : "Done",
      finishedAt: new Date(),
    })
    .where(and(eq(schema.aiRuns.id, ctx.runId), eq(schema.aiRuns.status, "running")));
}

// ---------- chained steps ----------
// A full ROM takes longer than one serverless function may run, so it runs as separate requests:
// analysis -> 9 work packages at once -> proposal. Each step is its own request to /api/runs/step.

export type Stage = "analysis" | "package" | "proposal";

export async function kickStep(runId: number, stage: Stage, key?: string) {
  const db = await getDb();
  const [run] = await db.select().from(schema.aiRuns).where(eq(schema.aiRuns.id, runId));
  if (!run || run.status !== "running") return;
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (process.env.VERCEL_AUTOMATION_BYPASS_SECRET) headers["x-vercel-protection-bypass"] = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  const origin = run.origin || `http://localhost:${process.env.PORT ?? 3000}`;
  const res = await fetch(`${origin}/api/runs/step`, { method: "POST", headers, body: JSON.stringify({ runId, secret: run.secret, stage, key }) });
  if (!res.ok) throw new Error(`Could not start the ${stage}${key ? ` (${key})` : ""} step: HTTP ${res.status}`);
}

export async function runStage(runId: number, stage: Stage, key?: string) {
  const db = await getDb();
  const [run] = await db.select().from(schema.aiRuns).where(eq(schema.aiRuns.id, runId));
  if (!run || run.status !== "running") return;
  const ctx: Ctx = { runId, projectId: run.projectId, usage: { input: 0, output: 0, cacheRead: 0 } };
  try {
    if (stage === "analysis") {
      await stageAnalysis(ctx);
      await db.update(schema.aiRuns).set({ pending: WORK_PACKAGES.map((w) => w.key) }).where(eq(schema.aiRuns.id, runId));
      await Promise.all(WORK_PACKAGES.map((w) => kickStep(runId, "package", w.key)));
    } else if (stage === "package" && key) {
      await stagePackage(ctx, key);
      // Atomically mark this package done; the last one to finish starts the proposal step.
      const rows = (await db.execute(
        sql`UPDATE ai_runs SET pending = pending - ${key}::text WHERE id = ${runId} AND status = 'running' AND pending ? ${key}::text RETURNING pending`,
      )) as unknown as { rows?: { pending: string[] }[] } | { pending: string[] }[];
      const list = Array.isArray(rows) ? rows : rows.rows ?? [];
      if (list.length && list[0].pending.length === 0) await kickStep(runId, "proposal");
    } else if (stage === "proposal") {
      await writeProposal(ctx);
      await finishRun(ctx);
    }
  } catch (e) {
    console.error(`run ${runId} ${stage} ${key ?? ""} failed`, e);
    await log(ctx, `Failed: ${stage}${key ? ` ${key}` : ""}`);
    await finishRun(ctx, e);
  }
}

// ---------- shared context (identical across every pass so it caches) ----------

const SOURCE_TAG: Record<string, string> = { actual: "Actual", bid: "Sub bid", sub_quote: "Sub bid", estimate: "Sparrow estimate", reference: "Reference rate", learned: "Learned", claude_takeoff: "Claude takeoff" };
const yearOf = (s: string) => Number(s.slice(0, 4)) || null;

function catalogText(items: CatalogItem[]) {
  if (!items.length) return "(no catalog entries yet)";
  const order = ["actual", "bid", "sub_quote", "estimate", "reference", "learned", "claude_takeoff"];
  const sorted = [...items].sort((a, b) => a.trade.localeCompare(b.trade) || order.indexOf(a.source) - order.indexOf(b.source));
  const byTrade = new Map<string, CatalogItem[]>();
  for (const c of sorted) byTrade.set(c.trade, [...(byTrade.get(c.trade) ?? []), c]);
  return [...byTrade.entries()]
    .map(([trade, rows]) => {
      const body = rows.map((r) => {
        const y = yearOf(r.quoteDate);
        const f = escalationFactor(y);
        const price = `${usd(r.unitPrice, 2)}/${r.unit}${f > 1.001 ? ` (${usd(r.unitPrice * f, 2)} in ${CURRENT_YEAR} $)` : ""}`;
        return `- ${r.costCode ? `${r.costCode} ` : ""}${r.item}: ${price} ${r.priceType} · ${SOURCE_TAG[r.source] ?? r.source}${r.vendor ? ` (${r.vendor})` : ""}${r.quoteDate ? ` ${r.quoteDate}` : ""}${r.finishLevel ? ` · ${r.finishLevel}` : ""}${r.notes ? ` · ${r.notes}` : ""}`;
      });
      return `## ${trade}\n${body.join("\n")}`;
    })
    .join("\n\n");
}

/** Comparable lines from every past estimate, grouped by Sparrow cost code, in current-year dollars. */
async function comparableLinesText(excludeProjectId: number) {
  const db = await getDb();
  const rows = await db
    .select({ l: schema.estimateLines, name: schema.projects.name, finish: schema.projects.finishLevel, year: schema.projects.costYear, created: schema.projects.createdAt })
    .from(schema.estimateLines)
    .innerJoin(schema.projects, eq(schema.estimateLines.projectId, schema.projects.id))
    .where(ne(schema.estimateLines.projectId, excludeProjectId));
  const byCode = new Map<string, string[]>();
  for (const { l, name, finish, year, created } of rows) {
    if (!isCostCode(l.csiCode) || !l.qty) continue;
    const y = year ?? new Date(created).getFullYear();
    const unit = lineUnitCost(l);
    const f = escalationFactor(y);
    const tag = l.source === "ai" ? "Claude takeoff" : l.source === "bid" ? "Sub bid" : "Sparrow estimate";
    const list = byCode.get(l.csiCode) ?? [];
    if (list.length < 8)
      list.push(`${l.description}: ${usd(unit * f, 2)}/${l.unit} (${name}, ${finish}, ${y}${f > 1.001 ? `, escalated from ${usd(unit, 2)}` : ""}, ${tag})`);
    byCode.set(l.csiCode, list);
  }
  if (!byCode.size) return "(no past lines yet)";
  return [...byCode.entries()]
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([code, list]) => `${code} ${costCodeLabel(code)}\n  - ${list.join("\n  - ")}`)
    .join("\n");
}

async function buildSystem(settings: Settings, projectId: number): Promise<Anthropic.Beta.BetaTextBlockParam[]> {
  const db = await getDb();
  const lessons: Lesson[] = await db.select().from(schema.lessons).where(eq(schema.lessons.status, "active")).orderBy(schema.lessons.scope, schema.lessons.id);
  const catalog: CatalogItem[] = await db.select().from(schema.catalog).where(eq(schema.catalog.active, true)).orderBy(schema.catalog.trade, schema.catalog.id);
  const history = (await listProjectsWithTotals())
    .filter((p) => p.total && p.id !== projectId)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((p) => {
      const f = escalationFactor(p.costYear);
      return `- ${p.name}${p.alias ? ` (alias ${p.alias})` : ""} (${p.city}, ${p.finishLevel}, ${p.status}, ${p.costYear ?? "year unknown"}${p.totalSf ? `, ${p.totalSf} SF` : ""}): contract ${usd(p.total)}${p.perSf ? ` = ${usd(p.perSf)}/SF` : ""}${f > 1.001 && p.perSf ? ` (${usd(p.perSf * f)}/SF in ${CURRENT_YEAR} $)` : ""}${p.actualCost ? `; actual ${usd(p.actualCost)}` : ""}${p.competitorPrice ? `; winning/competing bid ${usd(p.competitorPrice)}` : ""}. ${p.outcomeNotes}`;
    })
    .join("\n");
  const c = settings.company;
  const labor = Object.entries(settings.laborRates).map(([k, v]) => `${k} $${v}/hr`).join(", ");
  const m = settings.markups;

  return [
    {
      type: "text",
      text: `You are the senior estimator at ${c.name} (${c.tagline}, ${c.location}). ${c.about ?? ""}

Your job is to read an architect's drawing set and produce a rough order of magnitude (ROM) that is a FULL project cost the owner can rely on: every trade, including mechanical, electrical, plumbing and site work, priced before those trades are bid. A ROM that wins work is accurate, not low: price what the drawings call for, complete, at realistic ${CURRENT_YEAR} costs for the site's county, and say clearly what is an allowance.

How to work:
- Code every line to Sparrow's own Master Cost Code List (e.g. 300.1, 704.2, 1500.2), never CSI MasterFormat. Use only codes from the list you are given.
- Take quantities from the drawings. Measure from dimensions; where undimensioned, scale it and say "scaled" in the note. Cite sheet numbers.
- Never invent names, products or numbers the drawings don't support. If information is missing, carry an allowance, tag it, and say what drove the number.
- Before pricing a line, look for comparable lines below with the same cost code, unit and finish level. Rate priority: Actual > Sub bid > Sparrow estimate > Claude takeoff. Use your own market knowledge only when nothing comparable exists. Compare jobs from different years in ${CURRENT_YEAR} dollars (escalated figures are given). State the source tag and where the rate came from in pricingBasis.
- Apply the lessons below. They come from comparing past ROMs against real bids, actual costs and win/loss outcomes.
- Markups (insurance, overhead, fee, contingency, WA sales tax) are applied by the app. Every number you return is DIRECT cost, with no markup. Company default today: insurance ${m.insurancePct}%, overhead ${m.overheadPct}%, fee ${m.feePct}%.
- Write in Mike's voice: plain, direct, short sentences. No em dashes. No AI-sounding phrasing.

# Estimating standards
${settings.estimatingStandards}

# Labor rates (burdened cost per hour)
${labor}

# Lessons learned (apply these)
${lessons.map((l) => `- [#${l.id} ${l.scope}] ${l.text}`).join("\n") || "(none yet)"}

# Past projects (totals)
${history || "(none yet)"}

# Comparable lines from past estimates, by Sparrow cost code (${CURRENT_YEAR} $)
${await comparableLinesText(projectId)}

# Subcontractor and unit price catalog (best source first within each trade)
${catalogText(catalog)}`,
    },
  ];
}

async function planBlocks(ctx: Ctx): Promise<Anthropic.Beta.BetaContentBlockParam[]> {
  const db = await getDb();
  const files = await db.select().from(schema.planFiles).where(eq(schema.planFiles.projectId, ctx.projectId)).orderBy(schema.planFiles.id);
  if (!files.length) throw new Error("Upload the plan set first.");
  const blocks: Anthropic.Beta.BetaContentBlockParam[] = [];
  for (const f of files) {
    let fileId = f.anthropicFileId;
    if (!fileId) {
      await log(ctx, `Uploading ${f.filename} to Claude`);
      fileId = await uploadToClaude(f.filename, await getFile(f.storageKey), mimeFor(f.filename));
      await db.update(schema.planFiles).set({ anthropicFileId: fileId }).where(eq(schema.planFiles.id, f.id));
    }
    if (mimeFor(f.filename).startsWith("image/")) blocks.push({ type: "image", source: { type: "file", file_id: fileId } });
    else blocks.push({ type: "document", source: { type: "file", file_id: fileId }, title: f.filename });
  }
  // Cache everything up to and including the plan set: system + docs are identical for every pass.
  (blocks[blocks.length - 1] as { cache_control?: unknown }).cache_control = { type: "ephemeral" };
  return blocks;
}

async function projectNotes(projectId: number) {
  const db = await getDb();
  const [p] = await db.select().from(schema.projects).where(eq(schema.projects.id, projectId));
  return {
    project: p,
    notes: [
      p.ownerNotes && `Notes from Sparrow about this project: ${p.ownerNotes}`,
      `Finish level: ${p.finishLevel}.`,
      p.totalSf && `Sparrow's stated area: ${p.totalSf} SF.`,
      (p.address || p.city) && `Site: ${[p.address, p.city].filter(Boolean).join(", ")}.`,
    ]
      .filter(Boolean)
      .join("\n"),
  };
}

// ---------- stages ----------

async function stageAnalysis(ctx: Ctx) {
  const db = await getDb();
  const settings = await getSettings();
  const { project, notes } = await projectNotes(ctx.projectId);
  // Replace prior AI lines and packages (lines Sparrow added by hand are kept).
  await db.delete(schema.estimateLines).where(and(eq(schema.estimateLines.projectId, ctx.projectId), sql`${schema.estimateLines.source} in ('ai','catalog')`));
  await db.delete(schema.tradePackages).where(eq(schema.tradePackages.projectId, ctx.projectId));
  const system = await buildSystem(settings, ctx.projectId);
  const docs = await planBlocks(ctx);
  await log(ctx, "Reading the plan set (sheets, quantities, conflicts)");
  const a = await structured({
    system,
    content: [
      ...docs,
      {
        type: "text",
        text: `${notes}\n\nRead every sheet of this drawing set. Return the project facts, sheet index, the shared takeoff quantities every trade will need, the building systems, every conflict between sheets or with code, and the missing information that forces allowances. Estimate the construction duration in weeks for a Sparrow crew.`,
      },
    ],
    schema: AnalysisSchema,
    effort: "high",
  });
  await addUsage(ctx, a.usage);
  const an = a.data;
  const analysis: Analysis = {
    summary: an.summary,
    buildingType: an.buildingType,
    stories: an.stories,
    totalSf: an.totalSf,
    conditionedSf: an.conditionedSf,
    scheduleWeeks: an.scheduleWeeks,
    sheets: an.sheets,
    quantities: an.quantities,
    systems: an.systems,
    conflicts: an.conflicts,
    missingInfo: an.missingInfo,
  };
  await db
    .update(schema.projects)
    .set({
      analysis,
      name: project.name || an.projectName,
      client: project.client || an.client,
      architect: project.architect || an.architect,
      structural: project.structural || an.structural,
      address: project.address || an.address,
      city: project.city || an.city,
      designStage: project.designStage || an.designStage,
      totalSf: project.totalSf ?? an.totalSf,
      conditionedSf: project.conditionedSf ?? an.conditionedSf,
      costYear: project.costYear ?? CURRENT_YEAR,
      status: project.status === "draft" ? "estimating" : project.status,
      updatedAt: new Date(),
    })
    .where(eq(schema.projects.id, ctx.projectId));
  await log(ctx, `Read ${an.sheets.length} sheets, ${an.quantities.length} quantities, ${an.conflicts.length} conflicts. Pricing ${WORK_PACKAGES.length} packages`);
}

async function stagePackage(ctx: Ctx, key: string) {
  const wp = WORK_PACKAGES.find((w) => w.key === key);
  if (!wp) throw new Error(`Unknown work package ${key}`);
  const db = await getDb();
  const settings = await getSettings();
  const { project, notes } = await projectNotes(ctx.projectId);
  const system = await buildSystem(settings, ctx.projectId);
  const docs = await planBlocks(ctx);
  await log(ctx, `Pricing: ${wp.title}`);
  const r = await structured({
    system,
    content: [
      ...docs,
      {
        type: "text",
        text: `${notes}\n\nShared takeoff for this project (use these quantities so every trade agrees):\n${JSON.stringify(project.analysis)}\n\n# Your package: ${wp.title}\nYou own these Sparrow cost codes and no others:\n${packageCodeList(wp)}\n\n${wp.instructions}\n\nReturn every line for your cost codes. If a group has no scope on this project, list it in emptyCodes with a one-line reason. Material lists in trade packages must have real quantities from the takeoff.`,
      },
    ],
    schema: PackageResultSchema,
    effort: "high",
  });
  await addUsage(ctx, r.usage);
  const data = r.data;
  const rate = (role: string) => (role === "none" ? 0 : settings.laborRates[role] ?? 105);
  const fallbackDiv = packageDivisions(wp)[0];
  if (data.lines.length) {
    await db.insert(schema.estimateLines).values(
      data.lines.map((l, i) => {
        const code = l.costCode.trim();
        const owned = wp.groups.includes(groupOf(code) ?? -1);
        return {
          projectId: ctx.projectId,
          division: divisionOfCode(code) ?? fallbackDiv,
          csiCode: code,
          description: l.description,
          scope: l.scope,
          qty: l.qty,
          unit: l.unit,
          laborHoursPerUnit: l.laborRole === "none" ? 0 : l.laborHoursPerUnit,
          laborRate: rate(l.laborRole),
          materialUnit: l.materialUnit,
          subUnit: l.subUnit,
          isAllowance: l.isAllowance,
          trade: l.trade || "Sparrow",
          note: [l.note, l.pricingBasis && `Basis: ${l.pricingBasis}`, !isCostCode(code) && "Check cost code", isCostCode(code) && !owned && `Priced in the ${wp.key} pass`].filter(Boolean).join(" · "),
          source: "ai",
          aiOriginal: { ...l, laborRate: rate(l.laborRole) },
          sort: WORK_PACKAGES.indexOf(wp) * 1000 + i,
        };
      }),
    );
  }
  for (const tp of data.tradePackages) {
    const tradeLines = data.lines.filter((l) => l.trade === tp.trade || tp.trade.toLowerCase().includes(l.trade.toLowerCase()));
    const est = (tradeLines.length ? tradeLines : data.lines.filter((l) => l.trade !== "Sparrow")).reduce(
      (s, l) => s + l.qty * (l.subUnit + l.materialUnit + l.laborHoursPerUnit * rate(l.laborRole)),
      0,
    );
    await db.insert(schema.tradePackages).values({
      projectId: ctx.projectId,
      trade: tp.trade,
      divisions: packageDivisions(wp).join(", "),
      scopeOfWork: tp.scopeOfWork,
      inclusions: tp.inclusions,
      exclusions: tp.exclusions,
      materials: tp.materials,
      questions: tp.questions,
      sheetRefs: tp.sheetRefs,
      estimatedPrice: Math.round(est),
    });
  }
  await log(ctx, `Priced: ${wp.title} (${data.lines.length} lines)`);
}

export async function writeProposal(ctx: Ctx) {
  const db = await getDb();
  await log(ctx, "Writing proposal content");
  const settings = await getSettings();
  const [project] = await db.select().from(schema.projects).where(eq(schema.projects.id, ctx.projectId));
  const lines = await getLines(ctx.projectId);
  const t = computeTotals(lines, project.markups);
  const divs = t.divisions.filter((d) => d.total > 0).map((d) => `${d.code} ${d.name}: ${usd(d.total)}`).join("\n");
  const biggest = [...lines]
    .map((l) => ({ l, total: l.qty * lineUnitCost(l) }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 40)
    .map(({ l, total }) => `- [${l.csiCode}] ${l.description}: ${usd(total)} (${l.qty} ${l.unit})`)
    .join("\n");
  const r = await structured({
    system: await buildSystem(settings, ctx.projectId),
    content: [
      {
        type: "text",
        text: `Write the client proposal content for ${project.name} (${project.city}). Client: ${project.client || "unknown"}. Architect: ${project.architect}.
Project analysis: ${JSON.stringify(project.analysis)}
Direct cost ${usd(t.direct)}, contract total ${usd(t.total)}.
Division totals:\n${divs}
Largest lines:\n${biggest}

Voice: Mike Stuntz, owner. Plain, direct, casual-professional, short sentences, no em dashes, no hype or AI-sounding phrases.
Value options: 4 real scope deducts drawn from the lines above that don't touch the signature design. directDelta is the change in direct cost (negative).`,
      },
    ],
    schema: ProposalSchema,
    effort: "medium",
    maxTokens: 16000,
  });
  await addUsage(ctx, r.usage);
  // Claude rewrites the copy only. Images, gallery, film, agreement, retainer, closing, team and section toggles stay as Sparrow set them.
  const prev = project.proposal;
  const proposal: ProposalContent = {
    heroImage: "",
    heroCaption: "",
    elevationImage: "",
    elevationCaption: "",
    ...(prev ?? {}),
    ...r.data,
    exclusions: prev?.exclusions?.length ? prev.exclusions : settings.company.defaultExclusions,
  };
  await db.update(schema.projects).set({ proposal, updatedAt: new Date() }).where(eq(schema.projects.id, ctx.projectId));
}

/** Single-call runs (proposal rewrite) that fit in one request. */
export async function runProposalOnly(projectId: number, runId: number) {
  const ctx: Ctx = { runId, projectId, usage: { input: 0, output: 0, cacheRead: 0 } };
  try {
    await writeProposal(ctx);
    await finishRun(ctx);
  } catch (e) {
    await finishRun(ctx, e);
  }
}

export { MODEL, buildSystem, log, addUsage };
export type { Ctx };
