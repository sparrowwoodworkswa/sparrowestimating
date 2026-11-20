---
name: "sparrow-estimate-proposal"
description: "Estimate a Sparrow Woodworks project from uploaded plans and produce the CSI spreadsheet, CSI estimate PDF, and client proposal (web page + PDF) in Sparrow's house format."
---

# Sparrow estimate + proposal

> **Cost codes:** use Sparrow's own Master Cost Code List from the repo `CLAUDE.md`, not CSI MasterFormat. Where this skill says CSI, read Sparrow cost codes and divisions. Ask which fee structure applies (Osius 1.5% + 15% + site tax, or control estimate 18% fee + 9% Kitsap tax) if Mike hasn't said. Proposals show the core team only unless he says otherwise.

Use when Mike uploads a drawing set (pricing set, SD/DD, permit set) and wants it estimated and turned into a proposal. Output matches the Osius Accessory Building proposal (Nov 2026).

## 0. Before starting
Ask only what the drawings can't answer, in one AskUserQuestion:
- Owner name (for "Prepared for") and project name
- Finish level (builder / mid / mid-high / high)
- Anything owner-supplied or excluded beyond the defaults below
- Which team members to show (default: full team below)
If he doesn't answer, use the defaults and say so.

Remind him once to attach team headshots and a shop photo. Files from past sessions are not kept.

