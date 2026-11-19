import { nanoid } from "nanoid";
import { sql } from "drizzle-orm";
import * as schema from "./schema";
import type { Company, Markups, LaborRates } from "./schema";
import osiusLines from "./seed-data/osius-lines.json";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDb = any;

export const DEFAULT_MARKUPS: Markups = {
  insurancePct: 1.5,
  overheadPct: 0,
  feePct: 15,
  contingencyPct: 0,
  taxPct: 9.2,
};

export const DEFAULT_LABOR: LaborRates = {
  Carpenter: 105,
  "Lead carpenter": 115,
  Superintendent: 125,
  "Project manager": 120,
  "Project engineer": 95,
  "Shop / cabinet maker": 105,
  Laborer: 75,
};

export const DEFAULT_COMPANY: Company = {
  name: "Sparrow Woodworks",
  tagline: "General contracting + millwork",
  location: "Indianola, Washington",
  phone: "",
  email: "",
  website: "sparrowwoodworks.com",
  logoUrl: "",
  colors: {
    ink: "#1A1A18",
    mid: "#6A6A64",
    rule: "#D8D8D2",
    tint: "#F0EFEA",
    accent: "#8A6A3B",
    accentDark: "#C79D62",
  },
  shopPhoto: "/brand/shop-derek.jpg",
  shopCaption: "Derek Crenshaw, wood shop manager, in the Sparrow shop in Indianola.",
  recognition: "AIA National, AIA Seattle and Architizer A+ awards with our architect partners, 2023 to 2025.",
  differentiators: [
    { title: "Open book, cost-plus", body: "Every line, allowance and sub quote is yours to see." },
    { title: "Our own crews since 2011", body: "Carpenters, cabinet makers and project managers on staff." },
    { title: "Just across Agate Pass", body: "No ferry and no island travel charge. Our crews and shop are close by." },
  ],
  preconDeliverables: [
    { title: "Drawing review", body: "gaps and conflicts sorted out with the design team." },
    { title: "Trade bids and budget", body: "real sub numbers turned into a construction budget." },
    { title: "Shop drawings", body: "anything built in our shop is worked out before anything is cut." },
    { title: "Long-lead ordering and schedule", body: "windows, structure and equipment ordered on time." },
    { title: "Construction agreement", body: "cost-plus, with the final budget and schedule attached." },
  ],
  defaultExclusions: [
    "Plumbing or water service unless shown",
    "Well or septic work",
    "Owner equipment, sound system and A/V gear",
    "Furniture and window treatments",
    "Geotechnical report",
    "Utility company fees",
    "Hardscape, fencing and new landscaping beyond restoration",
    "Hazardous material testing or abatement",
  ],
  team: [
    { name: "Mike Stuntz", role: "Owner & Founder", bio: "Fine woodworker turned builder. Founded Sparrow in 2011 and stays on every project.", photo: "/brand/team/team-mike.jpg" },
    { name: "Tom James", role: "Operations & Project Management", bio: "Owns the budget, contract and risk. Keeps reporting open book.", photo: "/brand/team/team-tom.jpg" },
    { name: "Riley Deering", role: "Project Manager", bio: "Former carpenter. Your day-to-day contact for schedule, subs and site.", photo: "/brand/team/team-riley.jpg" },
    { name: "Katrina Diller", role: "Project Engineer", bio: "Handles submittals, RFIs and procurement.", photo: "/brand/team/team-katrina.jpg" },
    { name: "Derek Crenshaw", role: "Wood Shop Manager", bio: "Former lead cabinet maker at McGraw Zecha. Builds the pieces you see and touch in our shop.", photo: "/brand/team/team-derek.jpg" },
    { name: "Andreas Lymberopoulos", role: "Superintendent", bio: "Background in custom cabinetry and millwork. Runs site quality, safety and inspections.", photo: "/brand/team/team-andreas.jpg" },
    { name: "Miles Koivu", role: "Superintendent", bio: "Poulsbo native with 33 years in construction, 25 of them running CW Carpentry.", photo: "/brand/team/team-miles.jpg" },
    { name: "Cody Williams", role: "Superintendent", bio: "Kitsap native. Helped grow Clark Construction from 6 people to over 100.", photo: "/brand/team/team-cody.jpg" },
    { name: "Berg Danielson", role: "Superintendent", bio: "Bainbridge born and raised. Years of local know-how, crew leadership and woodworking.", photo: "/brand/team/team-berg.jpg" },
  ],
};

