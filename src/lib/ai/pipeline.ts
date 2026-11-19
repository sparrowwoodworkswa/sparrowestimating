import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { and, eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { Analysis, Settings, ProposalContent, CatalogItem, Lesson } from "@/db/schema";
import { getFile } from "@/lib/storage";
import { getLines, getSettings, listProjectsWithTotals } from "@/lib/data";
import { computeTotals, usd } from "@/lib/totals";
import { divisionName } from "@/lib/csi";
import { structured, uploadToClaude, mimeFor, type Usage, MODEL } from "./client";
import { AnalysisSchema, PackageResultSchema, ProposalSchema, type PackageResult } from "./schemas";
import { WORK_PACKAGES } from "./packages";

type Ctx = { runId: number; projectId: number; usage: Usage };

async function log(ctx: Ctx, step: string) {
  const db = await getDb();
  await db
    .update(schema.aiRuns)
    .set({
      step,
      log: sql`${schema.aiRuns.log} || ${JSON.stringify([`${new Date().toISOString().slice(11, 19)} ${step}`])}::jsonb`,
      inputTokens: ctx.usage.input,
      outputTokens: ctx.usage.output,
      cacheReadTokens: ctx.usage.cacheRead,
    })
    .where(eq(schema.aiRuns.id, ctx.runId));
}

function addUsage(ctx: Ctx, u: Usage) {
  ctx.usage.input += u.input;
  ctx.usage.output += u.output;
  ctx.usage.cacheRead += u.cacheRead;
}

export async function startRun(projectId: number, kind: string) {
  const db = await getDb();
  const running = await db
    .select()
    .from(schema.aiRuns)
    .where(and(eq(schema.aiRuns.projectId, projectId), eq(schema.aiRuns.status, "running")));
  // Treat runs older than 40 minutes as dead (server restarted mid-run)
  const live = running.filter((r) => Date.now() - new Date(r.startedAt).getTime() < 40 * 60 * 1000);
  if (live.length) throw new Error("A run is already in progress for this project.");
  for (const r of running) await db.update(schema.aiRuns).set({ status: "error", error: "Interrupted" }).where(eq(schema.aiRuns.id, r.id));
  const [run] = await db.insert(schema.aiRuns).values({ projectId, kind, step: "Starting" }).returning();
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
      inputTokens: ctx.usage.input,
      outputTokens: ctx.usage.output,
      cacheReadTokens: ctx.usage.cacheRead,
    })
    .where(eq(schema.aiRuns.id, ctx.runId));
}

// ---------- shared context (identical across every pass so it caches) ----------

