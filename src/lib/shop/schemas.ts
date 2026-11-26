// Structured-output schemas for the shop takeoff and market check (no server-only imports, so scripts can check them).
import { z } from "zod";
import { PIECE_TASKS, JOB_TASKS } from "./model";

const Hours = z.object(Object.fromEntries(PIECE_TASKS.map((t) => [t.key, z.number().describe(`Crew-hours for ${t.label} for the whole row`)])) as Record<
  (typeof PIECE_TASKS)[number]["key"],
  z.ZodNumber
>);

export const TakeoffSchema = z.object({
  summary: z.string().describe("Two to four plain sentences: what the shop scope is and what drives the hours."),
  sheets: z.array(z.string()).describe("Sheets reviewed for shop scope, e.g. 'A5.00 Interior elevations'"),
  pieces: z.array(
    z.object({
      section: z.string().describe("Area or package, e.g. 'Dining room', 'Bar', 'Ceiling'"),
      grp: z.string().describe("Group within the section: Benches, Tables, Cabinetry, Panels, Columns / screens, Ceiling"),
      description: z.string().describe("What it is, with counts and sizes, e.g. '8 full height 3x6 fir screens at dining east'"),
      pieceType: z.string().describe("Library piece type. Reuse an existing library name exactly when it fits."),
      qty: z.number(),
      unit: z.enum(["EA", "LF", "SF", "LS", "SET"]),
      hours: Hours,
      basis: z.string().describe("Where the hours came from: the library sample used (job, year, source) and any scaling"),
      sheetRef: z.string().describe("Sheet and detail references, e.g. 'A2.00; A5.01/1'"),
      confidence: z.enum(["high", "medium", "low"]),
    }),
  ),
  extras: z.array(
    z.object({
      section: z.string(),
      task: z.enum(JOB_TASKS.map((t) => t.key) as [string, ...string[]]),
      label: z.string(),
      hours: z.number().describe("Crew-hours"),
      crew: z.number().describe("People per crew-hour (packaging and transport are usually 2)"),
      note: z.string(),
    }),
  ),
  materials: z.array(
    z.object({
      section: z.string(),
      item: z.string().describe("Species, thickness and grade, e.g. '8/4 rift white oak', '3/4\" rift white oak plywood'"),
      qty: z.number(),
      unit: z.enum(["BF", "SHT", "LF", "SF", "EA", "LS", "GAL"]),
      unitPrice: z.number().describe("From the price book when there is a match, current dollars"),
      vendor: z.string(),
      note: z.string().describe("Waste factor and price source"),
    }),
  ),
  questions: z.array(z.string()).describe("RFIs and things to confirm with the architect or Mike"),
  outOfScope: z.array(z.string()).describe("Items on the drawings that are not shop scope (stone tops, tile, paint, lighting fixtures, existing to remain)"),
});

export const MarketSchema = z.object({
  item: z.string().describe("The item as priced, with species, thickness, grade and unit"),
  unit: z.string(),
  typical: z.number().describe("Typical current price per unit in USD for a Puget Sound shop buying from a lumber dealer"),
  low: z.number(),
  high: z.number(),
  sources: z.array(z.object({ title: z.string(), url: z.string(), price: z.string(), date: z.string() })),
  note: z.string().describe("One or two plain sentences: how solid these numbers are and what moves them (grade, width, quantity, region)"),
});
export type MarketResult = z.infer<typeof MarketSchema>;

