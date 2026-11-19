import Link from "next/link";
import { getDb, schema } from "@/db";
import { listProjectsWithTotals } from "@/lib/data";
import { statusInfo } from "@/lib/csi";
import { usd } from "@/lib/totals";

export default async function InsightsPage() {
  const projects = await listProjectsWithTotals();
  const db = await getDb();
  const pkgs = await db.select().from(schema.tradePackages);

  const decided = projects.filter((p) => ["won", "lost", "in_construction", "complete"].includes(p.status));
  const won = decided.filter((p) => p.status !== "lost");
  const lost = decided.filter((p) => p.status === "lost");
  const avg = (xs: (number | null)[]) => {
    const v = xs.filter((x): x is number => x != null);
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
  };

  // Estimate accuracy: ROM vs actual
  const actuals = projects.filter((p) => p.actualCost && p.total);
  // Lost-to price gap
  const gaps = lost.filter((p) => p.competitorPrice && p.total).map((p) => ({ p, gap: (p.total! - p.competitorPrice!) / p.competitorPrice! }));

  // Bid vs ROM by trade across all projects
  const byTrade = new Map<string, { rom: number; bid: number; n: number }>();
  for (const x of pkgs.filter((x) => x.bidAmount != null && x.estimatedPrice > 0)) {
    const key = x.trade.replace(/ \/.*$/, "");
    const cur = byTrade.get(key) ?? { rom: 0, bid: 0, n: 0 };
    byTrade.set(key, { rom: cur.rom + x.estimatedPrice, bid: cur.bid + x.bidAmount!, n: cur.n + 1 });
  }

  const finishGroups = ["builder", "mid", "mid-high", "high"].map((f) => {
    const ps = projects.filter((p) => p.finishLevel === f && p.perSf);
    return { f, n: ps.length, perSf: avg(ps.map((p) => p.perSf)) };
  });
  const maxPsf = Math.max(1, ...finishGroups.map((g) => g.perSf ?? 0));

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="headline">Win / loss insights</h1>
          <p className="muted">How our ROMs compare with what we win, what we lose to, and what jobs really cost.</p>
        </div>
      </div>

      <div className="grid cols-4" style={{ marginBottom: 16 }}>
        <div className="card kpi"><div className="label">Win rate</div><div className="value">{decided.length ? `${Math.round((won.length / decided.length) * 100)}%` : "–"}</div><div className="sub">{won.length} won · {lost.length} lost</div></div>
        <div className="card kpi"><div className="label">Avg $/SF, won</div><div className="value">{usd(avg(won.map((p) => p.perSf)))}</div><div className="sub">contract incl. tax</div></div>
        <div className="card kpi"><div className="label">Avg $/SF, lost</div><div className="value">{usd(avg(lost.map((p) => p.perSf)))}</div><div className="sub">contract incl. tax</div></div>
        <div className="card kpi"><div className="label">Actual vs estimate</div><div className="value">{actuals.length ? `${avg(actuals.map((p) => (p.actualCost! - p.total!) / p.total!))! >= 0 ? "+" : ""}${Math.round(avg(actuals.map((p) => (p.actualCost! - p.total!) / p.total!))! * 100)}%` : "–"}</div><div className="sub">{actuals.length} completed jobs, nominal $</div></div>
      </div>

      <div className="grid cols-2" style={{ alignItems: "start" }}>
        <div className="card">
          <h3>Estimate accuracy on built jobs</h3>
          {actuals.length === 0 ? <p className="muted small">Enter actual costs on the Outcome tab of finished jobs.</p> : (
            <table className="data">
              <thead><tr><th>Project</th><th className="n">Estimate</th><th className="n">Actual</th><th className="n">Diff</th></tr></thead>
              <tbody>
                {actuals.map((p) => {
                  const d = (p.actualCost! - p.total!) / p.total!;
                  return (
                    <tr key={p.id}>
                      <td><Link href={`/projects/${p.id}/outcome`}>{p.name}</Link></td>
                      <td className="n">{usd(p.total)}</td><td className="n">{usd(p.actualCost)}</td>
                      <td className="n" style={{ color: d > 0 ? "var(--md-error)" : "var(--md-good)" }}>{d > 0 ? "+" : ""}{Math.round(d * 100)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="card">
          <h3>Sub bids vs our ROM, by trade</h3>
          {byTrade.size === 0 ? <p className="muted small">Enter bids on trade packages to see where the ROM runs high or low.</p> : (
            <table className="data">
              <thead><tr><th>Trade</th><th className="n">Bids</th><th className="n">ROM</th><th className="n">Bids total</th><th className="n">Diff</th></tr></thead>
              <tbody>
                {[...byTrade.entries()].map(([t, v]) => {
                  const d = (v.bid - v.rom) / v.rom;
                  return <tr key={t}><td>{t}</td><td className="n">{v.n}</td><td className="n">{usd(v.rom)}</td><td className="n">{usd(v.bid)}</td><td className="n" style={{ color: d > 0 ? "var(--md-error)" : "var(--md-good)" }}>{d > 0 ? "+" : ""}{Math.round(d * 100)}%</td></tr>;
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="card">
          <h3>What we lost to</h3>
          {gaps.length === 0 ? <p className="muted small">When you lose a job, enter the winning number on its Outcome tab.</p> : (
            <ul className="list">
              {gaps.map(({ p, gap }) => (
                <li key={p.id} className="row">
                  <Link href={`/projects/${p.id}/outcome`} style={{ flex: 1 }}>{p.name}</Link>
                  <span className="small muted">ours {usd(p.total)} vs {usd(p.competitorPrice)}</span>
                  <span className="chip bad">{gap > 0 ? "+" : ""}{Math.round(gap * 100)}%</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card">
          <h3>Contract $/SF by finish level</h3>
          {finishGroups.map((g) => (
            <div key={g.f} className="row" style={{ flexWrap: "nowrap", padding: "6px 0" }}>
              <span style={{ width: 90 }}>{g.f}</span>
              <div className="bar-track" style={{ flex: 1 }}><div className="bar-fill" style={{ width: `${((g.perSf ?? 0) / maxPsf) * 100}%` }} /></div>
              <span className="num small" style={{ width: 110, textAlign: "right" }}>{g.perSf ? `${usd(g.perSf)}/SF` : "–"} <span className="muted">({g.n})</span></span>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3>All projects</h3>
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>Project</th><th>Status</th><th>Finish</th><th className="n">SF</th><th className="n">ROM</th><th className="n">$/SF</th><th className="n">Competing</th><th className="n">Actual</th></tr></thead>
            <tbody>
              {projects.map((p) => {
                const st = statusInfo(p.status);
                return (
                  <tr key={p.id}>
                    <td><Link href={`/projects/${p.id}`}>{p.name}</Link></td>
                    <td><span className={`chip ${st.tone}`}>{st.label}</span></td>
                    <td>{p.finishLevel}</td>
                    <td className="n">{p.totalSf?.toLocaleString() ?? "–"}</td>
                    <td className="n">{usd(p.total)}</td>
                    <td className="n">{usd(p.perSf)}</td>
                    <td className="n">{usd(p.competitorPrice)}</td>
                    <td className="n">{usd(p.actualCost)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