function catalogText(items: CatalogItem[]) {
  if (!items.length) return "(no catalog entries yet)";
  const byTrade = new Map<string, CatalogItem[]>();
  for (const c of items) byTrade.set(c.trade, [...(byTrade.get(c.trade) ?? []), c]);
  return [...byTrade.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(
      ([trade, rows]) =>
        `## ${trade}\n` +
        rows
          .map((r) => `- ${r.item}: ${usd(r.unitPrice, 2)}/${r.unit} ${r.priceType} · ${r.source}${r.vendor ? ` (${r.vendor})` : ""}${r.quoteDate ? ` ${r.quoteDate}` : ""}${r.notes ? ` · ${r.notes}` : ""}`)
          .join("\n"),
    )
    .join("\n\n");
}

async function buildSystem(settings: Settings): Promise<Anthropic.Beta.BetaTextBlockParam[]> {
  const db = await getDb();
  const lessons: Lesson[] = await db.select().from(schema.lessons).where(eq(schema.lessons.status, "active")).orderBy(schema.lessons.scope, schema.lessons.id);
  const catalog: CatalogItem[] = await db.select().from(schema.catalog).where(eq(schema.catalog.active, true)).orderBy(schema.catalog.trade, schema.catalog.id);
  const history = (await listProjectsWithTotals())
    .filter((p) => p.total)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(
      (p) =>
        `- ${p.name} (${p.city}, ${p.finishLevel}, ${p.status}${p.totalSf ? `, ${p.totalSf} SF` : ""}): contract ${usd(p.total)}${p.perSf ? ` = ${usd(p.perSf)}/SF` : ""}${p.actualCost ? `; actual ${usd(p.actualCost)}` : ""}${p.competitorPrice ? `; winning/competing bid ${usd(p.competitorPrice)}` : ""}. ${p.outcomeNotes}`,
    )
    .join("\n");
  const c = settings.company;
  const labor = Object.entries(settings.laborRates).map(([k, v]) => `${k} $${v}/hr`).join(", ");
  const m = settings.markups;

  return [
    {
      type: "text",
      text: `You are the senior estimator at ${c.name} (${c.tagline}, ${c.location}). Sparrow builds high-end custom homes, additions and remodels across Kitsap County, Bainbridge Island and the Olympic Peninsula, Washington. They work cost-plus and open book.

Your job is to read an architect's drawing set and produce a rough order of magnitude (ROM) that is a FULL project cost the owner can rely on: every trade, including mechanical, electrical, plumbing and grading, priced before those trades are bid. A ROM that wins work is accurate, not low: price what the drawings call for, complete, at realistic Puget Sound 2026 costs, and say clearly what is an allowance.

How to work:
- Take quantities from the drawings. Measure from dimensions; where undimensioned, scale it and say "scaled" in the note. Cite sheet numbers.
- Never invent names, products or numbers the drawings don't support. If information is missing, carry an allowance, tag it, and say what drove the number.
- Prefer prices in this order: (1) Sparrow's subcontractor catalog below (real quotes and bids), (2) unit costs from Sparrow's past projects below, (3) your market knowledge of current Puget Sound costs. State which in pricingBasis.
- Apply the lessons below. They come from comparing past ROMs against real bids, actual costs and win/loss outcomes.
- Markups (insurance ${m.insurancePct}%, overhead ${m.overheadPct}%, fee ${m.feePct}%, contingency ${m.contingencyPct}%, WA sales tax) are applied by the app. Every number you return is DIRECT cost, with no markup.
- Write in plain, short sentences. No em dashes.

# Estimating standards
${settings.estimatingStandards}

# Labor rates (burdened cost per hour)
${labor}

# Lessons learned (apply these)
${lessons.map((l) => `- [#${l.id} ${l.scope}] ${l.text}`).join("\n") || "(none yet)"}

# Past projects (benchmarks; older jobs are in past-year dollars, escalate ~4%/yr)
${history || "(none yet)"}

# Subcontractor and unit price catalog
${catalogText(catalog)}`,
    },
  ];
}

async function planBlocks(projectId: number, ctx: Ctx): Promise<Anthropic.Beta.BetaContentBlockParam[]> {
  const db = await getDb();
  const files = await db.select().from(schema.planFiles).where(eq(schema.planFiles.projectId, projectId)).orderBy(schema.planFiles.id);
  if (!files.length) throw new Error("Upload the plan set first.");
  const blocks: Anthropic.Beta.BetaContentBlockParam[] = [];
  for (const f of files) {
    let fileId = f.anthropicFileId;
    if (!fileId) {
      await log(ctx, `Uploading ${f.filename} to Claude`);
      fileId = await uploadToClaude(f.filename, await getFile(f.storageKey), mimeFor(f.filename));
      await db.update(schema.planFiles).set({ anthropicFileId: fileId }).where(eq(schema.planFiles.id, f.id));
    }
    const mime = mimeFor(f.filename);
    if (mime.startsWith("image/")) blocks.push({ type: "image", source: { type: "file", file_id: fileId } });
    else blocks.push({ type: "document", source: { type: "file", file_id: fileId }, title: f.filename });
  }
  // Cache everything up to and including the plan set: system + docs are identical for every pass.
  const last = blocks[blocks.length - 1] as { cache_control?: unknown };
  last.cache_control = { type: "ephemeral" };
  return blocks;
}

async function pool<T, R>(items: T[], limit: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (i < items.length) {
        const idx = i++;
        out[idx] = await fn(items[idx]);
      }
    }),
  );
  return out;
}

// ---------- the estimate run ----------

export async function runEstimate(projectId: number, runId: number) {
  const ctx: Ctx = { runId, projectId, usage: { input: 0, output: 0, cacheRead: 0 } };
  const db = await getDb();
  try {
    const settings = await getSettings();
    const [project] = await db.select().from(schema.projects).where(eq(schema.projects.id, projectId));
    const system = await buildSystem(settings);
    const docs = await planBlocks(projectId, ctx);

    // 1. Read the set
    await log(ctx, "Reading the plan set (sheets, quantities, conflicts)");
    const ownerNotes = [
      project.ownerNotes && `Notes from Sparrow about this project: ${project.ownerNotes}`,
      `Finish level: ${project.finishLevel}.`,
      project.totalSf && `Sparrow's stated area: ${project.totalSf} SF.`,
    ]
      .filter(Boolean)
      .join("\n");
    const a = await structured({
      system,
      content: [
        ...docs,
        {
          type: "text",
          text: `${ownerNotes}\n\nRead every sheet of this drawing set. Return the project facts, sheet index, the shared takeoff quantities every trade will need, the building systems, every conflict between sheets or with code, and the missing information that forces allowances. Estimate the construction duration in weeks for a Sparrow crew.`,
        },
      ],
      schema: AnalysisSchema,
      effort: "high",
    });
    addUsage(ctx, a.usage);
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
        status: project.status === "draft" ? "estimating" : project.status,
        updatedAt: new Date(),
      })
      .where(eq(schema.projects.id, projectId));
    await log(ctx, `Read ${an.sheets.length} sheets, ${an.quantities.length} quantities, ${an.conflicts.length} conflicts`);

    // 2. Price every work package in parallel (they all read the same cached plan set)
    const analysisText = `Shared takeoff for this project (use these quantities so every trade agrees):\n${JSON.stringify(analysis)}`;
    const results = await pool(WORK_PACKAGES, 4, async (wp) => {
      await log(ctx, `Pricing: ${wp.title}`);
      const r = await structured({
        system,
        content: [
          ...docs,
          {
            type: "text",
            text: `${ownerNotes}\n\n${analysisText}\n\n# Your package: ${wp.title}\nDivisions: ${wp.divisions.map((d) => `${d} ${divisionName(d)}`).join(", ")}.\n${wp.instructions}\n\nReturn every line for these divisions only. If a division has no scope on this project, list it in emptyDivisions with a one-line reason. Material lists in trade packages must have real quantities from the takeoff.`,
          },
        ],
        schema: PackageResultSchema,
        effort: "high",
      });
      addUsage(ctx, r.usage);
      await log(ctx, `Priced: ${wp.title} (${r.data.lines.length} lines)`);
      return { wp, data: r.data as PackageResult };
    });

    // 3. Save: replace prior AI lines and packages (manual lines are kept)
    await log(ctx, "Saving estimate");
    await db.delete(schema.estimateLines).where(and(eq(schema.estimateLines.projectId, projectId), sql`${schema.estimateLines.source} in ('ai','catalog')`));
    await db.delete(schema.tradePackages).where(eq(schema.tradePackages.projectId, projectId));
    let sort = 0;
    for (const { wp, data } of results) {
      if (data.lines.length) {
        await db.insert(schema.estimateLines).values(
          data.lines.map((l) => {
            const rate = l.laborRole === "none" ? 0 : (settings.laborRates[l.laborRole] ?? 105);
            return {
              projectId,
              division: wp.divisions.includes(l.division.padStart(2, "0")) ? l.division.padStart(2, "0") : wp.divisions[0],
              csiCode: l.csiCode,
              description: l.description,
              scope: l.scope,
              qty: l.qty,
              unit: l.unit,
              laborHoursPerUnit: l.laborRole === "none" ? 0 : l.laborHoursPerUnit,
              laborRate: rate,
              materialUnit: l.materialUnit,
              subUnit: l.subUnit,
              isAllowance: l.isAllowance,
              trade: l.trade || "Sparrow",
              note: [l.note, l.pricingBasis && `Basis: ${l.pricingBasis}`].filter(Boolean).join(" · "),
              source: "ai",
              aiOriginal: { ...l, laborRate: rate },
              sort: sort++,
            };
          }),
        );
      }
      for (const tp of data.tradePackages) {
        const tradeLines = data.lines.filter((l) => l.trade === tp.trade || tp.trade.toLowerCase().includes(l.trade.toLowerCase()));
        const est = (tradeLines.length ? tradeLines : data.lines.filter((l) => l.trade !== "Sparrow")).reduce(
          (s, l) => s + l.qty * (l.subUnit + l.materialUnit + (l.laborRole === "none" ? 0 : l.laborHoursPerUnit * (settings.laborRates[l.laborRole] ?? 105))),
          0,
        );
        await db.insert(schema.tradePackages).values({
          projectId,
          trade: tp.trade,
          divisions: wp.divisions.join(", "),
          scopeOfWork: tp.scopeOfWork,
          inclusions: tp.inclusions,
          exclusions: tp.exclusions,
          materials: tp.materials,
          questions: tp.questions,
          sheetRefs: tp.sheetRefs,
          estimatedPrice: Math.round(est),
        });
      }
    }

    // 4. Proposal content
    await writeProposal(projectId, ctx, system);
    await finishRun(ctx);
  } catch (e) {
    console.error("estimate run failed", e);
    await finishRun(ctx, e);
  }
}

