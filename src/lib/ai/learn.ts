import "server-only";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { getLines, getPackages, getSettings } from "@/lib/data";
import { computeTotals, lineParts, usd } from "@/lib/totals";
import { structured } from "./client";
import { LearnSchema } from "./schemas";
import { buildSystem, finishRun, log, addUsage, type Ctx } from "./pipeline";

/**
 * The learning loop. Compares what the AI first estimated against what Sparrow changed,
 * what subs actually bid, what the job really cost, and whether we won. Writes proposed
 * lessons and catalog prices that feed every future ROM once approved.
 */
export async function runLearn(projectId: number, runId: number) {
  const ctx: Ctx = { runId, projectId, usage: { input: 0, output: 0, cacheRead: 0 } };
  const db = await getDb();
  try {
    const settings = await getSettings();
    const [project] = await db.select().from(schema.projects).where(eq(schema.projects.id, projectId));
    const lines = await getLines(projectId);
    const packages = await getPackages(projectId);
    const totals = computeTotals(lines, project.markups);
    const existingLessons = await db.select().from(schema.lessons).where(eq(schema.lessons.status, "active"));

    await log(ctx, "Comparing the ROM with edits, bids, outcome and actuals");

    const edits = lines
      .filter((l) => l.aiOriginal)
      .map((l) => {
        const o = l.aiOriginal as Record<string, number | string>;
        const now = lineParts(l).total;
        const was = Number(o.qty) * (Number(o.laborHoursPerUnit) * Number(o.laborRate ?? l.laborRate) + Number(o.materialUnit) + Number(o.subUnit));
        return { d: l.description, was, now, qtyWas: o.qty, qtyNow: l.qty, unit: l.unit };
      })
      .filter((e) => Math.abs(e.now - e.was) > 50)
      .map((e) => `- ${e.d}: AI ${usd(e.was)} (${e.qtyWas} ${e.unit}) -> Sparrow ${usd(e.now)} (${e.qtyNow} ${e.unit})`);
    const added = lines.filter((l) => l.source === "manual").map((l) => `- added by Sparrow: ${l.description} ${usd(lineParts(l).total)}`);
    const bids = packages
      .filter((p) => p.bidAmount != null)
      .map((p) => `- ${p.trade}: ROM ${usd(p.estimatedPrice)} vs bid ${usd(p.bidAmount)} from ${p.bidVendor || "sub"}${p.bidNotes ? ` (${p.bidNotes})` : ""}`);

    const r = await structured({
      system: await buildSystem(settings),
      content: [
        {
          type: "text",
          text: `Review this finished estimate and teach yourself to estimate better next time.

Project: ${project.name}, ${project.city}, ${project.totalSf ?? "?"} SF, finish ${project.finishLevel}. Status: ${project.status}.
ROM: direct ${usd(totals.direct)}, contract ${usd(totals.total)}${project.totalSf ? ` (${usd(totals.total / project.totalSf)}/SF)` : ""}.
${project.competitorPrice ? `Winning or competing bid: ${usd(project.competitorPrice)}.` : ""}
${project.actualCost ? `Actual final cost: ${usd(project.actualCost)}.` : ""}
Outcome notes from Sparrow: ${project.outcomeNotes || "(none)"}

Lines Sparrow changed after the AI estimate:
${edits.join("\n") || "(none)"}
${added.join("\n")}

Sub bids received vs ROM:
${bids.join("\n") || "(none)"}

Write lessons that will make the next ROM more accurate and more likely to win: specific, with numbers, scoped to a trade or division, and only what this evidence supports. Don't repeat an existing lesson unless you are sharpening it. Propose catalog unit prices from real sub bids or Sparrow's edits (installed $/unit). List IDs of existing lessons this evidence contradicts.`,
        },
      ],
      schema: LearnSchema,
      effort: "high",
      maxTokens: 16000,
    });
    addUsage(ctx, r.usage);

    if (r.data.lessons.length)
      await db.insert(schema.lessons).values(r.data.lessons.map((l) => ({ scope: l.scope, text: l.text, status: "proposed", source: "learned", projectId })));
    if (r.data.catalogUpdates.length)
      await db.insert(schema.catalog).values(
        r.data.catalogUpdates.map((c) => ({
          trade: c.trade,
          item: c.item,
          unit: c.unit,
          unitPrice: c.unitPrice,
          vendor: c.vendor,
          notes: c.notes,
          source: "learned",
          projectId,
          active: false,
          quoteDate: new Date().toISOString().slice(0, 7),
        })),
      );
    const retire = r.data.retireLessonIds.filter((id) => existingLessons.some((l) => l.id === id));
    await db
      .update(schema.projects)
      .set({
        learnedAt: new Date(),
        outcomeNotes: project.outcomeNotes,
        ownerNotes: project.ownerNotes + (retire.length ? `\n[Learn] Suggested retiring lessons: ${retire.join(", ")}` : ""),
      })
      .where(eq(schema.projects.id, projectId));
    await log(ctx, `Learned: ${r.data.lessons.length} lessons and ${r.data.catalogUpdates.length} prices to review. ${r.data.summary}`);
    await finishRun(ctx);
  } catch (e) {
    console.error("learn run failed", e);
    await finishRun(ctx, e);
  }
}
