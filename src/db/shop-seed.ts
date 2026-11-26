// Seeds the shop workspace with the shop's own ROMs, transcribed from Bruciato_ROM.xlsx (October 2026).
// The workbook has three tabs: Restaurant Solid Wood and Restaurant Ceiling are Bruciato; the "Bar ROM" tab
// matches the Civility pricing set (Eerkes Architects, 2026.10.09), so it is seeded as its own job.
// Rows the original sheet left out of its totals are seeded with include = false and a note, so the
// job totals match the sheet exactly: Bruciato $350,447 and Civility $266,515.
import { sql } from "drizzle-orm";
import * as schema from "./schema";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDb = any;

type H = [number, number, number, number, number, number, number, number, number?, number?];
const KEYS = ["milling", "glueup", "sizing", "boring", "shelves", "banding", "sanding", "hardware", "finish", "install"];
const hours = (h: H) => Object.fromEntries(KEYS.map((k, i) => [k, h[i] ?? 0]).filter(([, v]) => v));

type P = { grp: string; description: string; pieceType: string; qty: number; unit: string; h: H; include?: boolean; note?: string };
type X = { task: string; label: string; who?: string; hours?: number; crew?: number; lump?: number; note?: string };
type M = { item: string; qty: number; unit: string; unitPrice: number; vendor?: string; include?: boolean; note?: string; category?: string };

const SOLID_WOOD: P[] = [
  { grp: "Benches", description: "Single table booth bench", pieceType: "Booth bench, single table", qty: 14, unit: "EA", h: [20, 56, 4, 0, 0, 0, 24, 20] },
  { grp: "Benches", description: "Long table bench", pieceType: "Bench, long table", qty: 4, unit: "EA", h: [4, 4, 1, 0, 0, 0, 3, 8] },
  { grp: "Benches", description: "3, 4 and 6 table benches (1 each)", pieceType: "Bench, multi-table", qty: 3, unit: "EA", h: [16, 36, 2.5, 0, 0, 0, 18, 26] },
  { grp: "Benches", description: "Entry bench and 3 table seat only (1 each)", pieceType: "Bench, entry / seat only", qty: 2, unit: "EA", h: [5, 3, 0.5, 0, 0, 0, 2.25, 12] },
  { grp: "Benches", description: "Banquet seat (cabinet box style)", pieceType: "Banquette seat, cabinet box", qty: 1, unit: "EA", h: [16, 40, 0, 0, 0, 4, 12, 0] },
  { grp: "Tables", description: "Booth table", pieceType: "Table, booth", qty: 7, unit: "EA", h: [8.25, 7, 1.75, 0, 0, 0, 5.25, 3.5] },
  { grp: "Tables", description: "2 top table", pieceType: "Table, 2-top", qty: 12, unit: "EA", h: [6.25, 12, 3.25, 0, 0, 0, 9.75, 6] },
  { grp: "Tables", description: "4 top table", pieceType: "Table, 4-top", qty: 9, unit: "EA", h: [4.75, 9, 2.25, 0, 0, 0, 6.75, 4.5] },
  { grp: "Tables", description: "Banquet table and 4 bench picnic table (1 each)", pieceType: "Table, banquet / picnic", qty: 2, unit: "EA", h: [2, 4.5, 3, 0, 0, 0, 7, 3] },
  { grp: "Screens", description: "3x6 fir screens: 8 full height (dining east), 26 full height and 11 medium (screen wall)", pieceType: "Screen column, 3x6 fir", qty: 45, unit: "EA", h: [15, 0, 3.75, 0, 0, 0, 19.5, 45] },
  { grp: "Columns", description: "4x4 fir columns: 4 entry, 1 dining east, 1 screen wall, 6 medium private dining, 14 tall dining south, 2 lounge", pieceType: "Column, 4x4 fir", qty: 28, unit: "EA", h: [11, 0, 2.5, 0, 0, 0, 13, 55] },
  { grp: "Wall panels (T&G)", description: "Full height T&G: 2 @ 7' private dining, 2 @ 5' and 1 @ 3' entry; half height 2 @ 36-1/2\" screen wall", pieceType: "Wall panel, 1x8 T&G", qty: 33, unit: "LF", h: [0, 0, 0, 0, 0, 0, 0, 0], note: "0 hours in the original sheet" },
  { grp: "Wall panels (T&G)", description: "Half height T&G (2 @ 14', 1 @ 5', 1 @ 13', 2 @ 5', 1 @ 3') with booth bench finished ends (4 half, 5 full)", pieceType: "Half wall T&G + booth FE", qty: 1, unit: "LS", h: [0, 60, 25, 0, 0, 0, 30, 0] },
  { grp: "Wall panels (T&G)", description: "Half height cabinet finished ends: pizza kitchen 11-1/2' and 4-1/2', bar 42', 12' and 2-1/2'", pieceType: "Half height panel / cabinet FE", qty: 72.5, unit: "LF", h: [0, 18, 6, 0, 0, 0, 7, 0] },
  { grp: "General", description: "General sizing", pieceType: "General shop time", qty: 1, unit: "LS", h: [0, 0, 10, 0, 0, 0, 0, 0] },
];
const SOLID_WOOD_X: X[] = [
  { task: "estimating", label: "Estimating and ordering", who: "Derek", hours: 120 },
  { task: "handling", label: "Material handling", who: "Derek / Nate", hours: 60 },
  { task: "packaging", label: "Packaging", who: "Derek and Nate", hours: 60, crew: 2 },
  { task: "transport", label: "Transport", who: "Derek / Nate", hours: 0, crew: 2 },
  { task: "drawings", label: "Drawings", who: "Melissa", lump: 2000 },
  { task: "mockup", label: "Mock up and samples", who: "Derek / Mike", hours: 35 },
  { task: "finish", label: "Finish (lump)", who: "?", lump: 40000, note: "Lump sum in the sheet. Summary note says no finish included; confirm." },
];
const SOLID_WOOD_M: M[] = [
  { item: "Fir lumber package: 2x8x8 (301), 3x6x8 (11), 3x6x16 (34), 4x4x8 (22), 4x4x16 (6), 1x8x8 T&G (332)", qty: 1, unit: "LS", unitPrice: 20000, vendor: "AWI / Chinook", category: "Softwood", note: "One allowance for all the sticks listed" },
  { item: "3/4\" raw fir plywood", qty: 13, unit: "SHT", unitPrice: 190, vendor: "AWI", category: "Sheet goods" },
  { item: "Hardware: 146 heavy duty support brackets", qty: 1, unit: "LS", unitPrice: 10300, vendor: "EB Bradley / Sparrow", category: "Hardware", note: "ironsupports.com brackets" },
  { item: "Glue, screws, paper, sundries", qty: 1, unit: "LS", unitPrice: 2000, vendor: "Sparrow", category: "Sundries" },
];

