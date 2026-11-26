import Link from "next/link";
import { getLibrary, getTaskFactors } from "@/lib/shop/data";
import { PIECE_TASKS, hrs, pct, taskLabel } from "@/lib/shop/model";

export const metadata = { title: "Production library · Sparrow shop" };

export default async function LibraryPage() {
  const [lib, factors] = await Promise.all([getLibrary(), getTaskFactors()]);
  return (
    <>
      <h1 className="doc-title">Production library</h1>
      <div className="doc-subtitle">Hours per unit for every piece type the shop has priced or built. Claude starts every takeoff here.</div>
      <p className="lede" style={{ marginTop: 24 }}>
        Rate priority: Actual, then Sparrow estimate, then Claude takeoff. Hours don&apos;t inflate, so they compare across years as-is. Dollars come from
        the current shop rate. Once a job has timecards, its actual-to-estimate factor shows beside its samples.
      </p>

      <h2 className="section">Actual vs estimate, by job</h2>
      {factors.length ? (
        <div className="sw-scroll">
          <table>
            <thead>
              <tr>
                <th>Job</th>
                <th className="num">Overall</th>
                <th className="num">Buffer used</th>
                {PIECE_TASKS.map((t) => <th key={t.key} className="num">{t.label.replace(" / assembly", "")}</th>)}
              </tr>
            </thead>
            <tbody>
              {factors.map((f) => (
                <tr key={f.jobId}>
                  <td><Link href={`/shop/${f.jobId}/actuals`}>{f.jobName}</Link> <span className="caption">{f.year ?? ""}</span></td>
                  <td className="num">{f.overall ? `${f.overall.toFixed(2)}x` : "–"}</td>
                  <td className="num">{f.bufferUsed == null ? "–" : pct(f.bufferUsed)}</td>
                  {PIECE_TASKS.map((t) => <td key={t.key} className="num">{f.byTask[t.key] ? `${f.byTask[t.key].toFixed(2)}x` : ""}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="muted">No jobs with timecards yet. Import timecards on a job&apos;s Actuals tab and they show up here.</p>
      )}

      <h2 className="section">Piece types</h2>
      <div className="sw-scroll">
        <table>
          <thead>
            <tr>
              <th>Piece type</th>
              <th>Job</th>
              <th>Source</th>
              <th className="num">Qty</th>
              {PIECE_TASKS.map((t) => <th key={t.key} className="num" title={t.hint}>{t.label.replace(" / assembly", "")}</th>)}
              <th className="num">Crew-h per unit</th>
              <th className="num">Job actual / est</th>
            </tr>
          </thead>
          <tbody>
            {lib.map((e) =>
              e.samples.map((s, i) => (
                <tr key={`${e.pieceType}-${e.unit}-${s.jobId}-${i}`}>
                  <td>{i === 0 ? <><span className="subhead">{e.pieceType}</span> <span className="caption">per {e.unit}</span></> : ""}</td>
                  <td><Link href={`/shop/${s.jobId}`}>{s.jobName}</Link> <span className="caption">{s.year ?? ""}</span></td>
                  <td>{s.source}</td>
                  <td className="num">{hrs(s.qty)}</td>
                  {PIECE_TASKS.map((t) => <td key={t.key} className="num">{s.perUnit[t.key] ? hrs(s.perUnit[t.key]) : ""}</td>)}
                  <td className="num">{hrs(s.total)}</td>
                  <td className="num">{s.actualFactor ? `${s.actualFactor.toFixed(2)}x` : ""}</td>
                </tr>
              )),
            )}
          </tbody>
        </table>
      </div>
      <p className="caption" style={{ marginTop: 8 }}>Steps: {PIECE_TASKS.map((t) => `${taskLabel(t.key)} (${t.hint.toLowerCase()})`).join("; ")}.</p>
    </>
  );
}