export const DEFAULT_STANDARDS = `Structure: 16 CSI MasterFormat divisions (01 General Requirements through 16 Electrical). Empty divisions get a one-line reason.

Each line: CSI code, description, qty, unit, labor hrs/unit, labor rate, material $/unit, sub $/unit, note, and "Scope we priced". Name basis-of-design products where shown.

Labor (burdened cost/hr, Seattle area 2026): carpenter $105, superintendent $125, PM $120, PE $95. Sparrow self-performs framing, glulam, decking, sheathing, windows, siding, trim, millwork/cabinets and cleanup. Other trades are sub unit prices at Puget Sound rates.

Take off from dimensions; where undimensioned, scale it and say so in the note. Use sloped roof area from elevations, not footprint. Count windows and doors one by one; trim and flashing counts must match the opening count. Don't double-count footings under retaining walls that carry their own footing. Count every steel plate and connection shown in details.

Allowances: tag any line with no drawings or schedule behind it (windows without a schedule, HVAC, ventilation, lighting fixtures, low voltage, specialty floors, stormwater, permit, testing, landscape).

General Requirements usually include: superintendent (part-time hours over the schedule), PM, PE, permit allowance, survey, testing, toilet, temp power and protection, lift/telehandler (only the weeks the high work takes), scaffold, dumpsters, cleanup, small tools, on-site storage container.

Don't carry: ferry or island travel charges (Sparrow drives over Agate Pass), design/architectural/engineering fees, or a pre-con retainer.

Reference unit costs (Osius, Nov 2026), a starting point not gospel: 24 ga mech-seam standing seam $21/SF; Nichiha AWP siding $12.50/SF mat + 0.09 hr/SF; 2x6 T&G decking $9.50/SF mat; 5" SOG $13.50/SF sub; architectural concrete wall $88/SF; continuous footing $78/LF; GWB L4 $4.25/SF; paint $2.10/SF; glulam truss ~22 hrs each in shop; steel plates ~$450 ea fabricated; tension rods ~$750 ea; ductless heat pump 2 heads ~$16.5K; electrical branch wiring ~$9.50/SF.`;

const SEED_LESSONS: { scope: string; text: string }[] = [
  { scope: "General", text: "Completed jobs ran over the control estimate. In current dollars, Koivu actual direct cost was 18% over its estimate and Overstory was 17.5% over (base contract only, before $1.25M of change orders). A ROM that comes in under comparable completed jobs' current-dollar $/SF is probably light." },
  { scope: "General", text: "When drawings are thin, the Sparrow ROM tends to carry better finishes than the drawings call for (Lunawood, prefinished maple, Rogue Valley doors on Valley Road). Price what the drawings call for, then list upgrades as named alternates, and flag the finish basis as a question." },
  { scope: "General", text: "On additions, ask whether work on the existing house is in scope (reroof, heat pump, panel). On Valley Road the ROM's $44K roof and 36K BTU main-house heat pump were not in the drawings and accounted for most of the gap." },
  { scope: "General Requirements", text: "Claude's General Requirements ran about $31K higher than Sparrow's on Valley Road (938 SF): permit allowance, PE time, scaffold, telehandler, testing and extra dumpsters. Keep these lines but size them to the job; a small addition rarely needs more than a week of telehandler or 3 dumpsters." },
  { scope: "Drywall / Paint", text: "Real sub bids beat generic unit prices on finishes: Mud Monkey bid $17,000 for drywall + interior paint on Valley Road (938 SF) vs $24,473 from unit prices. Check the catalog for sub pricing before using generic GWB/paint rates." },
  { scope: "Site / Grading", text: "Include erosion control (TESC), footing drains with tightlines, and stormwater dispersion on every new footprint. Sparrow ROMs have missed these before; they are real costs on Kitsap and Bainbridge sites." },
  { scope: "Plumbing", text: "Swift bid $9,100 for plumbing on the Valley Road addition (one bath). Use as a scale check for small additions." },
  { scope: "Electrical", text: "Bird Electric bid $13,500 on the Valley Road addition (938 SF) on the existing service. Call out a subpanel or service upgrade separately as an allowance." },
  { scope: "Concrete", text: "JB Concrete bid $28,000 for the Valley Road addition foundation (938 SF, board-formed wall). Unit prices of $78/LF footing and $13.50/SF SOG land close to real bids." },
];

