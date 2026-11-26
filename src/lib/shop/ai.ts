import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { getFile } from "@/lib/storage";
import { anthropic, MODEL, structured, uploadToClaude, mimeFor, AiError } from "@/lib/ai/client";
import { CURRENT_YEAR } from "@/lib/escalation";
import { PIECE_TASKS, JOB_TASKS, hrs, usd } from "./model";
import { TakeoffSchema, MarketSchema, type MarketResult } from "./schemas";
export type { MarketResult };
import { getLibrary, getPriceBook, getTaskFactors } from "./data";

// ---------------- plan takeoff ----------------

const TAKEOFF_SYSTEM = `You are the shop estimator for Sparrow Woodworks, a general contractor with its own cabinet and millwork shop in Indianola, WA. Derek Crenshaw runs the shop.

You do a shop takeoff from an architect's drawings: every piece the shop would build (casework, banquettes, benches, tables, wall panels, screens, columns, ceiling boards, beams, doors, trim) with quantities and crew-hours by production step, plus the job-level tasks and a materials list.

How the shop prices work (follow it exactly):
- Each row is a piece type with a quantity. Hours are crew-hours for the whole row, split across these steps: ${PIECE_TASKS.map((t) => `${t.key} (${t.label}: ${t.hint})`).join("; ")}.
- Install is priced as a two-person crew, so install hours are crew-hours. Leave install and finish at 0 unless the drawings or notes put them in the shop's scope; say so in questions.
- Job-level tasks go in extras: ${JOB_TASKS.map((t) => t.key).join(", ")}. Size estimating and ordering, material handling and packaging to the job. Packaging and transport use crew 2.
- Price materials by board feet for solid stock (add 25 to 35% waste and say which), sheets for plywood and veneer panels, LF for T&G and moulding. Use the price book first and name the source in the note. Add an allowance line for hardware and one for glue, screws, paper and sundries.

Rate priority: Actual > Sparrow estimate > Claude takeoff. Start from the production library: reuse the per-unit hours of the closest piece type and scale by size, and say which sample you used in "basis". When a job-level factor shows the shop ran over its estimate on a step, apply it and say so. When nothing in the library fits, estimate from the steps and mark confidence low.

Only count what is new shop work. Existing to remain, reupholstery, stone countertops, tile, paint, plaster and light fixtures are not shop scope: list them in outOfScope. When a schedule lists a material that you cannot find on the plans or elevations, do not count it; ask in questions. Count from the drawings, and when counts are uncertain say how you counted.

Write plainly. Short sentences. No em dashes.`;

async function libraryText() {
  const lib = await getLibrary();
  if (!lib.length) return "(empty)";
  return lib
    .map((e) => {
      const s = e.samples
        .slice(0, 4)
        .map(
          (x) =>
            `  - ${x.jobName} ${x.year ?? ""} [${x.source}] qty ${x.qty}: ${hrs(x.total)} crew-h/${e.unit} (${Object.entries(x.perUnit)
              .map(([k, v]) => `${k} ${hrs(v)}`)
              .join(", ")})${x.actualFactor ? `; job actual/estimate ${x.actualFactor.toFixed(2)}x` : ""}`,
        )
        .join("\n");
      return `- ${e.pieceType} (per ${e.unit})\n${s}`;
    })
    .join("\n");
}

async function priceText() {
  const book = await getPriceBook();
  if (!book.length) return "(empty)";
  return book
    .map((p) => `- ${p.item}: ${usd(p.current, 2)}/${p.unit} (${CURRENT_YEAR} $; ${usd(p.unitPrice, 2)} ${p.quoteDate} ${p.source}${p.vendor ? `, ${p.vendor}` : ""})`)
    .join("\n");
}

async function factorText() {
  const f = await getTaskFactors();
  if (!f.length) return "(no jobs with timecards yet)";
  return f
    .map((j) => `- ${j.jobName} ${j.year ?? ""}: overall ${j.overall?.toFixed(2) ?? "?"}x; ${Object.entries(j.byTask).map(([k, v]) => `${k} ${v.toFixed(2)}x`).join(", ")}`)
    .join("\n");
}

async function setStep(jobId: number, step: string) {
  const db = await getDb();
  await db.update(schema.shopJobs).set({ takeoffStep: step }).where(eq(schema.shopJobs.id, jobId));
}

