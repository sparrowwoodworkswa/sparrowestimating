# Sparrow Estimating

This folder is for estimating Sparrow Woodworks jobs. Read this file at the start of every session.

## Who I am

- Mike Stuntz, owner of Sparrow Woodworks, Indianola, WA (North Kitsap). In business since 2011.
- General contractor and custom millwork shop. About 85% GC, 15% woodshop. About 22 people.
- Not design-build. Most leads come from architects.
- We self-perform a lot: framing, cabinets, furniture, millwork.
- Service area: Kitsap, Jefferson, Mason, Pierce, Clallam counties and Bainbridge Island.
- I prefer cost-plus contracts. Transparency and focus on details over a "black box" fixed bid.

## Team (for proposals)

- Tom James: operations and project manager
- Riley Deering: project manager
- Katrina Diller: project engineer
- Superintendents: Berg Danielson, Cody Williams, Miles Koivu, Andreas Lymberpoulos
- Derek Crenshaw: wood shop manager

## How I write

- Plain, direct, voice-forward. Casual-professional.
- Short sentences.
- No em dashes.
- No AI-sounding phrasing.
- When cleaning up my writing, keep my voice. Don't over-polish.

## Estimating rules

### Cost codes
Use Sparrow's own cost codes and divisions (below), not CSI MasterFormat.

### Cost database
- Before pricing, pull comparable lines from the cost database: same cost code, unit and finish level.
- Rate priority: Actual > Sub bid > Sparrow estimate > Claude takeoff. Note where each rate came from.
- After every estimate, add all its lines to Line Items and a row to Projects.
- When I upload an estimate, bid or job cost report, add it to the database tagged by source.
- Note the year each job was built or estimated. Adjust for inflation so jobs from different years compare fairly.
- Source tags: Claude takeoff, Sparrow estimate, Sub bid, Actual, Reference rate.
- Tabs: Projects, Line Items, Read Me.
- The database currently lives as a Claude Sheet: https://claude.ai/artifact/73YxyPMkkt2LkvyvikGo5K
  In Claude Code, use the exported copy in `cost-database/` if present. Ask me to export Line Items if it's missing. The app's own database (catalog, past estimate lines, lessons) mirrors this and feeds every ROM.

### Deliverables
Same deliverables and look as the Osius proposal:
1. Estimate spreadsheet
2. Estimate PDF
3. Client proposal page (web) + PDF

Proposals show the core team only unless I say otherwise.

### Brand
Always follow the current Sparrow Woodworks design system unless I say otherwise: https://claude.ai/artifact/MBY4JrHnvzZbNChLYzcDwP (read `project/README.md` and `project/tokens.json`). It overrides older brand notes, including the Osius look and the old wood accent. Short version:
- Inter only. Black, white and one gray. No accent color, no italics, rules not boxes.
- Documents use lockup A (`public/brand/logo-bird.png` + "Sparrow Woodworks"). The script logo is for the shop, trucks and apparel only.
- Phone with dots: 206.708.5615.

### Markups
Ask which fee structure applies if I haven't said.
- Osius structure: 1.5% insurance / WA B&O + 15% fee. Sales tax looked up for the site address.
- Control estimate template default: 2000.1 Kitsap County tax 9%, 2000.2 Contractor's Fee 18%.

### Comparing to my estimate
If I give you my own estimate, finish your takeoff first, then compare. Don't change either one unless I ask. I like comparisons as an executive-summary view.

## Projects

### Benchmarks (completed jobs)
- **Overstory**: finished 2025, cost-plus, high finish. Big scope change mid-job (tracked in a change log). Plans and control estimate loaded into the database.
- **Koivu Residence** (Indianola): simple house, some mid to high finishes. Plan set and control estimate loaded as a benchmark.

### Estimates in progress / done
- **Valley Road Addition** (alias Kuniholm): 9766 NE Valley Rd, Bainbridge Island. Tom Kuniholm is owner and architect (Tom Kuniholm Architects). Structural: Dayle B. Houk & Company. Mid finish. Owner buys appliances. Exclude landscape, A/V, furniture, abatement. Super: Berg Danielson. Claude takeoff $670,376 vs my ROM $653,156; both in the database.
- **Osius barn** (accessory building / training barn): new construction, Bainbridge Island. Architect Coates Design. Mid to high finish. This is the reference format for all estimates and proposals. Its reference unit rates are in the database.
- **DeWitt**: new residence. Same format as Osius.
- **Goth Mansion** (= Rayson remodel/addition): mid-high finish. Estimate and proposal.
- **Forge and Make TI**: commercial tenant improvement in Poulsbo. Balance Architects. Client is the tenant, Forge and Make LLC. Nov 2026 permit set. Laid out in CSI for now; remap to Sparrow cost codes later.
- **Bainbridge elevator addition**: small residential elevator addition. Started with a ROM from plans.