const CEILING: P[] = [
  { grp: "Box beams", description: "Box beams: 14 @ 17', 14 @ 5', 1 @ 40', 1 @ 35'", pieceType: "Box beam, fir", qty: 383, unit: "LF", h: [85, 90, 0, 0, 0, 0, 100, 0] },
  { grp: "Ceiling T&G", description: "1x5 T&G ceiling: 40x22, 35x17, 21x24, 16x26, 14x20, 15x16, 16x9, 10x5", pieceType: "Ceiling T&G, 1x5 fir", qty: 3109, unit: "SF", h: [0, 0, 0, 0, 0, 0, 0, 0], note: "0 hours in the original sheet" },
];
const CEILING_X: X[] = [
  { task: "estimating", label: "Estimating and ordering", who: "Derek", hours: 20 },
  { task: "handling", label: "Material handling", who: "Derek / Nate", hours: 40 },
  { task: "packaging", label: "Packaging", who: "Derek and Nate", hours: 40, crew: 2 },
  { task: "transport", label: "Transport", who: "Derek / Nate", hours: 0, crew: 2 },
];
const CEILING_M: M[] = [
  { item: "4/4 fir (125 @ 10' x 12\")", qty: 1250, unit: "BF", unitPrice: 8, vendor: "Chinook / Hardwoods", category: "Softwood" },
  { item: "1x5 T&G fir", qty: 8795, unit: "LF", unitPrice: 2.58, vendor: "AWI / Chinook", category: "Softwood" },
  { item: "Glue, screws, paper, sundries", qty: 1, unit: "LS", unitPrice: 750, vendor: "Sparrow", category: "Sundries" },
];

