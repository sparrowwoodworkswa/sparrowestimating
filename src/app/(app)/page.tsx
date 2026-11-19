import Link from "next/link";
import { listProjectsWithTotals } from "@/lib/data";
import { STATUSES, statusInfo } from "@/lib/csi";
import { usd, num } from "@/lib/totals";

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const { q = "", status = "" } = await searchParams;
  const all = await listProjectsWithTotals();
  const ql = q.toLowerCase();
  const rows = all.filter(
    (p) =>
      (!status || p.status === status) &&
      (!ql || [p.name, p.client, p.architect, p.city].some((x) => x.toLowerCase().includes(ql))),
  );
  const decided = all.filter((p) => p.status === "won" || p.status === "lost" || p.status === "in_construction" || p.status === "complete");
  const won = decided.filter((p) => p.status !== "lost");
  const pipeline = all.filter((p) => p.status === "proposal_sent");
  const open = all.filter((p) => p.status === "draft" || p.status === "estimating");

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="headline">Projects</h1>
          <p className="muted">Every estimate, proposal and outcome in one place.</p>
        </div>
        <Link href="/projects/new" className="btn">
          <span className="material-symbols-outlined">upload_file</span> Upload plans
        </Link>
      </div>

      <div className="grid cols-4" style={{ marginBottom: 20 }}>
        <div className="card kpi">
          <div className="label">Estimating now</div>
          <div className="value">{open.length}</div>
          <div className="sub">drafts and ROMs in progress</div>
        </div>
        <div className="card kpi">
          <div className="label">Proposals out</div>
          <div className="value">{pipeline.length}</div>
          <div className="sub">{usd(pipeline.reduce((a, p) => a + (p.total ?? 0), 0))} in play</div>
        </div>
        <div className="card kpi">
          <div className="label">Win rate</div>
          <div className="value">{decided.length ? `${Math.round((won.length / decided.length) * 100)}%` : "–"}</div>
          <div className="sub">{won.length} won of {decided.length} decided</div>
        </div>
        <div className="card kpi">
          <div className="label">Won volume</div>
          <div className="value">{usd(won.reduce((a, p) => a + (p.total ?? 0), 0))}</div>
          <div className="sub">contract value</div>
        </div>
      </div>

      <div className="chip-set" style={{ marginBottom: 12 }}>
        <Link href={`/?q=${encodeURIComponent(q)}`} className={`chip${!status ? " selected" : ""}`}>All {all.length}</Link>
        {STATUSES.map((st) => {
          const c = all.filter((p) => p.status === st.value).length;
          if (!c) return null;
          return (
            <Link key={st.value} href={`/?status=${st.value}&q=${encodeURIComponent(q)}`} className={`chip${status === st.value ? " selected" : ""}`}>
              {st.label} {c}
            </Link>
          );
        })}
        {q && <span className="chip accent">Search: {q}</span>}
      </div>

      {rows.length === 0 ? (
        <div className="card empty">
          <span className="material-symbols-outlined">folder_open</span>
          <p>No projects match. Upload a plan set to start your first ROM.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Project</th>
                <th>Architect</th>
                <th>Status</th>
                <th className="n">SF</th>
                <th className="n">ROM total</th>
                <th className="n">$/SF</th>
                <th className="n">Updated</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => {
                const st = statusInfo(p.status);
                return (
                  <tr key={p.id}>
                    <td>
                      <Link className="rowlink" href={`/projects/${p.id}`}>{p.name}</Link>
                      <div className="small muted">{[p.client, p.city].filter(Boolean).join(" · ")}</div>
                    </td>
                    <td className="muted">{p.architect}</td>
                    <td><span className={`chip ${st.tone}`}>{st.label}</span></td>
                    <td className="n">{num(p.totalSf)}</td>
                    <td className="n">
                      {usd(p.total)}
                      {!p.lineCount && p.total ? <div className="small muted">typed total</div> : null}
                    </td>
                    <td className="n">{usd(p.perSf)}</td>
                    <td className="n muted">{new Date(p.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
