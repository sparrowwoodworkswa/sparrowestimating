# Sparrow Estimating

Estimating app for Sparrow Woodworks (general contracting + millwork, Indianola, WA). Upload an architect's plan set, and Claude reads every sheet and builds a full rough order of magnitude (ROM). That includes MEP and site/grading scopes, bid-ready trade packages with material lists, and a branded client proposal. Every won or lost job, sub bid and actual cost feeds back into the next estimate.

## What it does

| Area | What you get |
| --- | --- |
| **Plans to ROM** | Upload PDFs. Claude reads the set (sheet index, shared takeoff quantities, building systems, drawing conflicts), then prices 9 work packages in parallel: General Requirements, site/grading, concrete, structure/framing, envelope, finishes, plumbing, HVAC, electrical. Lines use Sparrow's own Master Cost Code List (16 divisions, e.g. 300.1, 704.2, 1500.2) with labor hours, material and sub unit costs, allowances and a "scope we priced" note. Rates come from comparable past lines first, by priority: Actual > Sub bid > Sparrow estimate > Claude takeoff, escalated to current dollars. |
| **Cost-plus management costs** | Division 01 carries superintendent, PM and PE hours sized to the schedule, plus permits, temp facilities, equipment, dumpsters and cleanup. Labor rates are editable in Settings. |
| **Trade bid packages** | For each sub trade (plumbing, HVAC, electrical, site/grading, concrete, roofing, insulation, drywall, flooring, lumber, windows…): scope of work, inclusions, exclusions, full material list, RFIs and sheet refs. Print to PDF or download an .xlsx bid form to send with the plans. Log bids as they come in. |
| **Estimate editor** | Edit every line inline. Markups update the total live: contingency, insurance & B&O, overhead, fee/profit and WA sales tax. Set company defaults in Settings and override them per project. |
| **Client proposal** | A branded, interactive web page from a private link. It has the cost summary, value options the client can toggle (with a live total), schedule, pre-construction, team and the full open-book estimate. Clients can save it as a PDF, click "I'm ready to move forward" or send a question. Views and responses show up on the Outcome tab. |
| **Spreadsheet export** | ROM .xlsx with Summary, Detail (live formulas), Trade Packages, Rates, and an **Import** sheet: flat cost items split by Labor / Materials / Subcontractor, ready for a production platform (JobTread, Buildertrend, etc.). |
| **History & win/loss** | Every project with status (draft → estimating → proposal sent → won/lost → in construction → complete), the winning or competing price, and the actual cost. The Insights page shows win rate, $/SF won vs lost, bid-vs-ROM by trade and estimate-vs-actual. |
| **Sub price catalog** | Real quotes from your subs (e.g. concrete $/CY installed), entered by hand, imported from CSV, or added automatically when you log a bid. Every ROM prices from the catalog first. |
| **The learning loop** | "Learn from this project" compares Claude's first ROM with your edits, the sub bids, the outcome and the actual cost. It then proposes lessons and catalog prices. Approved lessons go into the system prompt of every future ROM. |

Seeded with Sparrow's history: Osius (full 88-line estimate and proposal), Valley Road, DeWitt, Rayson, Forge and Make, Koivu and Overstory (totals and actuals). Also seeded: lessons from the Valley Road comparison and Koivu/Overstory actuals, and Osius unit costs in the catalog.

## Run it locally

You need Node 20 or newer.

```bash
npm install
```

```bash
cp .env.example .env.local
```

Put your Claude API key in `.env.local` (`ANTHROPIC_API_KEY=...`), then:

```bash
npm run dev
```

Open http://localhost:3000. Data lives in `./data` (an embedded Postgres database and uploaded plans). It is created and seeded on first run.

## Host it (Vercel)

1. Import the repo in Vercel.
2. Set `APP_PASSWORD` (team password) and `ANTHROPIC_API_KEY`.
3. Add Supabase from the Vercel Marketplace and connect it to the project. It provides both the database (`POSTGRES_URL`) and file storage (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`). The app creates its `plans` (private) and `assets` (public) storage buckets on first use. Vercel Blob also works instead.
4. Redeploy. Tables are created and seeded on first request.
5. ROM runs take 5 to 15 minutes, and Vercel's function time limit has to cover that, so plan on Pro with fluid compute (up to 800s per function). Very large plan sets may need a background worker later.

The app has **no login yet**. Anyone with the URL can open it, so keep the URL private until team logins are added. Client proposal links (`/p/<token>`) are meant to be shared, and you can rotate a link from the Proposal tab.

## How the AI works

- Model: `claude-opus-5-5` (override with `ANTHROPIC_MODEL`), adaptive thinking, structured JSON outputs validated with Zod, and server-side refusal fallback.
- Plans are uploaded once to the Claude Files API. The system prompt (standards, labor rates, lessons, past projects, catalog) plus the plan set is cached, so the 9 parallel passes each pay full price for the plans only once.
- Code: `src/lib/ai/` (`pipeline.ts` for the ROM run, `packages.ts` for work-package instructions, `learn.ts` for the learning loop, `schemas.ts` for output shapes).
- Approximate cost per ROM is shown on each run (token usage × list price).

## Repo layout

```
src/app/(app)/          Internal app (Material-style UI, Sparrow colors)
src/app/p/[token]/      Client proposal (Sparrow editorial house style)
src/app/bid/[pkg]/      Printable sub bid package
src/lib/ai/             Claude pipeline
src/db/                 Schema, DDL, seed data
public/brand/           Team photos, shop photo, Osius drawings
skills/                 Sparrow estimate/proposal skill (house process)
cost-database/          Snapshot of the Sparrow Cost Database Sheet
estimates/              Estimate write-ups (Valley Road comparison)
proposals/              Past proposals as delivered
```

## Still to bring over

- Cost Database **Line Items** (743 rows): download from the Sheet as .xlsx/CSV, then import the unit rates through the Price catalog page.
- Your **logo**: upload it in Settings → Brand kit.
- Per-project estimate files and drawing sets from the chat project.