const NOT_IN_TOTAL = "Not in the original sheet total (entered outside the summed columns). Turn on to include.";
const BAR: P[] = [
  { grp: "Tables", description: "2-top tables", pieceType: "Table, 2-top", qty: 9, unit: "EA", h: [4.75, 9, 2.25, 0, 0, 0, 6.75, 4.5], include: false, note: NOT_IN_TOTAL },
  { grp: "Tables", description: "4-top tables", pieceType: "Table, 4-top", qty: 3, unit: "EA", h: [3.25, 6, 1.5, 0, 0, 0, 5, 3], include: false, note: NOT_IN_TOTAL },
  { grp: "Tables", description: "2/3-top round tables", pieceType: "Table, round 2/3-top", qty: 9, unit: "EA", h: [4.75, 9, 2.25, 0, 0, 0, 6.75, 4.5], include: false, note: NOT_IN_TOTAL },
  { grp: "Tables", description: "Large round table", pieceType: "Table, large round", qty: 1, unit: "EA", h: [3.25, 6, 1.5, 0, 0, 0, 5, 3], include: false, note: NOT_IN_TOTAL },
  { grp: "Cabinetry", description: "Large display shelving with integrated strip lights and speakers (6 cabinets, 2 FE panels)", pieceType: "Display shelving with LED", qty: 1, unit: "EA", h: [6, 18, 0, 0, 0, 2, 10.5, 12] },
  { grp: "Cabinetry", description: "Medium display shelving with integrated strip lights and speakers (4 cabinets, 1 FE panel)", pieceType: "Display shelving with LED", qty: 1, unit: "EA", h: [4, 12, 0, 0, 0, 1.5, 7, 8] },
  { grp: "Cabinetry", description: "2 door base cabinet", pieceType: "Base cabinet, 2 door", qty: 1, unit: "EA", h: [1, 0.5, 0.25, 0.25, 0, 0.25, 1, 0.5] },
  { grp: "Cabinetry", description: "2 door floating cabinets", pieceType: "Floating cabinet, 2 door", qty: 3, unit: "EA", h: [2, 3, 0.75, 0.75, 0, 0.75, 3, 3] },
  { grp: "Cabinetry", description: "Replacement cabinet doors", pieceType: "Replacement door", qty: 14, unit: "EA", h: [3, 0, 3.5, 3.5, 0, 0, 5, 0] },
  { grp: "Cabinetry", description: "L-shaped banquette", pieceType: "Banquette, L-shaped", qty: 1, unit: "EA", h: [32, 80, 0, 0, 0, 8, 24, 0] },
  { grp: "Cabinetry", description: "Curved banquette with strip lighting, 2 places", pieceType: "Banquette, curved with LED", qty: 50, unit: "LF", h: [64, 160, 0, 0, 0, 16, 48, 0] },
  { grp: "Columns / screens", description: "4x4 fir columns, medium height", pieceType: "Column, 4x4 fir", qty: 14, unit: "EA", h: [5.5, 0, 1.25, 0, 0, 0, 6.5, 23], note: "Not found on the Civility pricing set (A2.00, A5.00-A5.03). Verify." },
  { grp: "Columns / screens", description: "3x6 fir screen columns, full height", pieceType: "Screen column, 3x6 fir", qty: 90, unit: "EA", h: [30, 0, 7.5, 0, 0, 0, 39, 90], note: "Not found on the Civility pricing set (A2.00, A5.00-A5.03). Verify." },
  { grp: "Panels", description: "Perforated oak acoustic panels", pieceType: "Acoustic panel, perforated oak", qty: 11, unit: "EA", h: [30, 22, 0, 30, 0, 0, 50, 0] },
  { grp: "Panels", description: "1\" half-round oak acoustic paneling (420 sticks of oak)", pieceType: "Half-round oak paneling", qty: 35, unit: "LF", h: [40, 36, 10, 0, 0, 0, 50, 0] },
  { grp: "Panels", description: "Rift white oak wall panels", pieceType: "Wall panel, rift white oak veneer", qty: 22, unit: "EA", h: [10, 0, 0, 0, 0, 3, 11, 4] },
];
const BAR_X: X[] = [
  { task: "estimating", label: "Estimating and ordering", who: "Derek", hours: 20 },
  { task: "handling", label: "Material handling", who: "Derek / Nate", hours: 40 },
  { task: "packaging", label: "Packaging", who: "Derek and Nate", hours: 40, crew: 2 },
  { task: "transport", label: "Transport", hours: 0, crew: 2 },
  { task: "drawings", label: "Drawings", who: "Melissa", lump: 2000 },
];
const BAR_M: M[] = [
  { item: "6/4 solid rift white oak", qty: 765, unit: "BF", unitPrice: 20, category: "Hardwood" },
  { item: "8/4 solid rift white oak", qty: 616, unit: "BF", unitPrice: 24, category: "Hardwood" },
  { item: "2x8x4 fir", qty: 1600, unit: "BF", unitPrice: 2.5, category: "Softwood", include: false, note: NOT_IN_TOTAL },
  { item: "3x6 fir", qty: 1620, unit: "BF", unitPrice: 3, category: "Softwood" },
  { item: "4x4 fir", qty: 224, unit: "BF", unitPrice: 3, category: "Softwood" },
  { item: "3/4\" prefinished maple plywood", qty: 4, unit: "SHT", unitPrice: 120, category: "Sheet goods" },
  { item: "1/2\" prefinished maple plywood", qty: 2, unit: "SHT", unitPrice: 100, category: "Sheet goods" },
  { item: "3/4\" rift white oak plywood", qty: 45, unit: "SHT", unitPrice: 250, category: "Sheet goods" },
  { item: "1/2\" rift white oak plywood", qty: 10, unit: "SHT", unitPrice: 215, category: "Sheet goods" },
  { item: "1/2\" bendable plywood", qty: 20, unit: "SHT", unitPrice: 250, category: "Sheet goods" },
  { item: "Hardware: LED and other hardware allowance", qty: 1, unit: "LS", unitPrice: 5500, vendor: "EB Bradley / Sparrow", category: "Hardware" },
  { item: "Glue, screws, paper, sundries", qty: 1, unit: "LS", unitPrice: 1250, vendor: "Sparrow", category: "Sundries" },
];

