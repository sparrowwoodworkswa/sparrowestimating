# Client Facing Report: Review, Target Format, Workflow

Prepared 11/23/2026. Inputs: Stretch Island Project Report 11/17/26 (QBO, Jarad), the "Client facing report needs" and "Client facing reports - next steps" email threads.

Context: Tom owns change tracking and the client report. Mike asked for a one-page proposal by the first week of December. This is working material for that.

---

## 1. What the Stretch Island report gets wrong

The math adds up. The problem is what the numbers mean.

1. **The projection is just the estimate.** Remaining Estimate = Original Estimate minus Invoices, for every division. No PM input. So "Projected Total" will always land near the original estimate until a division goes over.
2. **The $9,885 "underage" isn't real.** It's a markup artifact. Billed markup to date is $104,603. 17% of billed cost to date is $114,489. The gap is exactly $9,885.32. It says nothing about how the job is tracking on cost.
3. **Fee is shown as a division.** "4200 Construction Mark Up" sits in the table next to Framing and Concrete. The Original Estimate column ($2.26M) is cost plus fee, and Invoices to Date is too. A client can't see underlying cost on its own, and that's the number we said we'd be transparent about.
4. **Change is empty.** The change table lists divisions with no numbers, and Total Change Orders = 0. Per Tom, accounting stopped tracking numbered change. This report can't show change, and change is the whole point.
5. **The overrun bug is still in the formula.** No division is over on this job, so it doesn't show up. But Doors & Windows is 92% spent. As soon as a division goes negative, it will net against open divisions and understate remaining spend. Same bug Tom flagged on Nighthawk ($142K understated).
6. **Signs flip.** The same $9,885 shows as "(9,885.32)" Projected Overage in one box and "9,885.32" Total Overage in another. A client can't tell if they're over or under.
7. **"Invoices to Date" isn't labeled with a date.** Tom's fix from September: "Actual cost through [date]." Not done.
8. **Cleanup.** Divisions 11 and 12 are coded 1011.0 and 1012.0 (should be 1100 and 1200). "Orignal" typo. "Remaining Estimate" should be "Remaining to Spend."

What's worth keeping: division-level rollup (Tom and Riley agreed it's the right detail level), the loan tracking block for financed clients, and the fact it comes out of QBO with the invoice.

## 2. What the report should show

Built like the control estimate and the old change log. Cost first, fee and tax below the line.

### Page 1: The big numbers

| | Amount |
|---|---|
| Original estimate (cost) | |
| + Approved change (cost) | |
| = Current estimate (cost) | |
| Actual cost through [date] | |
| Projected final cost | |
| **Projected over/(under) vs. current estimate** | |
| Fee (per contract) and sales tax on projected final | |
| **Projected total contract** | |

Rule: **change is not overage.** Change moves the estimate. Overage is how we're doing against it. Never mix the two.

### Page 1: By division

| Code | Division | Control estimate | Approved change | Current estimate | Actual thru [date] | Projected over/(under) | Projected final | Remaining to spend |
|---|---|---|---|---|---|---|---|---|

- Projected final = current estimate + projected over/(under). PM owns that one column.
- Remaining to spend = projected final minus actual, per row. Never negative. Totals sum the rows, they don't net overruns against open budgets.
- Default projected over/(under) is zero. PM only touches rows where they know something. That keeps it light.

This matches the column set Tom, Riley and Mike settled on Sept 28, plus the change column.

### Page 2: Change log

| CO # | Date | Description | Status | Cost codes | Estimated cost | Actual thru [date] | Remaining |
|---|---|---|---|---|---|---|---|

Status is Pending or Approved. Only Approved rolls into page 1. Pending gets its own subtotal so the client sees what's coming.

### Leave off the every-invoice report

- **Committed cost.** Agree with Tom: too sticky, too much admin. Quarterly at most. Note Jarad's "committed" means bills received but not yet invoiced. That's really actual cost lagging, not commitments. Fold it into "actual through [date]" and drop the word "committed."
- **Projected Remaining Costs table** (cost + markup + tax by division). Tom and Mike already agreed to drop it.

### Built-in checks (Mike's ask: "it can't go out wrong")

Internal check block. Report doesn't go out unless all pass:

1. Division rows sum to totals.
2. Actual through [date] ties to the QBO job cost total for that date.
3. Change on page 1 equals approved total on the change log.
4. No row has negative remaining to spend.
5. Fee % matches the contract (DG is 18%, not 17%).
6. Projected final = actual + remaining, every row.
7. Every over/(under) row has a one-line PM note.

## 3. Workflow today, and where change gets lost

```
Field/shop hours ─> Google Sheets timesheet ─┐
Sub & vendor bills ─> Bill.com ──────────────┼─> Katrina codes ─> PM reviews ─> QBO ─> Jarad: invoice + report
Card receipts ───────────────────────────────┘
```

Cost codes survive the whole trip. Change doesn't. There's no field in this chain that marks a cost as change and carries it into QBO in a way you can report on. PO numbers were tried, but you can't report on them.

**The fix is to tag change at the source, the same way we tag cost codes.**

- **Timesheet:** add a "CO #" column. Blank = base scope.
- **Bill.com:** tag each bill line with the CO # as a QBO **Class** (CO-01, CO-02, and a "Base" class for everything else). Classes sync from Bill.com to QBO line by line, and QBO can report Job Cost by Class. That's the hook PO numbers didn't give us. Jarad needs to confirm our QBO plan has class tracking turned on.
- **Katrina** codes cost code + CO # together. The PM checks both when they review.
- **PM** keeps the change log (CO #, description, estimate, status). That's the one list everyone works from.

Result: QBO can split actuals into base vs. change by cost code. The report just reads it.

## 4. Tool options

| Option | What it is | Good | Not so good |
|---|---|---|---|
| A. QBO only | Custom job cost report by class | No new tool | Jarad already said QBO can't do all of it. No PM projections, no change log, QBO's look |
| B. Google Sheet | QBO export + control estimate + change log + PM column → report tab → PDF | Fast. Tom can have it live in December. Not Excel | Copy-paste every cycle. Formulas get broken. One sheet per job |
| C. This estimating app | Add a "Jobs" module: control estimate comes from our estimate, QBO actuals pulled in (API or CSV), PMs keep change log and projections, report publishes as a client web page + PDF in the Sparrow look | One format for every job. Checks built in. Actuals feed the cost database (Actual is our top rate source) | Takes a few weeks to build. QBO API connection needs Jarad's sign-off |

**Recommendation:** B now, C next.

1. **Now (Dec):** Start Class tagging for change on every open job. Tom builds the Sheet version in the format above. First reports go out with December invoices. Start with a change *total* if itemized history can't be rebuilt in time.
2. **Catch up open jobs:** PMs rebuild each job's change log from approved COs and emails. Katrina re-tags past bills where it's worth it. Where it isn't, book historic change as one "pre-December change" line per job.
3. **Next (Q1):** Build option C in this app using the same columns and checks. The Sheet becomes the spec. When it works, retire the Sheet.

## 5. Open questions

1. Does the client see division level only, or line items on request?
2. Every invoice (biweekly) or monthly?
3. Show fee and tax by division, or only in the totals block? (Recommend totals only.)
4. Loan tracking block: keep it for financed jobs only?
5. Does our QBO plan have class tracking? (Jarad)
6. Who signs off before each report goes out: the PM, or the PM plus accounting?