const HISTORICAL = [
  { name: "Koivu Residence", client: "Koivu", architect: "Scott Shelton (drafter)", city: "Indianola", finishLevel: "mid-high", totalSf: 1344, conditionedSf: 1344, status: "complete", directCostOverride: 519758.16, contractTotalOverride: 652712.3, actualCost: 811685.02, designStage: "Control estimate 2023-09", outcomeNotes: "Built fall 2023 to early 2025. Actual billed $811,685 to 3-25-25 (direct $646,349). Excludes foundation, electrical, demo, design, permits (by owner/others). 15% fee, 9.2% tax." },
  { name: "Overstory House", client: "Overstory", architect: "Wittman Estes", city: "Nordland (Marrowstone Is.)", finishLevel: "high", totalSf: 2485, conditionedSf: 2485, status: "complete", directCostOverride: 2978925.09, contractTotalOverride: 3737508.36, actualCost: 4612629.95, designStage: "Control estimate v2023.06.02", outcomeNotes: "Base contract billed $4,612,630 to 11-5-25, plus change orders $1,573,739 (incl. cabin remodel C#166 $511K and garage C#106 $127K). 15% fee, 9.1% Jefferson Co. tax." },
  { name: "Forge and Make TI", client: "Forge and Make", architect: "Balance Architects PLLC", city: "Poulsbo", finishLevel: "mid-high", totalSf: 1032, conditionedSf: 1032, status: "proposal_sent", directCostOverride: 255050.25, contractTotalOverride: 325394, designStage: "Claude takeoff 2026-11-16", outcomeNotes: "Commercial TI, craft studio. 1.5% ins/B&O + 15% fee, 9.3% Poulsbo tax. MEP all allowance (design-build)." },
  { name: "Valley Road Addition", client: "Tom Kuniholm", architect: "Tom Kuniholm Architects", structural: "Dayle B. Houk & Company", address: "9766 NE Valley Rd", city: "Bainbridge Island", finishLevel: "mid", totalSf: 938, conditionedSf: 602, status: "proposal_sent", directCostOverride: 525934.5, contractTotalOverride: 670375.57, designStage: "Permit set, Rev. 01", outcomeNotes: "Claude takeoff $670,376 vs Sparrow ROM $653,156 (20% fee). See estimates/valley-road-addition-estimate-comparison.md." },
  { name: "DeWitt Residence", client: "Eric DeWitt", architect: "SHED Architecture & Design", city: "Port Angeles", finishLevel: "high", totalSf: 2368, conditionedSf: 1810, status: "proposal_sent", contractTotalOverride: 2938235, designStage: "Preliminary pricing set", outcomeNotes: "1,810 heated SF + 558 SF garage. 8.6% tax." },
  { name: "Rayson Remodel / Addition", client: "Steven & Emily Rayson", architect: "Johnson Squared", structural: "Edward Jonson & Associates", city: "Hansville", finishLevel: "high", status: "proposal_sent", contractTotalOverride: 3787159, designStage: "Permit set, rev 1", outcomeNotes: "Two-story addition plus remodel of the Rastra-block house. Main house remodel about $1,402,520." },
];

function tradeFor(div: string): string {
  const map: Record<string, string> = {
    "01": "Sparrow", "02": "Site / Grading", "03": "Concrete", "04": "Masonry", "05": "Steel / Metals",
    "06": "Sparrow", "07": "Envelope", "08": "Doors / Windows", "09": "Finishes", "10": "Specialties",
    "15": "Mechanical", "16": "Electrical",
  };
  return map[div] ?? "Sparrow";
}