async function addJob(
  db: AnyDb,
  job: Partial<typeof schema.shopJobs.$inferInsert> & { name: string },
  sections: { name: string; code: string; pieces: P[]; extras: X[]; materials: M[] }[],
) {
  const [j] = await db
    .insert(schema.shopJobs)
    .values({ ...job, sectionCodes: Object.fromEntries(sections.map((s) => [s.name, s.code])) })
    .returning();
  let sort = 0;
  for (const s of sections) {
    if (s.pieces.length)
      await db.insert(schema.shopPieces).values(
        s.pieces.map((p) => ({
          jobId: j.id, section: s.name, grp: p.grp, description: p.description, pieceType: p.pieceType, qty: p.qty, unit: p.unit,
          hours: hours(p.h), include: p.include ?? true, note: p.note ?? "", sort: sort++,
        })),
      );
    if (s.extras.length)
      await db.insert(schema.shopExtras).values(
        s.extras.map((x) => ({
          jobId: j.id, section: s.name, task: x.task, label: x.label, who: x.who ?? "", hours: x.hours ?? 0, crew: x.crew ?? 1,
          lump: x.lump ?? null, note: x.note ?? "", sort: sort++,
        })),
      );
    if (s.materials.length) {
      await db.insert(schema.shopMaterials).values(
        s.materials.map((m) => ({
          jobId: j.id, section: s.name, item: m.item, qty: m.qty, unit: m.unit, unitPrice: m.unitPrice, vendor: m.vendor ?? "",
          include: m.include ?? true, note: m.note ?? "", sort: sort++,
        })),
      );
      // Unit-priced materials go into the price book as Sparrow estimate prices.
      const priced = s.materials.filter((m) => m.unit !== "LS");
      if (priced.length)
        await db.insert(schema.shopPrices).values(
          priced.map((m) => ({
            item: m.item, category: m.category ?? "Other", unit: m.unit, unitPrice: m.unitPrice, vendor: m.vendor ?? "",
            quoteDate: "2026-10", source: "Sparrow estimate", jobId: j.id, notes: `${job.name} ROM`,
          })),
        );
    }
  }
}

export async function seedShopIfEmpty(db: AnyDb) {
  const [{ n }] = (await db.select({ n: sql<number>`count(*)::int` }).from(schema.shopJobs)) as { n: number }[];
  if (n > 0) return;
  await addJob(
    db,
    {
      name: "Bruciato", architect: "Eerkes Architects", location: "Restaurant fit-out", status: "estimating", costYear: 2026,
      notes: "Shop ROM from Bruciato_ROM.xlsx. Pricing set 2026.09.22. No install or finish included (except the $40k finish lump on Solid wood).",
    },
    [
      { name: "Solid wood", code: "605.6", pieces: SOLID_WOOD, extras: SOLID_WOOD_X, materials: SOLID_WOOD_M },
      { name: "Ceiling", code: "605.7", pieces: CEILING, extras: CEILING_X, materials: CEILING_M },
    ],
  );
  await addJob(
    db,
    {
      name: "Civility", architect: "Eerkes Architects", location: "Restaurant fit-out", status: "estimating", costYear: 2026, taxPct: 0.092,
      notes: "Shop ROM from the \"Bar ROM\" tab of Bruciato_ROM.xlsx; its lines match the Civility pricing set 2026.10.09. No install or finish included.",
    },
    [{ name: "Bar and lounge", code: "1200.6", pieces: BAR, extras: BAR_X, materials: BAR_M }],
  );
}