## Sparrow Master Cost Code List

From the Master Primary Control Estimate template.
Columns: # | Category | Line Item | Comments | Labor | Materials | Total Costs | Notes/Scratch | Variance from Contract | Variance from Last Month | Current Month Invoice | Paid Through Last Month | Remaining to Spend.
Markups: 2000.1 Kitsap County tax 9%, 2000.2 Contractor's Fee 18%. Totals: Total Fees, Total Contract Sum.

### Division 1 General Conditions
- 100.1 Designers Architect
- 100.2 Interior Designer
- 100.3 Landscape Architect
- 101.1 Engineers Structural
- 101.2 Geotechnical
- 101.3 Civil
- 101.4 Mechanical
- 102.1 Consultants Survey
- 102.2 Energy Rater/ Blower Door
- 102.3 Building Science
- 102.4 Location Services
- 102.5 Speciality inspection
- 102.9 Other
- 103.1 Testing Asbestos
- 103.2 Lead paint
- 103.3 Sewer / Septic Locate
- 103.9 Other
- 104.1 Permits Zoning Permit
- 104.2 Building Permit
- 104.3 Sewer Use & Drainage
- 104.4 Right of Way Permits
- 104.5 Grading permit
- 104.6 Septic
- 104.9 Other
- 107.1 Insurances Builders Risk
- 107.2 Liability
- 107.9 Other
- 108.1 Temporary facilities Mobile Office
- 108.2 Chemical Toilets
- 108.3 Exterior Protection / Interior Protection
- 108.4 Interior Protection
- 108.5 Safety Equipment
- 108.6 Security Equipment
- 108.7 Stairs/ Rails/ Access / Temp doors
- 108.9 Other
- 109.1 Administration Printing
- 109.2 Postage & Parking
- 109.3 Technology Fee
- 109.4 Mileage
- 109.9 Other
- 110.1 Equipment Cranes & Lifts
- 110.2 Disposable Tools
- 110.3 Barricades
- 110.4 Heavy Equipment Rental
- 110.5 Small Equipment Rental
- 110.6 Vehicles
- 110.9 Other
- 111.1 Construction utilities Electrical & Gas
- 111.2 Propane
- 111.3 Water
- 111.9 Other
- 112.1 Cleaning Trash Removal
- 112.2 Cleaning Supplies
- 112.3 Weekly Cleanup
- 112.4 Final Cleanup
- 112.9 Other
- 113.1 Contractor fees SW Supervision & Project Management
- 113.2 General Labor
- 113.3 Invoice Administration
- 113.4 Project Close-out
- 113.5 Shop Drawings
- 113.6 Mobilization & Demobilization
- 113.8 Warranty
- 113.9 Other

### Division 2 Site Work
- 200.1 Site preparation Fixture Removal/ Storage
- 200.2 Moving Personal Belongings
- 200.3 Temporary Structures
- 200.9 Other
- 201.1 Demolition Asbestos & Lead Paint Removal
- 201.2 General
- 201.3 Partial
- 201.4 Tree Removal
- 201.5 Concrete Sawing / Boring
- 201.9 Other
- 202.1 Dewatering Excavation Water Removal
- 202.9 Other
- 203.1 Shoring Shoring Piers
- 203.2 Wall Bracing
- 203.9 Other
- 204.1 Earthwork House Excavation
- 204.2 Site Excavation
- 204.3 Driveway
- 204.4 Trenching
- 204.5 Traction Control
- 204.6 Flatwork Preparation
- 204.9 Other
- 205.1 Utilities Water Line or Well
- 205.2 Sewer Line or Septic
- 205.3 Propane Tank
- 205.4 Septic Tanks and Field
- 205.9 Other
- 206.1 Landscaping Area Drains
- 206.2 Fencing
- 206.3 Plantings/ Sod/ Irrigation/ Etc.
- 206.9 Other

### Division 3 Concrete
- 300.1 Concrete walls & Footings House Footings & Walls
- 300.2 Site Footings & Walls
- 300.3 Plinths
- 300.4 Architectural Walls
- 300.5 Slab
- 300.9 Other
- 301.1 Interior flatwork Basement & Garage
- 301.2 Finished Slab
- 301.3 Rat Slab
- 301.9 Other
- 302.1 Exterior Flatwork Driveway
- 302.2 Patios & Walks
- 302.3 City Sidewalk & Curbs
- 302.9 Other
- 304.1 Concrete pumping Foundations & Flatwork
- 304.9 Other
- 305.1 Precast Window Wells
- 305.2 Interior Finishes
- 305.9 Other
- 306.1 Coatings Concrete Stain/ Seal/ Polish
- 306.2 Garage Epoxy
- 306.9 Other
- 307.1 Cutting / Boring Saw Cutting
- 307.2 Hole Boring
- 307.9 Other

