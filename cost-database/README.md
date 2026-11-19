# Sparrow cost database

This is an export of the **Sparrow Cost Database** Claude Sheet: https://claude.ai/artifact/73YxyPMkkt2LkvyvikGo5K

The Sheet stays the live copy. These files are a snapshot from November 19, 2026. Formula cells were saved as their computed values.

| File | Sheet tab | Status |
| --- | --- | --- |
| `projects.csv` | Projects | Exported (9 rows) |
| `escalation.csv` | Escalation | Exported. Current year: **2026** |
| `line-items.csv` or `line-items.xlsx` | Line Items (A1:V744, 743 lines) | **Not yet exported.** Download it from the Sheet page (.xlsx or CSV) and add it here |

## How the database works (from the Read Me tab)

One row per estimate line. Every project and every estimate goes in Line Items, tagged by Source.

| Source | What it means |
| --- | --- |
| Claude takeoff | Claude's quantity takeoff from a drawing set |
| Sparrow estimate | An estimate Mike or the team built (ROM, control estimate) |
| Sub bid | A real bid from a sub or supplier. Put the company in Vendor / bid |
| Actual | Final cost from job cost reports. The most valuable rows |
| Reference rate | A unit rate carried as a reference, not tied to a full estimate |
| Change order | Change log items billed outside the base contract. Kept apart so base $/SF stays clean. Notes give the change number |

- **Category:** normalized buckets so estimates with different CSI codes can be compared (same as the Valley Road Compare tab).
- **Unit cost:** formula, labor + material + sub per unit. Total = Qty x Unit cost.
- **Projects:** Direct cost sums Line Items for that project and source. Contract total is typed because fee structures differ.
- **Cost year:** the year the money was spent. Estimates use the estimate date. Actuals use the midpoint of construction (Koivu was built fall 2023 to early 2025, so 2024).
- **Escalation:** one annual rate per year and the current year. Factor = rates compounded from the cost year to the current year: `EXP(SUMPRODUCT((Year > cost year) * (Year <= current year) * LN(1 + rate)))`.
- **Current $:** Line Items col V and Projects cols O to Q restate cost in current-year dollars. Use these when comparing jobs from different years. Update the Escalation tab each January.

## Projects formulas (Sheet)

- Direct cost: `=SUMIFS('Line Items'!J:J,'Line Items'!A:A,A2,'Line Items'!B:B,B2)`
- Contract $/SF: `=IF(OR(F2="",I2=""),"",I2/F2)`
- Direct cost, current $: `=SUMIFS('Line Items'!V:V,'Line Items'!A:A,A2,'Line Items'!B:B,B2)`
- Contract, current $: `=IF(I2="","",I2*IFERROR(VLOOKUP(N2,Escalation!A:C,3,FALSE),1))`
- Contract $/SF, current: `=IF(OR(F2="",P2=""),"",P2/F2)`
