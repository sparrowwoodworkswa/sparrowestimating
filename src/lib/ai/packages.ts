/**
 * Work packages: the ROM is built in parallel, one Claude pass per package.
 * Each pass returns estimate lines for its divisions and, for subcontracted trades,
 * a bid-ready scope of work with a full material list.
 */
export type WorkPackage = {
  key: string;
  title: string;
  divisions: string[];
  trades: string[];
  instructions: string;
};

export const WORK_PACKAGES: WorkPackage[] = [
  {
    key: "gc",
    title: "General Requirements and project management",
    divisions: ["01"],
    trades: ["Sparrow"],
    instructions: `Price Division 01 only. This is how Sparrow runs the job as a cost-plus GC, so be thorough:
- Superintendent hours over the full schedule (part-time on small jobs, ~12-20 hrs/wk; full-time on large homes), PM hours, PE hours for submittals/RFIs/procurement.
- Sub coordination and inspections time is inside super/PM hours; say so in the scope.
- Permit and plan review allowance for the jurisdiction, survey/staking, testing & special inspection allowance.
- Temp toilet, temp power, temp protection of existing structures, fencing, telehandler/lift (only the weeks high work takes), scaffold, dumpsters (sized to the job), daily cleanup + final clean, small tools & consumables, storage container, winter protection if the schedule crosses Nov-Mar.
No trade packages for this pass (return an empty tradePackages list).`,
  },
  {
    key: "site",
    title: "Site, grading, excavation and utilities",
    divisions: ["02"],
    trades: ["Site / Grading", "Landscape"],
    instructions: `Price Division 02. Include demo, clearing, TESC/erosion control, construction entrance, excavation (CY) and haul or import, structural fill, backfill and compaction, crushed rock under slabs, footing drains and downspout tightlines, stormwater dispersion/infiltration (allowance unless designed), utility trenching (power, water, sewer or septic connection, LP), driveway/access, finish grade and restoration.
Return ONE trade package "Site / Grading / Excavation" with a scope of work and material list (rock, drain pipe, fabric, conduit, fill, etc. with quantities) for the excavation contractor. If utilities are a separate sub (e.g. septic designer/installer), return a second package.`,
  },
  {
    key: "concrete",
    title: "Concrete and masonry",
    divisions: ["03", "04"],
    trades: ["Concrete", "Masonry"],
    instructions: `Price Divisions 03 and 04. Footings (LF and size), stem walls, retaining walls, slabs (SF, thickness, vapor barrier, rebar), flatwork, pads, anchors/holdowns set in forms, pump, finishes. Masonry and stone veneer, chimneys if any.
Return a trade package for Concrete (and Masonry if there's masonry) with a full material list: concrete CY by element and mix, rebar by size (LF or LB), vapor barrier, forms, anchor bolts, holdowns, insulation under slab if in their scope.`,
  },
  {
    key: "structure",
    title: "Structure, framing and rough carpentry",
    divisions: ["05", "06"],
    trades: ["Sparrow", "Steel / Metals"],
    instructions: `Price Divisions 05 and 06. Sparrow self-performs framing, glulam, decking, sheathing, exterior trim, interior finish carpentry, stairs, and shop-built cabinets/millwork (shop labor via "Shop / cabinet maker").
Split self-performed lines into labor hours (laborRole + laborHoursPerUnit) and material $/unit. Steel fabrication is a sub.
Return a trade package "Framing lumber & hardware package" for the lumber yard with a full takeoff (studs, plates, headers, joists/rafters/trusses or I-joists, beams/glulams, sheathing, connectors/hardware by type, fasteners) and, if there is structural steel, a "Steel / Metals" package.`,
  },
  {
    key: "envelope",
    title: "Building envelope: roofing, insulation, siding, windows and doors",
    divisions: ["07", "08"],
    trades: ["Roofing", "Insulation", "Envelope", "Doors / Windows"],
    instructions: `Price Divisions 07 and 08. Roofing on sloped roof area (SQ/SF) with underlayment and flashings, gutters/downspouts, insulation by assembly (walls, roof, under slab, rigid exterior), air sealing, WRB, rainscreen, siding and trim (Sparrow installs siding unless it's a specialty system), waterproofing, sealants. Windows and exterior doors counted one by one with sizes (allowance if no schedule), interior doors, hardware, garage doors, skylights. Window/door install is Sparrow labor.
Return trade packages for Roofing, Insulation, and a "Windows & exterior doors" supplier package listing every unit (mark, type, size, qty).`,
  },
  {
    key: "finishes",
    title: "Interior finishes, specialties and equipment",
    divisions: ["09", "10", "11", "12", "13", "14"],
    trades: ["Drywall / Paint", "Flooring / Tile", "Cabinets / Millwork", "Specialties"],
    instructions: `Price Divisions 09-14. Drywall (SF, level), paint interior/exterior, flooring by type and room (SF), tile (floor, wall, shower), countertops, bath accessories, mirrors, shower glass, appliances (allowance unless owner-supplied), fireplaces, signage, specialties.
Cabinets built in the Sparrow shop go in 06 (structure pass), not here; countertops go here.
Return trade packages for Drywall / Paint and Flooring / Tile with material lists by room/area.`,
  },
  {
    key: "plumbing",
    title: "Plumbing",
    divisions: ["15"],
    trades: ["Plumbing"],
    instructions: `Price the PLUMBING part of Division 15 only (HVAC is a separate pass; prefix descriptions with "Plumbing:").
Build a fixture schedule from the plans (every sink, lavatory, toilet, tub, shower, hose bibb, laundry, water heater, ice maker, floor drain), water service, sewer/septic connection, DWV and supply rough-in, gas piping if any, radiant floor if plumbed, and fixture allowances where no spec.
Return ONE trade package "Plumbing" with a scope of work and full material list (fixtures by room, water heater, PEX/copper footage estimates, DWV pipe, valves, hose bibbs, gas pipe) so a plumber can bid it.`,
  },
  {
    key: "hvac",
    title: "HVAC and ventilation",
    divisions: ["15"],
    trades: ["Mechanical"],
    instructions: `Price the HVAC and ventilation part of Division 15 only (plumbing is a separate pass; prefix descriptions with "HVAC:").
Size the system from conditioned SF, climate (Puget Sound, zone 4C) and envelope: ductless or ducted heat pump, air handler, ductwork, ERV/HRV whole-house ventilation, bath and kitchen exhaust, dryer vent, controls, line sets, condensate, pads. Use allowances when no mechanical drawings exist and say so.
Return ONE trade package "Mechanical / HVAC" with a scope of work and full equipment and material list.`,
  },
  {
    key: "electrical",
    title: "Electrical and low voltage",
    divisions: ["16"],
    trades: ["Electrical", "Low Voltage"],
    instructions: `Price Division 16. Service size and upgrade or new service, utility coordination, panel/subpanel, feeders and trenching conduit, branch wiring (by SF or device count), device counts by room (receptacles, switches, dimmers), lighting fixtures (allowance by count/type), exterior lighting, EV charger rough-in, smoke/CO, low voltage and data, solar rough-in if shown.
Return ONE trade package "Electrical" with a scope of work and full material list (panel, breakers, wire by gauge, boxes, devices by type and count, fixture schedule by type and count).`,
  },
];