### Division 4 Masonry
- 400.1 Brick or Stone House Walls
- 400.2 Site Walls
- 400.3 Walks & Patios
- 400.4 Site Features
- 400.5 Restoration & Cleaning
- 400.9 Other
- 401.1 Block Block Walls or Foundations
- 401.2 Glass Block
- 401.9 Other

### Division 5 Metals
- 500.1 Structural Steel Posts/ Beams/ Welding
- 500.2 Metal Framing
- 500.9 Other
- 501.1 Architectural Metals Interior Stairs
- 501.2 Interior Railings
- 501.3 Exterior Stairs
- 501.4 Exterior Railings
- 501.5 Countertops
- 501.6 Wall Panels
- 501.9 Other
- 502.1 Metal Fencing Fences
- 502.2 Gates
- 502.9 Other
- 503.1 Window Wells Covers
- 503.2 Ladders
- 503.9 Other
- 504.1 Coatings Powder Coating
- 504.2 Plating
- 504.3 Liquid Metal Coatings
- 504.9 Other

### Division 6 Woods & Plastics
- 600.1 Framing House/ Garage/ Basement
- 600.2 Roof Trusses
- 600.3 Structural Timbers
- 600.9 Other
- 601.1 Exterior Trim Fascia & Soffits
- 601.2 Siding
- 601.3 Timbers
- 601.4 Special Items
- 601.9 Other
- 602.1 Wood Decks Decking
- 602.2 Deck Railings
- 602.9 Other
- 603.1 Exterior Structures Trellis
- 603.2 Pergola
- 603.3 Decks
- 603.4 Covered Porch
- 603.9 Other
- 605.1 Interior Trim Casings & Baseboard
- 605.2 Ceiling & Wall Mouldings
- 605.3 Wainscoting & Paneling
- 605.4 Beams & Columns
- 605.5 Closet & Pantry Shelving
- 605.6 Millwork & Built-ins
- 605.7 Ceiling Paneling
- 605.9 Other
- 606.1 Wood Stairs Custom Stairs
- 606.2 Wood Handrails
- 606.9 Other
- 607.1 Plastics Panels
- 607.2 Laminate Countertops
- 607.9 Other

### Division 7 Thermal & Moisture Protection
- 700.1 Insulation Below Slab
- 700.2 Whole House Package
- 700.3 Sound Attenuation
- 700.4 Attic or Roof
- 700.9 Other
- 701.1 Spray-On Barriers Foundation Footer & Walls
- 701.9 Other
- 702.1 Membranes Below Slab Vapor Barrier
- 702.2 Weather resistant Barrier
- 702.9 Other
- 703.1 Drainage Foundation Drainage Mat
- 703.2 Under Slab Gravel
- 703.3 Exterior Foundation Drains
- 703.4 Interior Foundation Drains
- 703.5 Window Well Drains
- 703.9 Other
- 704.1 Roofing Shingles
- 704.2 Metal
- 704.3 Membrane
- 704.4 Gutters/ Downspouts
- 704.5 Flashing/ Copings/ Break-metal
- 704.9 Other
- 705.1 Caulking Windows & Doors
- 705.2 Patios & Flatwork
- 705.9 Other
- 706.1 WRB Building Wrap
- 706.9 Other

### Division 8 Doors & Windows
- 800.1 Exterior Doors Entry Door
- 800.2 Patio Doors
- 800.3 Garage Doors
- 800.9 Other
- 801.1 Interior Doors Swing/ Pocket Doors
- 801.2 Attic Access
- 801.3 Pivot Doors
- 801.9 Other
- 802.1 Door Hardware Entry Door Lockset
- 802.2 Door knobs/ Locksets/ Stops
- 802.3 Pivot Hardware
- 802.9 Other
- 803.1 Windows Stile
- 803.2 Shims
- 803.3 Sealants
- 803.4 Tapes
- 803.5 Flashings
- 803.8 Sundries
- 803.9 Other
- 804.1 Skylights Sun Tunnels
- 804.2 Standard
- 804.9 Other

### Division 9 Finishes
- 900.1 Wall Finishes Drywall
- 900.2 Plaster
- 900.3 Wood Paneling
- 900.4 Fire Resistant Paper (FRP)
- 900.9 Other
- 901.1 Tile Interior
- 901.2 Exterior
- 901.9 Other
- 902.1 Flooring Wood
- 902.2 Carpet
- 902.3 Rubber/ Linoleum
- 902.9 Other
- 903.1 Painting Interior
- 903.2 Exterior
- 903.3 Casework Finishing
- 903.9 Other
- 904.1 Stucco House
- 904.2 Site Walls
- 904.9 Other

