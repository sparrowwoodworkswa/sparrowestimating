import { COST_CODES, SPARROW_DIVISIONS } from "@/lib/costcodes";

/**
 * Work packages: the ROM is built in parallel, one Claude pass per package.
 * Each pass owns a set of Sparrow cost code groups (e.g. 704 = Roofing) so no line is priced twice,
 * returns estimate lines coded to Sparrow's Master Cost Code List, and, for subcontracted trades,
 * a bid-ready scope of work with a full material list.
 */
export type WorkPackage = {
  key: string;
  title: string;
  groups: number[]; // cost code groups this pass owns, e.g. 704 covers 704.1-704.9
  instructions: string;
};

export const WORK_PACKAGES: WorkPackage[] = [
  {
    key: "gc",
    title: "General conditions and project management",
    groups: [102, 103, 104, 107, 108, 109, 110, 111, 112, 113],
    instructions: `This is how Sparrow runs the job as a cost-plus GC, so be thorough:
- 113.1 Sparrow supervision & project management: superintendent hours over the full schedule (part-time on small jobs, ~12-20 hrs/wk; full-time on large homes), PM hours and PE hours for submittals, RFIs and procurement. Sub coordination and inspections sit inside these hours; say so in the scope.
- 104.x permits (building, grading, septic, right of way as applicable) as allowances for the jurisdiction. 102.x survey, energy rater/blower door, special inspection. 103.x testing only if an existing structure is involved.
- 108.x temp toilet, protection, safety, temp stairs/doors. 110.x cranes & lifts (only the weeks high work takes, plus any crane day to set trusses or beams), small tools, equipment. 111.x temp utilities. 112.x dumpsters sized to the job, weekly and final cleanup. 113.6 mobilization, 113.4 close-out, 113.8 warranty if Sparrow carries one.
- Do not carry 100.x design fees or 101.x engineering; those are by the owner. Do not carry 107.x insurance; the markup covers it.
No trade packages for this pass (return an empty tradePackages list).`,
  },
  {
    key: "site",
    title: "Site work, grading, excavation, utilities and drainage",
    groups: [200, 201, 202, 203, 204, 205, 206, 703],
    instructions: `Price demo and tree removal, clearing, traction/erosion control (204.5), house and site excavation (CY) with haul or import, structural fill and backfill, trenching, driveway, utilities (water or well, sewer or septic, propane), area drains and stormwater dispersion (allowance unless designed), restoration and plantings. Also price the drainage group 703: foundation drainage mat, under-slab gravel, exterior footing drains and downspout tightlines.
Return ONE trade package "Site / Grading / Excavation" with a scope of work and material list (rock, drain pipe, fabric, conduit, fill, etc. with quantities). If septic or well is a separate sub, return a second package.`,
  },
  {
    key: "concrete",
    title: "Concrete and masonry",
    groups: [300, 301, 302, 304, 305, 306, 307, 400, 401],
    instructions: `Price footings and walls (LF and size), architectural walls, slabs (SF, thickness, vapor barrier and rebar inside the slab line), interior and exterior flatwork, pumping, coatings (stain, seal, polish, epoxy), saw cutting. Masonry and stone veneer if any.
Return a trade package for Concrete (and Masonry if there's masonry) with a full material list: concrete CY by element and mix, rebar by size, forms, anchor bolts, holdowns set in forms.`,
  },
  {
    key: "structure",
    title: "Structure, framing, interior carpentry and millwork",
    groups: [500, 501, 502, 503, 504, 600, 602, 603, 605, 606, 607],
    instructions: `Sparrow self-performs framing, trusses and structural timbers, decks and exterior structures, interior trim, paneling, beams and columns, millwork and built-ins, and custom stairs. Steel fabrication and architectural metals are subs.
Split self-performed lines into labor hours (laborRole + laborHoursPerUnit) and material $/unit. Shop-built pieces use the "Shop / cabinet maker" role. Exterior trim and siding (601) belong to the envelope pass; cabinets (1200) belong to the finishes pass; cranes belong to general conditions.
Return a trade package "Framing lumber & hardware package" for the lumber yard with a full takeoff (studs, plates, headers, joists/rafters/trusses or I-joists, beams/glulams, sheathing, connectors and hardware by type, fasteners) and, if there is structural steel, a "Steel / Metals" package.`,
  },
  {
    key: "envelope",
    title: "Building envelope: insulation, roofing, siding, windows and doors",
    groups: [601, 700, 701, 702, 704, 705, 706, 800, 801, 802, 803, 804],
    instructions: `Price exterior trim, fascia and soffits (601.1) and siding (601.2; Sparrow installs unless it's a specialty system), insulation by assembly (700), spray-on barriers and waterproofing (701), vapor barriers and WRB (702, 706), roofing on sloped roof area with flashings and gutters (704), caulking (705), exterior and interior doors and hardware (800-802), windows counted one by one with sizes (803; allowance if no schedule), skylights (804). Window and door install is Sparrow labor. Drainage (703) belongs to the site pass.
Return trade packages for Roofing, Insulation, and a "Windows & exterior doors" supplier package listing every unit (mark, type, size, qty).`,
  },
  {
    key: "finishes",
    title: "Finishes, specialties, equipment, cabinets and countertops",
    groups: [900, 901, 902, 903, 904, 1000, 1001, 1100, 1101, 1102, 1200, 1201, 1202, 1203, 1300, 1301, 1302, 1400],
    instructions: `Price drywall (SF, level), tile by area, flooring by type and room (SF), painting interior and exterior and casework finishing, stucco, mirrors and shower glass, bath accessories, appliances (allowance unless owner-supplied), fireplaces, cabinets (1200; built in the Sparrow shop, so labor hours with the "Shop / cabinet maker" role plus material), countertops (1201), window coverings and closet systems if in scope, pools, special rooms and elevators/lifts if shown.
Return trade packages for Drywall / Paint and Flooring / Tile with material lists by room or area, plus Countertops if there are any.`,
  },
  {
    key: "plumbing",
    title: "Plumbing and radiant",
    groups: [1500, 1501],
    instructions: `Build a fixture schedule from the plans (every sink, lavatory, toilet, tub, shower, hose bibb, laundry, water heater, ice maker, floor drain). Price rough-in and trim (1500.1), fixtures (1500.2; allowance if no spec), gas piping if any, and radiant/domestic hot water (1501) if shown.
Return ONE trade package "Plumbing" with a scope of work and full material list (fixtures by room, water heater, PEX/copper footage, DWV pipe, valves, hose bibbs, gas pipe) so a plumber can bid it.`,
  },
  {
    key: "hvac",
    title: "HVAC, ventilation and fire suppression",
    groups: [1502, 1503, 1504, 1506, 1507, 1508, 1599],
    instructions: `Size heating and cooling from conditioned SF, climate (Puget Sound, zone 4C) and the envelope: ductless or ducted heat pump, air handler, ductwork (1502); HRV/ERV whole-house ventilation and radon if required (1504); bath, kitchen and dryer exhaust; fire sprinklers (1508) if required. Use allowances when no mechanical drawings exist and say so.
Return ONE trade package "Mechanical / HVAC" with a scope of work and full equipment and material list, plus "Fire sprinklers" if sprinklers are required.`,
  },
  {
    key: "electrical",
    title: "Electrical, lighting, security and low voltage",
    groups: [1600, 1601, 1602, 1603, 1699],
    instructions: `Price rough-in and trim by device count or SF (1600.1), new service or service upgrade (1600.2), temporary power if not in general conditions (1600.3), solar if shown, recessed and decorative fixtures by count (1601; allowance by type), lighting controls, landscape lighting, security and AV pre-wire (1602, 1603) as allowances.
Return ONE trade package "Electrical" with a scope of work and full material list (panel, breakers, wire by gauge, boxes, devices by type and count, fixture schedule by type and count).`,
  },
];

export const groupOf = (code: string) => {
  const m = code.trim().match(/^(\d{3,4})\./);
  return m ? Number(m[1]) : null;
};

/** The cost codes a package may use, as prompt text. */
export function packageCodeList(wp: WorkPackage) {
  const codes = COST_CODES.filter((c) => wp.groups.includes(groupOf(c.code) ?? -1));
  const byDiv = new Map<string, string[]>();
  for (const c of codes) byDiv.set(c.division, [...(byDiv.get(c.division) ?? []), `${c.code} ${c.label}`]);
  return [...byDiv.entries()]
    .map(([d, list]) => `Division ${Number(d)} ${SPARROW_DIVISIONS.find((x) => x.code === d)?.name}: ${list.join("; ")}`)
    .join("\n");
}

export const packageDivisions = (wp: WorkPackage) => [...new Set(wp.groups.map((g) => String(Math.floor(g / 100)).padStart(2, "0")))];