## 1. Read the plans
- Render every sheet (pdftoppm) and read text (pdftotext). Note sheet list, architect, engineer, address, date, drawing stage.
- Take off from dimensions; where undimensioned, scale it and say so in the line note.
- Get roof pitch and overhangs from elevations. Use sloped roof area, not footprint.
- Count windows and doors one by one. Trim and flashing counts must match the opening count.
- Footings: don't double-count under retaining walls that carry their own footing.
- Steel: count every plate and connection shown in details (heels, peaks, post-to-beam).
- Log every conflict between sheets (arch vs structural thickness, material callouts, cover sheet data that doesn't match the drawn building, energy code shortfalls, setbacks/well radius, missing MEP). These become the "What we caught" box.
- Crop one hero drawing (section perspective or rendering) and one elevation for the proposal.

## 2. Estimating standards
**Structure:** 16 CSI MasterFormat divisions (01 General Requirements through 16 Electrical). Show empty divisions with a one-line reason.

**Each line has:** CSI code, description, qty, unit, labor hrs/unit, labor rate, material $/unit, sub $/unit, total, note, and a scope inclusion ("Scope we priced"). Name basis-of-design products where shown.

**Labor (burdened cost/hr, Seattle-area 2026):** carpenter $105, superintendent $125, PM $120, PE $95. Sparrow self-performs framing, glulam, decking, sheathing, windows, siding, trim, cleanup. Other trades are sub unit prices at Puget Sound rates.

**Markups:**
- Insurance & WA B&O 1.5% on direct cost
- Contractor fee 15% on direct + insurance
- **No contingency** unless Mike asks
- WA sales tax as its own line on the full contract price. Look up the current DOR rate for the site address. Never leave tax out.

**Allowances:** tag any line with no drawings or schedule behind it (windows without a schedule, HVAC, ventilation, lighting fixtures, low voltage, specialty floors, stormwater, permit, testing, landscape).

**General Requirements usually include:** super (part-time hours over the schedule), PM, PE, permit allowance, survey, testing, toilet, temp power and protection, lift/telehandler (only the weeks the high work takes), scaffold, dumpsters, cleanup, small tools, on-site storage container.

**Don't carry:** ferry or island travel charges (Sparrow drives over Agate Pass), design/architectural/engineering fees, or a pre-con retainer.

**Reference unit costs (Osius, Nov 2026) as a starting point, not gospel:** 24 ga mech-seam standing seam $21/SF; Nichiha AWP siding $12.50/SF mat + 0.09 hr/SF; 2x6 T&G decking $9.50/SF mat; 5" SOG $13.50/SF sub; architectural concrete wall $88/SF; continuous footing $78/LF; GWB L4 $4.25/SF; paint $2.10/SF; glulam truss ~22 hrs each in shop; steel plates ~$450 ea fabricated; tension rods ~$750 ea; ductless heat pump 2 heads ~$16.5K; electrical branch wiring ~$9.50/SF.

**Default exclusions:** plumbing/water service unless shown; well or septic; owner equipment and A/V gear; furniture and window treatments; geotechnical report; utility company fees; hardscape, fencing and new landscaping beyond restoration; hazardous material testing or abatement.

## 3. Build the spreadsheet (load the xlsx skill)
Tabs: **Summary** (16 divisions: labor/material/sub/total/% of direct/$/SF, then insurance, fee, subtotal, tax, contract total, labor hours, SF), **Detail** (all lines by division with subtotals, plus a Scope Included column), **Rates** (labor rates, markups, tax, building SF as blue-on-yellow inputs), **Notes** (basis, rev log, questions for the architect, exclusions). Use formulas throughout. Run recalc.py with zero errors. Arial in the workbook.

## 4. CSI estimate PDF (reportlab, Helvetica)
Letter landscape, drawing-set look:
- Border, right-hand title block 2.1" wide: SPARROW / WOODWORKS, "General contracting + millwork / Indianola, Washington", then project, address, architect, structural, drawing set, estimate type, issued date + rev, a not-for-construction note, sheet title, and big sheet number.
- E-001 Summary: title, short description, KPI row (contract total, $/SF, area, labor hrs), 16-division table with proportion bars, markup stack.
- E-101 on: line-item detail by division with an "Includes:" scope line under each description.
- E-201: basis, labor rates and markups, questions for the architect, exclusions.

## 5. Client proposal: web page artifact + matching portrait PDF
Palette: ink #1A1A18, mid #6A6A64, rule #D8D8D2, tint #F0EFEA, wood accent #8A6A3B (dark mode: bg #141413, accent #C79D62). Type: Helvetica Neue/Helvetica/Arial. Hairline rules, numbered section labels in the wood accent, no rounded cards. Sticky top bar: "Sparrow Woodworks", project name, and "Next step: Pre-construction" link.

Sections, kept lean:
- **Cover:** "Proposal · Preliminary estimate", project name, one-line lede. Fields: Prepared for, Architect, Structural, Design stage, Location, Date + Rev. Hero drawing with caption crediting the architect.
- **A note from Sparrow:** 2 short paragraphs signed Mike Stuntz, Owner. Paragraph 1 names what's special about this building. Paragraph 2: "We work cost-plus and open book. This estimate is our first pass from the pricing set. Pre-construction is where we turn it into a real budget together."
- **01 The project:** 2 sentences plus the elevation.
- **02 Who we are:** headline "Hands-on where it matters most". Paragraph: "At Sparrow, our own people handle the parts of a build that matter most. Our carpenters frame and set the structure. Our wood shop builds the pieces you'll see and touch every day. On [project], that starts with [signature element]. We take pride in the craft and the attention we bring to every project." Add the shop photo (Derek in the shop, captioned), then three points: Open book, cost-plus / Our own crews since 2011 / Just across Agate Pass (adjust for location). Recognition line: "AIA National, AIA Seattle and Architizer A+ awards with our architect partners, 2023 to 2025." Then a bordered box, "What we caught in the pricing set," with 3–5 drawing conflicts. **No comparable projects.**
- **03 Cost summary:** big total, $/SF "includes WA sales tax", markup table, 3 pricing notes, horizontal bars by CSI division (non-zero only, division order) with a note listing empty divisions.
- **04 Value options:** 4 scope deducts that don't touch the signature design. Price each at direct × (contract total ÷ direct cost). Show cards plus current / all options / new total.
- **05 Schedule:** duration headline, permit note, timeline with 5 milestones, titles only.
- **06 Pre-construction:** short intro and 5 deliverables (drawing review; trade bids and budget; shop drawings for anything built in our shop; long-lead ordering and schedule; cost-plus construction agreement). No retainer.
- **07 Your team:** 3×3 grid of 4:5 photos with name, role, one line:
  - Mike Stuntz, Owner & Founder: Fine woodworker turned builder. Founded Sparrow in 2011 and stays on every project.
  - Tom James, Operations & Project Management: Owns the budget, contract and risk. Keeps reporting open book.
  - Riley Deering, Project Manager: Former carpenter. Your day-to-day contact for schedule, subs and site.
  - Katrina Diller, Project Engineer: Handles submittals, RFIs and procurement.
  - Derek Crenshaw, Wood Shop Manager: Former lead cabinet maker at McGraw Zecha. Builds [shop items] in our shop.
  - Andreas Lymberopoulos, Superintendent: Background in custom cabinetry and millwork. Runs site quality, safety and inspections.
  - Miles Koivu, Superintendent: Kitsap native. Helped grow Clark Construction from 6 people to over 100.
  - Cody Williams, Superintendent: Poulsbo native with 33 years in construction, 25 of them running CW Carpentry.
  - Berg Danielson, Superintendent: Bainbridge born and raised. Years of local know-how, crew leadership and woodworking.
- **08 Appendix, Detailed estimate:** line count, builder cost, self-performed hours; Not included list; all 16 divisions as expandable groups (Item + code + Allowance tag / Scope we priced / Qty @ unit rate / Total). Empty divisions get one line.
- Footer: "Thank you." with Sparrow Woodworks, Indianola, Washington.

Mark anything unknown with a yellow "fill in" chip. Never invent names, numbers or bios.

The proposal PDF mirrors the page: letter portrait, header rule "SPARROW WOODWORKS / [PROJECT] · PRELIMINARY ESTIMATE", page numbers, KeepTogether so headings never orphan, appendix starts on a new page.

## 6. Check before delivering
- Contract total, division totals and line count match across the spreadsheet, CSI PDF, page and proposal PDF.
- Look at every PDF page and the page at desktop and phone width once. Fix orphans, overlaps and overflow.
- Publish the page as a private artifact. Send the xlsx, CSI PDF and proposal PDF. Tell Mike the page needs sharing from its Share menu, and that the PDF goes out as an attachment.

## Writing style (all client copy)
Plain, direct, casual-professional. Short sentences. No em dashes. No AI-sounding phrases. Keep Mike's voice.