### Division 10 Specialties
- 1000.1 Glass Plate Glass Mirrors
- 1000.2 Tub & Shower Enclosures
- 1000.3 Guard Rails
- 1000.9 Other
- 1001.1 Bath Accessories Medicine Cabinets
- 1001.2 Bars/ Hooks/ TP Holders
- 1001.9 Other

### Division 11 Equipment
- 1100.1 Appliances House
- 1100.9 Other
- 1101.1 Fireplaces Indoor
- 1101.2 Outdoor
- 1101.9 Other
- 1102.1 Miscellaneous Central Vacuum
- 1102.2 Patio Heaters
- 1102.9 Other

### Division 12 Furnishings
- 1200.1 Cabinets Kitchen
- 1200.2 Baths
- 1200.3 Laundry
- 1200.4 Bed
- 1200.5 Exterior
- 1200.6 Built in
- 1200.7 floating shelving
- 1200.8 Consumables
- 1200.9 Other
- 1201.1 Solid Surface Countertops
- 1201.2 Walls
- 1201.9 Other
- 1202.1 Window Coverings Roller Shades
- 1202.2 Draperies
- 1202.9 Other
- 1203.1 Closet Systems Modular Systems
- 1203.2 Garage Storage Systems
- 1203.9 Other

### Division 13 Special Construction
- 1300.1 Pools Swimming pool
- 1300.2 Spa
- 1300.9 Other
- 1301.1 Recreation Sports Court/ Gym/ Etc.
- 1301.9 Other
- 1302.1 Miscellaneous Wine Room
- 1302.2 Sauna
- 1302.3 Safe Room
- 1302.9 Other

### Division 14 Conveying Systems
- 1400.1 Conveying Elevator
- 1400.2 Dumbwaiter
- 1400.3 Lift
- 1400.9 Other

### Division 15 Mechanical
- 1500.1 Plumbing Rough-in & Trim
- 1500.2 Fixtures
- 1500.9 Other
- 1501.1 Radiant Systems House Heat
- 1501.2 Garage Heat
- 1501.3 Domestic Hot Water
- 1501.4 Snow Melt
- 1501.5 Bathroom In-Floor
- 1501.9 Other
- 1502.1 HVAC Heating House
- 1502.9 Other
- 1503.1 HVAC Cooling Wine Room
- 1503.9 Other
- 1504.1 Air Quality Radon Collection System
- 1504.2 HRV / ERV
- 1504.9 Other
- 1506.1 Renewable systems Geothermal
- 1506.9 Other
- 1507.1 Cleaning Duct clean
- 1507.9 Other
- 1508.1 Fire Suppression Interior Sprinklers
- 1508.9 Other
- 1599.1 Other Specify

### Division 16 Electrical
- 1600.1 Electrical Rough-in & Trim
- 1600.2 New Service
- 1600.3 Temporary Power
- 1600.4 Pool/ Spa Electrical
- 1600.5 Solar
- 1600.9 Other
- 1601.1 Lighting Recessed Fixtures
- 1601.2 Decorative Fixtures
- 1601.3 Landscape Fixtures
- 1601.4 Lighting Control System
- 1601.9 Other
- 1602.1 Security Intrusion Detection & Cameras
- 1602.9 Other
- 1603.1 Audio/Video AV System
- 1603.2 Home Theatre
- 1603.9 Other
- 1699.9 Other Specify

## The estimating app (this repo)
- Next.js 15 App Router + TypeScript, Drizzle ORM on Postgres (embedded PGlite locally in `./data`, `DATABASE_URL` in production). Schema: `src/db/schema.ts`; DDL runs idempotently on startup from `src/db/ddl.ts`. Add columns with `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`.
- AI pipeline in `src/lib/ai/`: Anthropic TypeScript SDK, `claude-opus-5-5`, structured outputs via Zod (`betaZodOutputFormat`), plan files via the Files API, cached system + plan prefix shared by parallel work-package passes. Keep the system prompt byte-identical across passes so caching works.
- Internal UI follows Google Material 3 patterns (top app bar, nav drawer, tonal buttons, chips, cards) themed with Sparrow's colors (`src/app/globals.css`). Client-facing pages (`/p/[token]`, `/bid/[pkg]`) use Sparrow's editorial house style.
- Verify with `npm run build` (typechecks) and `npm run check:schemas`.
- Sparrow cost codes live in `src/lib/costcodes.ts` (generated from the list above). Keep them in sync if the template changes.
- The older skill at `skills/sparrow-estimate-proposal/SKILL.md` still describes the Osius deliverables and look. Where it conflicts with this file (CSI divisions), this file wins.
