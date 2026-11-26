import Link from "next/link";
import { listShopJobs } from "@/lib/shop/data";
import { hrs, pct, statusLabel, usd } from "@/lib/shop/model";

export const metadata = { title: "Shop estimating · Sparrow" };

export default async function ShopHome() {
  const rows = await listShopJobs();
  const open = rows.filter((r) => ["estimating", "bid"].includes(r.job.status));
  const withActuals = rows.filter((r) => r.actual.hours > 0);
  const done = withActuals.filter((r) => r.job.status === "complete" && r.totals.base > 0);
  return (
    <>
      <div className="sw-pagehead">
        <div>
          <h1 className="doc-title">Shop estimating</h1>
          <div className="doc-subtitle">Cabinetry, furniture and millwork. Hours by production step, materials, buffer and actuals.</div>
        </div>
        <Link href="/shop/new" className="btn">New shop job</Link>
      </div>

      <div className="sw-facts">
        <div>
          <div className="label">Open estimates</div>
          <div className="v">{open.length}</div>
          <div className="s">{usd(open.reduce((a, r) => a + r.totals.total, 0))} in shop work</div>
        </div>
        <div>
          <div className="label">Shop hours estimated</div>
          <div className="v">{hrs(open.reduce((a, r) => a + r.totals.personHours, 0))}</div>
          <div className="s">person-hours on open jobs</div>
        </div>
        <div>
          <div className="label">Jobs with timecards</div>
          <div className="v">{withActuals.length}</div>
          <div className="s">feed the production library</div>
        </div>
        <div>
          <div className="label">Buffer used</div>
          <div className="v">
            {done.length ? pct(done.reduce((a, r) => a + Math.max(0, r.actual.total / r.totals.base - 1), 0) / done.length) : "–"}
          </div>
          <div className="s">{done.length ? `average over ${done.length} completed job${done.length === 1 ? "" : "s"}` : "shows once a job with timecards is marked Complete"}</div>
        </div>
      </div>

      <h2 className="section">Jobs</h2>
      <div className="sw-scroll">
        <table>
          <thead>
            <tr>
              <th>Job</th>
              <th>Architect</th>
              <th>Status</th>
              <th className="num">Shop hours</th>
              <th className="num">Labor</th>
              <th className="num">Materials</th>
              <th className="num">Buffer</th>
              <th className="num">Total</th>
              <th className="num">Actual hours</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ job, totals, actual }) => (
              <tr key={job.id}>
                <td>
                  <Link href={`/shop/${job.id}`}>{job.name}</Link>
                  <div className="caption">{job.costYear ?? ""}{job.basis !== "Sparrow estimate" ? ` · priced from ${job.basis}` : ""}</div>
                </td>
                <td>{job.architect}</td>
                <td>{statusLabel(job.status)}</td>
                <td className="num">{hrs(totals.personHours)}</td>
                <td className="num">{usd(totals.labor)}</td>
                <td className="num">{usd(totals.materials)}</td>
                <td className="num">{usd(totals.buffer)}</td>
                <td className="num">{usd(totals.total)}</td>
                <td className="num">{actual.hours ? hrs(actual.hours) : "–"}</td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={9} className="muted">No shop jobs yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