export async function seedIfEmpty(db: AnyDb) {
  const existing = await db.select({ id: schema.settings.id }).from(schema.settings).limit(1);
  if (existing.length) return;

  await db.insert(schema.settings).values({
    id: 1,
    company: DEFAULT_COMPANY,
    markups: DEFAULT_MARKUPS,
    laborRates: DEFAULT_LABOR,
    estimatingStandards: DEFAULT_STANDARDS,
  }).onConflictDoNothing();

  await db.insert(schema.lessons).values(SEED_LESSONS.map((l) => ({ ...l, status: "active", source: "seed" })));

  for (const h of HISTORICAL) {
    await db.insert(schema.projects).values({
      ...h,
      markups: { ...DEFAULT_MARKUPS, taxPct: h.city === "Port Angeles" ? 8.6 : h.city === "Poulsbo" ? 9.3 : h.city.startsWith("Nordland") ? 9.1 : 9.2 },
      shareToken: nanoid(16),
    });
  }

  // Osius: full line-item estimate (builder cost $727,536, Rev C, Nov 13 2026)
  const [osius] = await db.insert(schema.projects).values({
    name: "Osius Accessory Building",
    client: "Osius",
    architect: "Coates Design",
    structural: "Artifex Engineering",
    city: "Bainbridge Island",
    address: "North Tolo Road",
    designStage: "Pricing set, Nov 5, 2026",
    finishLevel: "mid-high",
    totalSf: 990,
    conditionedSf: 990,
    status: "proposal_sent",
    revision: "C",
    markups: DEFAULT_MARKUPS,
    shareToken: nanoid(16),
    proposal: {
      lede: "A training barn and dance studio under exposed glulam trusses, on North Tolo Road.",
      notePara1: "Thanks for the chance to price this one. It's a small building with a lot going on. Sixteen-foot walls, a full run of clerestory glass and nine exposed glulam trusses that will be the whole show once you're inside.",
      projectDescription: "A 990 SF single-story studio on the old sport court site. Sixteen-foot walls, clerestory glass and nine exposed glulam trusses under a standing seam roof. Inside, a stained concrete floor, a sprung dance floor, a mirror wall and barres.",
      signatureElement: "the glulam trusses",
      shopItems: "the trusses",
      pricingNotes: [
        "Preliminary pricing from the Coates pricing set (Nov 5, 2026) and Artifex structural sheets.",
        "No window schedule, specs or MEP drawings yet, so those lines are allowances. No contingency is carried.",
        "Open book. You see the real numbers behind every line.",
      ],
      valueOptions: [
        { title: "Substitute lap fiber cement for Nichiha AWP", description: "Hardie lap or similar in place of the Vintagewood panel system. Same rainscreen, simpler panel.", directDelta: -11611 },
        { title: "Delete the sprung dance floor", description: "Stain and seal the full slab instead. Owner adds portable dance flooring later if wanted.", directDelta: -8944 },
        { title: "Value-tier clad windows", description: "Sierra Pacific or Loewen in place of Marvin-level units. Similar look, about 12% less on glazing.", directDelta: -9650 },
        { title: "Standard-finish retaining walls", description: "Plain formwork with a sacked finish in place of architectural board-smooth concrete.", directDelta: -5884 },
      ],
      milestones: [
        { week: 0, title: "Break ground" }, { week: 4, title: "Foundation complete" }, { week: 10, title: "Trusses set" },
        { week: 14, title: "Dry-in" }, { week: 26, title: "Closeout" },
      ],
      scheduleNote: "Based on similar Sparrow projects. We'll firm this up once windows and glulam lead times are confirmed.",
      heroImage: "/brand/projects/osius/section-perspective.jpg", heroCaption: "Section perspective, sheet A4.01. Drawing by Coates Design.", elevationImage: "/brand/projects/osius/north-elevation.jpg", elevationCaption: "North elevation, sheet A3.01.",
      exclusions: DEFAULT_COMPANY.defaultExclusions,
    },
    analysis: {
      summary: "990 SF single-story training barn and dance studio with 16' walls, clerestory glazing, nine exposed glulam trusses and a standing seam roof.",
      buildingType: "Accessory building (studio)", stories: 1, totalSf: 990, conditionedSf: 990, scheduleWeeks: 26,
      sheets: [], quantities: [], systems: [],
      conflicts: [
        { issue: "Cover sheet lists 3,064 SF over two stories; the building drawn is 990 SF on one floor.", impact: "Area basis", assumption: "Priced the 990 SF building drawn." },
        { issue: "Slab is 5\" on architectural sheets and 4\" on structural.", impact: "Concrete", assumption: "Priced 5\"." },
        { issue: "Tension rods are stainless on architectural sheets and A36 on structural.", impact: "Metals", assumption: "Priced A36." },
        { issue: "Roof insulation is about R-30, which may fall short of energy code for roofs.", impact: "Envelope", assumption: "Priced as drawn; flagged." },
        { issue: "The building sits inside the 100' well head radius on the site plan.", impact: "Site / permit", assumption: "Flagged for COBI review." },
      ],
      missingInfo: ["Window schedule", "Specifications", "MEP drawings"],
    },
  }).returning();

  type OL = { division: string; csiCode: string; description: string; scope: string; note: string; allowance: boolean; qty: number; unit: string; unitPrice: number };
  await db.insert(schema.estimateLines).values(
    (osiusLines as OL[]).map((l, i) => ({
      projectId: osius.id,
      division: l.division,
      csiCode: l.csiCode,
      description: l.description,
      scope: l.scope,
      qty: l.qty,
      unit: l.unit,
      subUnit: l.unitPrice,
      isAllowance: l.allowance,
      trade: tradeFor(l.division),
      note: l.note,
      source: "import",
      sort: i,
    })),
  );

  // Catalog: Osius unit costs as reference rates (installed unit cost, Nov 2026)
  await db.insert(schema.catalog).values(
    (osiusLines as OL[])
      .filter((l) => l.unit !== "LS" && l.unit !== "MO" && l.unit !== "WK" && l.unit !== "HR" && l.unit !== "DAY")
      .map((l) => ({
        trade: tradeFor(l.division) === "Sparrow" ? "Carpentry (Sparrow)" : tradeFor(l.division),
        item: l.description,
        unit: l.unit,
        unitPrice: l.unitPrice,
        priceType: "installed",
        source: "estimate",
        vendor: "Osius estimate",
        quoteDate: "2026-11",
        notes: [l.csiCode, l.note].filter(Boolean).join(" · "),
        projectId: osius.id,
      })),
  );
  await db.execute(sql`select 1`);
}
