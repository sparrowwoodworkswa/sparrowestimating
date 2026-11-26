import { notFound } from "next/navigation";
import { getShopJob, compareJob } from "@/lib/shop/data";
import { addActual, deleteActual } from "@/app/shop-actions";
import { ActualsImport } from "@/components/shop/ActualsImport";
import { ALL_TASKS, hrs, pct, taskLabel, usd } from "@/lib/shop/model";

export default async function ShopActuals({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const full = await getShopJob(Number(id));
  if (!full) notFound();
  const { job, actuals } = full;
  const c = compareJob(full);
  const sections = c.totals.sections.map((s) => s.section);
  const maxH = Math.max(1, ...c.rows.map((r) => Math.max(r.est, r.act)));
  const used = c.bufferUsed;

  return (
    <>
      <div className="sw-facts">
        <div><div className="label">Estimated shop hours</div><div className="v">{hrs(c.totals.personHours)}</div><div className="s">person-hours, {job.basis}</div></div>
        <div><div className="label">Actual hours</div><div className="v">{hrs(c.actual.hours)}</div><div className="s">{actuals.filter((a) => a.kind === "labor").length} timecard rows</div></div>
        <div><div className="label">Actual cost</div><div className="v">{usd(c.actual.total)}</div><div className="s">labor {usd(c.actual.laborCost)} · materials {usd(c.actual.materials)}</div></div>
        {c.complete ? (
          <div>
            <div className="label">Buffer used</div>
            <div className="v">{used == null ? "–" : pct(Math.max(0, used))}</div>
            <div className="s">of {pct(job.bufferPct)} carried, against labor and materials of {usd(c.totals.base)}</div>
          </div>
        ) : (
          <div>
            <div className="label">Spent so far</div>
            <div className="v">{c.spent == null ? "–" : pct(c.spent)}</div>
            <div className="s">of the {usd(c.totals.base)} base estimate, before the {pct(job.bufferPct)} buffer</div>
          </div>
        )}
      </div>
      <p className="caption" style={{ marginTop: 12 }}>
        {c.complete
          ? used == null
            ? "No actuals logged."
            : used <= 0
              ? `The job came in ${pct(-used)} under the base estimate. None of the buffer was used.`
              : used <= job.bufferPct
                ? `The job used ${pct(used)} of the ${pct(job.bufferPct)} buffer.`
                : `The job ran ${pct(used - job.bufferPct)} past the buffer.`
          : "Buffer used is worked out when the job is marked Complete in Job settings. Until then this page tracks hours by step as they come in, and the job stays out of the production library's actual factors."}
      </p>

      <h2 className="section">Estimate vs actual by step</h2>
      {c.rows.length ? (
        <div className="sw-scroll">
          <table>
            <thead>
              <tr><th>Step</th><th className="num">Estimated hours</th><th className="num">Actual hours</th><th className="num">Difference</th><th className="num">Actual / estimate</th><th style={{ width: "28%" }} /></tr>
            </thead>
            <tbody>
              {c.rows.map((r) => (
                <tr key={r.task}>
                  <td>{r.label}</td>
                  <td className="num">{hrs(r.est)}</td>
                  <td className="num">{hrs(r.act)}</td>
                  <td className="num">{r.diff > 0 ? "+" : ""}{hrs(r.diff)}</td>
                  <td className="num">{r.ratio == null ? "–" : `${r.ratio.toFixed(2)}x`}</td>
                  <td>
                    <div className="bar" title="Bar = actual, tick = estimate">
                      <i style={{ width: `${(r.act / maxH) * 100}%` }} />
                      <b style={{ left: `${(r.est / maxH) * 100}%` }} />
                    </div>
                  </td>
                </tr>
              ))}
              <tr className="total">
                <td>Total</td>
                <td className="num">{hrs(c.totals.personHours)}</td>
                <td className="num">{hrs(c.actual.hours)}</td>
                <td className="num">{hrs(c.actual.hours - c.totals.personHours)}</td>
                <td className="num">{c.totals.personHours ? `${(c.actual.hours / c.totals.personHours).toFixed(2)}x` : "–"}</td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <p className="muted">No hours yet.</p>
      )}
      <p className="caption" style={{ marginTop: 8 }}>
        Estimated hours here are person-hours: crew-hours times crew size, so they line up with timecards. The bar is actual, the tick is the estimate.
      </p>

      <div className="two">
        <div>
          <h2 className="section">Import timecards or invoices</h2>
          <p>
            CSV or .xlsx. The first row needs column names. It looks for Date, Employee, Task, Hours, Job, Section or Area, Notes, Amount and Vendor.
            Rows with hours are timecards. Rows with only an amount are material invoices. Rows for other jobs are skipped.
          </p>
          <p className="caption">
            Task names are matched to the shop steps: {ALL_TASKS.map((t) => t.label).join(", ")}. Ask the crew to pick from this list on their timecards.
          </p>
          <ActualsImport jobId={job.id} />
        </div>
        <div>
          <h2 className="section">Add one entry</h2>
          <form action={addActual.bind(null, job.id)}>
            <div className="form-grid">
              <label className="f"><span>Type</span>
                <select name="kind" defaultValue="labor"><option value="labor">Hours</option><option value="material">Material invoice</option></select>
              </label>
              <label className="f"><span>Date</span><input name="workDate" type="date" /></label>
              <label className="f"><span>Step</span>
                <select name="task" defaultValue="milling">{ALL_TASKS.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}</select>
              </label>
              <label className="f"><span>Section</span>
                <select name="section" defaultValue=""><option value="">Whole job</option>{sections.map((s) => <option key={s}>{s}</option>)}</select>
              </label>
              <label className="f"><span>Who</span><input name="who" /></label>
              <label className="f"><span>Hours</span><input name="hours" type="number" step="any" /></label>
              <label className="f"><span>Amount $ (invoices)</span><input name="amount" type="number" step="any" /></label>
              <label className="f"><span>Vendor</span><input name="vendor" /></label>
            </div>
            <label className="f" style={{ marginTop: 16 }}><span>Note</span><input name="note" /></label>
            <div className="row" style={{ marginTop: 16 }}><button className="btn" type="submit">Add</button></div>
          </form>
        </div>
      </div>

      <h2 className="section">Entries</h2>
      <div className="sw-scroll">
        <table>
          <thead><tr><th>Date</th><th>Type</th><th>Step</th><th>Section</th><th>Who / vendor</th><th className="num">Hours</th><th className="num">Amount</th><th>Note</th><th /></tr></thead>
          <tbody>
            {actuals.slice(0, 300).map((a) => (
              <tr key={a.id}>
                <td>{a.workDate}</td>
                <td>{a.source}</td>
                <td>{a.kind === "labor" ? taskLabel(a.task) : ""}</td>
                <td>{a.section}</td>
                <td>{a.who || a.vendor}</td>
                <td className="num">{a.hours ? hrs(a.hours) : ""}</td>
                <td className="num">{a.kind === "material" ? usd(a.amount, 2) : usd(a.hours * job.shopRate)}</td>
                <td className="caption">{a.note}</td>
                <td><form action={deleteActual.bind(null, job.id, a.id)}><button className="link" type="submit">Remove</button></form></td>
              </tr>
            ))}
            {!actuals.length && <tr><td colSpan={9} className="muted">No actuals yet.</td></tr>}
          </tbody>
        </table>
      </div>
      {actuals.length > 300 && <p className="caption">Showing the latest 300 of {actuals.length}.</p>}
    </>
  );
}