export async function runShopTakeoff(jobId: number) {
  const db = await getDb();
  try {
    const [job] = await db.select().from(schema.shopJobs).where(eq(schema.shopJobs.id, jobId));
    const files = await db.select().from(schema.shopFiles).where(eq(schema.shopFiles.jobId, jobId)).orderBy(schema.shopFiles.id);
    if (!files.length) throw new Error("Upload the plan set first.");
    const docs: Anthropic.Beta.BetaContentBlockParam[] = [];
    for (const f of files) {
      let fileId = f.anthropicFileId;
      if (!fileId) {
        await setStep(jobId, `Sending ${f.filename} to Claude`);
        fileId = await uploadToClaude(f.filename, await getFile(f.storageKey), mimeFor(f.filename));
        await db.update(schema.shopFiles).set({ anthropicFileId: fileId }).where(eq(schema.shopFiles.id, f.id));
      }
      if (mimeFor(f.filename).startsWith("image/")) docs.push({ type: "image", source: { type: "file", file_id: fileId } });
      else docs.push({ type: "document", source: { type: "file", file_id: fileId }, title: f.filename });
    }
    await setStep(jobId, "Reading the plans and counting pieces");
    const { data } = await structured({
      system: [{ type: "text", text: TAKEOFF_SYSTEM, cache_control: { type: "ephemeral" } }],
      content: [
        ...docs,
        {
          type: "text",
          text: `Job: ${job.name}${job.architect ? `, ${job.architect}` : ""}${job.location ? `, ${job.location}` : ""}.
Shop rate $${job.shopRate}/person-hour. ${job.notes ? `Notes from Sparrow: ${job.notes}` : ""}

# Production library (hours per unit from past shop estimates and jobs)
${await libraryText()}

# Actual vs estimate factors from jobs with timecards
${await factorText()}

# Material price book
${await priceText()}

Do the shop takeoff for these drawings.`,
        },
      ],
      schema: TakeoffSchema,
      effort: "high",
    });
    await setStep(jobId, "Saving the takeoff");
    // Replace any earlier Claude takeoff on this job; Sparrow's own lines are never touched.
    await clearSource(jobId, "Claude takeoff");
    let sort = 10000;
    if (data.pieces.length)
      await db.insert(schema.shopPieces).values(
        data.pieces.map((p) => ({
          jobId, section: p.section, grp: p.grp, description: p.description, pieceType: p.pieceType, qty: p.qty, unit: p.unit,
          hours: Object.fromEntries(Object.entries(p.hours).filter(([, v]) => v)), source: "Claude takeoff",
          note: `${p.confidence} confidence. ${p.sheetRef ? `${p.sheetRef}. ` : ""}${p.basis}`, sort: sort++,
        })),
      );
    if (data.extras.length)
      await db.insert(schema.shopExtras).values(
        data.extras.map((x) => ({ jobId, section: x.section, task: x.task, label: x.label, hours: x.hours, crew: x.crew || 1, note: x.note, source: "Claude takeoff", sort: sort++ })),
      );
    if (data.materials.length)
      await db.insert(schema.shopMaterials).values(
        data.materials.map((m) => ({ jobId, section: m.section, item: m.item, qty: m.qty, unit: m.unit, unitPrice: m.unitPrice, vendor: m.vendor, note: m.note, source: "Claude takeoff", sort: sort++ })),
      );
    const hasOwn = (await db.select({ id: schema.shopPieces.id }).from(schema.shopPieces).where(eq(schema.shopPieces.jobId, jobId))).length > data.pieces.length;
    await db
      .update(schema.shopJobs)
      .set({
        takeoffStatus: "done", takeoffStep: "Done", takeoffError: null, updatedAt: new Date(),
        takeoff: { summary: data.summary, sheets: data.sheets, questions: data.questions, outOfScope: data.outOfScope },
        // A job with no estimate of its own starts from the takeoff; otherwise the takeoff sits beside it for comparison.
        ...(hasOwn ? {} : { basis: "Claude takeoff" }),
      })
      .where(eq(schema.shopJobs.id, jobId));
  } catch (e) {
    console.error(`shop takeoff ${jobId} failed`, e);
    await db
      .update(schema.shopJobs)
      .set({ takeoffStatus: "error", takeoffStep: "Failed", takeoffError: e instanceof Error ? e.message : String(e) })
      .where(eq(schema.shopJobs.id, jobId));
  }
}

async function clearSource(jobId: number, source: string) {
  const db = await getDb();
  await db.delete(schema.shopPieces).where(and(eq(schema.shopPieces.jobId, jobId), eq(schema.shopPieces.source, source)));
  await db.delete(schema.shopExtras).where(and(eq(schema.shopExtras.jobId, jobId), eq(schema.shopExtras.source, source)));
  await db.delete(schema.shopMaterials).where(and(eq(schema.shopMaterials.jobId, jobId), eq(schema.shopMaterials.source, source)));
}

// ---------------- market price check ----------------

/** Dated web lookup for a material price. A backstop for supplier quotes, never a replacement. */
export async function marketCheck(item: string, unit: string): Promise<MarketResult> {
  const system = `You look up current material prices for Sparrow Woodworks' cabinet and millwork shop in Indianola, WA (Kitsap County, Puget Sound). Search for current published prices from lumber dealers and hardwood suppliers, favoring Pacific Northwest sellers (for example Edensaw, Crosscut Hardwoods, Compton Lumber, Dunn Lumber, Chinook Lumber) and national hardwood retailers when local prices are not posted. Convert to the requested unit (BF = board foot, SHT = 4x8 sheet, LF = linear foot). Report a typical price, a low and a high, and cite each source with its URL and the date shown or "undated". If you cannot find real prices, say so in the note and give your best range with low confidence. Plain sentences, no em dashes.`;
  const messages: Anthropic.Beta.BetaMessageParam[] = [
    { role: "user", content: `Current price for: ${item}. Price per ${unit}. Today is ${new Date().toISOString().slice(0, 10)}.` },
  ];
  for (let i = 0; i < 4; i++) {
    const stream = anthropic().beta.messages.stream({
      model: MODEL,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system,
      messages,
      tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 6 }],
      output_config: { effort: "medium", format: betaZodOutputFormat(MarketSchema) },
    });
    const msg = await stream.finalMessage();
    if (msg.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: msg.content as Anthropic.Beta.BetaContentBlockParam[] });
      continue;
    }
    if (msg.stop_reason === "refusal") throw new AiError("Claude declined this lookup.");
    const parsed = (msg as unknown as { parsed_output: MarketResult | null }).parsed_output;
    if (!parsed) throw new AiError("The price lookup came back without a result.");
    return parsed;
  }
  throw new AiError("The price lookup did not finish. Try again.");
}
