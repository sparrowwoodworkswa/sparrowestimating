import { z } from "zod";

export const AnalysisSchema = z.object({
  projectName: z.string().describe("Project name as shown on the title block"),
  client: z.string().describe("Owner / client name if shown, else empty"),
  architect: z.string(),
  structural: z.string().describe("Structural engineer, else empty"),
  address: z.string(),
  city: z.string(),
  designStage: z.string().describe("e.g. Permit set Rev 1, Pricing set Nov 5 2026, SD, DD"),
  summary: z.string().describe("Two plain sentences describing the building and what's special about it"),
  buildingType: z.string(),
  stories: z.number().nullable(),
  totalSf: z.number().nullable().describe("Gross building area in SF including garage/unconditioned"),
  conditionedSf: z.number().nullable(),
  scheduleWeeks: z.number().nullable().describe("Estimated construction duration in weeks from break ground to closeout"),
  sheets: z.array(z.object({ number: z.string(), title: z.string() })),
  quantities: z
    .array(z.object({ name: z.string(), value: z.number(), unit: z.string(), basis: z.string().describe("Sheet and how it was measured or scaled") }))
    .describe("Shared takeoff quantities every trade will use: footprint, slab, footing LF, wall area by type, sloped roof area, roof pitch, window and door counts by type, fixture counts, plumbing fixtures, rooms, decks, site disturbance area, driveway, etc."),
  systems: z.array(z.object({ system: z.string(), description: z.string() })).describe("Structure, foundation, envelope, roofing, windows, siding, HVAC, plumbing, electrical, fire, site/utilities as drawn or specified"),
  conflicts: z.array(z.object({ issue: z.string(), impact: z.string(), assumption: z.string() })).describe("Drawing conflicts, code concerns, cover sheet data that doesn't match the drawn building, missing info that affects price"),
  missingInfo: z.array(z.string()).describe("Drawings or schedules not in the set that force allowances (window schedule, specs, MEP, civil, geotech)"),
  finishLevelGuess: z.enum(["builder", "mid", "mid-high", "high"]),
});
export type AnalysisOut = z.infer<typeof AnalysisSchema>;

export const LaborRole = z.enum([
  "none",
  "Carpenter",
  "Lead carpenter",
  "Superintendent",
  "Project manager",
  "Project engineer",
  "Shop / cabinet maker",
  "Laborer",
]);

export const LineSchema = z.object({
  division: z.string().describe("Two-digit CSI division 01-16"),
  csiCode: z.string().describe("e.g. 03 30 00"),
  description: z.string(),
  scope: z.string().describe("Scope we priced: what is included, in one or two plain sentences"),
  qty: z.number(),
  unit: z.string().describe("SF, LF, CY, EA, LS, HR, WK, MO, SQ, TON, etc."),
  laborRole: LaborRole.describe("Sparrow self-performed labor role, or none for sub/material-only lines"),
  laborHoursPerUnit: z.number(),
  materialUnit: z.number().describe("Material $ per unit Sparrow buys (0 for sub lines)"),
  subUnit: z.number().describe("Subcontractor installed $ per unit (0 for self-performed lines)"),
  isAllowance: z.boolean(),
  trade: z.string().describe("Sparrow for self-performed, else the sub trade name"),
  note: z.string().describe("Takeoff basis, sheet refs, assumptions. Say 'scaled' when undimensioned"),
  pricingBasis: z.string().describe("Where the unit price came from: catalog item + vendor, past project, or 'market estimate'"),
});
export type LineOut = z.infer<typeof LineSchema>;

export const TradePackageSchema = z.object({
  trade: z.string(),
  scopeOfWork: z.string().describe("Scope of work a sub can bid from: plain paragraphs, organized by phase"),
  inclusions: z.array(z.string()),
  exclusions: z.array(z.string()),
  materials: z
    .array(z.object({ item: z.string(), spec: z.string(), qty: z.number(), unit: z.string(), notes: z.string() }))
    .describe("Full material list with quantities so the sub or supplier can price it"),
  questions: z.array(z.string()).describe("RFIs / clarifications the sub will need"),
  sheetRefs: z.string().describe("Sheets the sub should look at"),
});

export const PackageResultSchema = z.object({
  lines: z.array(LineSchema),
  tradePackages: z.array(TradePackageSchema),
  emptyDivisions: z.array(z.object({ division: z.string(), reason: z.string() })),
});
export type PackageResult = z.infer<typeof PackageResultSchema>;

export const ProposalSchema = z.object({
  lede: z.string().describe("One line under the project name. Plain, specific, no hype"),
  notePara1: z.string().describe("First paragraph of the note from Mike: thanks, and what's special about this building. 2-3 short sentences"),
  projectDescription: z.string().describe("Two sentences describing the project as drawn"),
  signatureElement: z.string().describe("The signature element Sparrow's crew/shop will build, e.g. 'the glulam trusses'"),
  shopItems: z.string().describe("What Derek's shop builds on this job, e.g. 'the cabinets and stair'"),
  pricingNotes: z.array(z.string()).describe("Exactly 3 short pricing notes"),
  valueOptions: z
    .array(z.object({ title: z.string(), description: z.string(), directDelta: z.number().describe("Change in DIRECT cost, negative for a deduct") }))
    .describe("4 scope deducts that don't touch the signature design"),
  salutation: z.string().describe("Greeting for the welcome letter using the client's names as given, e.g. 'Dear Mike and Megan,'. Use 'Hello,' if no client name is known"),
  benefits: z
    .array(z.object({ title: z.string(), body: z.string() }))
    .describe("4 owner benefits of Sparrow's approach on THIS project (constructability, risks found early, value that keeps the design, open book). One sentence each, may name the architect"),
  milestones: z
    .array(z.object({ week: z.number(), title: z.string(), detail: z.string().describe("One short sentence: what is complete by then on this project") }))
    .describe("5-6 milestones from break ground to closeout, the last at the schedule duration"),
  scheduleNote: z.string(),
});

export const LearnSchema = z.object({
  summary: z.string().describe("What this project taught us, 3-5 plain sentences"),
  lessons: z.array(z.object({ scope: z.string().describe("Trade or division name, or General"), text: z.string() })),
  catalogUpdates: z.array(
    z.object({ trade: z.string(), item: z.string(), unit: z.string(), unitPrice: z.number(), vendor: z.string(), notes: z.string() }),
  ),
  retireLessonIds: z.array(z.number()).describe("IDs of existing lessons this evidence shows are wrong"),
});