export async function writeProposal(projectId: number, ctx: Ctx, system?: Anthropic.Beta.BetaTextBlockParam[]) {
  const db = await getDb();
  await log(ctx, "Writing proposal content");
  const settings = await getSettings();
  const [project] = await db.select().from(schema.projects).where(eq(schema.projects.id, projectId));
  const lines = await getLines(projectId);
  const t = computeTotals(lines, project.markups);
  const divs = t.divisions.filter((d) => d.total > 0).map((d) => `${d.code} ${d.name}: ${usd(d.total)}`).join("\n");
  const biggest = [...lines]
    .map((l) => ({ l, total: l.qty * (l.laborHoursPerUnit * l.laborRate + l.materialUnit + l.subUnit) }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 40)
    .map(({ l, total }) => `- [${l.division}] ${l.description}: ${usd(total)} (${l.qty} ${l.unit})`)
    .join("\n");
  const r = await structured({
    system: system ?? (await buildSystem(settings)),
    content: [
      {
        type: "text",
        text: `Write the client proposal content for ${project.name} (${project.city}). Architect: ${project.architect}.
Project analysis: ${JSON.stringify(project.analysis)}
Direct cost ${usd(t.direct)}, contract total ${usd(t.total)}.
Division totals:\n${divs}
Largest lines:\n${biggest}

Voice: Mike Stuntz, owner. Plain, direct, casual-professional, short sentences, no em dashes, no hype or AI-sounding phrases.
Value options: 4 real scope deducts drawn from the lines above that don't touch the signature design. directDelta is the change in direct cost (negative).
Milestones: 5, from week 0 break ground to closeout at the schedule duration.`,
      },
    ],
    schema: ProposalSchema,
    effort: "medium",
    maxTokens: 16000,
  });
  addUsage(ctx, r.usage);
  const prev = project.proposal;
  const proposal: ProposalContent = {
    ...r.data,
    heroImage: prev?.heroImage ?? "",
    heroCaption: prev?.heroCaption ?? "",
    elevationImage: prev?.elevationImage ?? "",
    elevationCaption: prev?.elevationCaption ?? "",
    exclusions: prev?.exclusions?.length ? prev.exclusions : settings.company.defaultExclusions,
  };
  await db.update(schema.projects).set({ proposal, updatedAt: new Date() }).where(eq(schema.projects.id, projectId));
}

export async function runProposalOnly(projectId: number, runId: number) {
  const ctx: Ctx = { runId, projectId, usage: { input: 0, output: 0, cacheRead: 0 } };
  try {
    await writeProposal(projectId, ctx);
    await finishRun(ctx);
  } catch (e) {
    await finishRun(ctx, e);
  }
}

export { MODEL, buildSystem, log, addUsage };
export type { Ctx };
