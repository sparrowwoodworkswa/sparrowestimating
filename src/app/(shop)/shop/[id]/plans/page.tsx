import { notFound } from "next/navigation";
import { getShopJob, totalsBySource } from "@/lib/shop/data";
import { uploadTarget } from "@/lib/upload-target";
import { deleteShopFile } from "@/app/shop-actions";
import { ShopUploader } from "@/components/shop/ShopUploader";
import { TakeoffRunner } from "@/components/shop/TakeoffRunner";
import { hrs, usd } from "@/lib/shop/model";

export default async function ShopPlans({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const full = await getShopJob(Number(id));
  if (!full) notFound();
  const { job, files } = full;
  const hasOwn = full.pieces.some((p) => p.source !== "Claude takeoff");
  const take = totalsBySource(full).find((s) => s.source === "Claude takeoff");
  return (
    <>
      <h2 className="section">Plan files</h2>
      <div className="sw-scroll">
        <table>
          <thead><tr><th>File</th><th className="num">Size</th><th>Uploaded</th><th /></tr></thead>
          <tbody>
            {files.map((f) => (
              <tr key={f.id}>
                <td><a href={f.storageKey.startsWith("http") ? f.storageKey : `/api/files/${encodeURIComponent(f.storageKey)}`} target="_blank" rel="noreferrer">{f.filename}</a></td>
                <td className="num">{(f.sizeBytes / 1024 / 1024).toFixed(1)} MB</td>
                <td>{new Date(f.uploadedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</td>
                <td>
                  <form action={deleteShopFile.bind(null, job.id, f.id)}>
                    <button className="link" type="submit">Remove</button>
                  </form>
                </td>
              </tr>
            ))}
            {!files.length && <tr><td colSpan={4} className="muted">No plans yet.</td></tr>}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: 16 }}>
        <ShopUploader jobId={job.id} target={uploadTarget()} />
      </div>

      <h2 className="section">Claude takeoff</h2>
      <p className="lede">
        Claude reads the drawings, counts every piece the shop would build and prices hours from the production library: actuals first, then
        your past estimates. Materials come from the price book.
      </p>
      <TakeoffRunner
        jobId={job.id}
        initial={{ status: job.takeoffStatus, step: job.takeoffStep, error: job.takeoffError }}
        hasFiles={files.length > 0}
        hasOwn={hasOwn}
      />

      {job.takeoff && (
        <div style={{ marginTop: 32 }}>
          {take && (
            <div className="sw-facts" style={{ marginBottom: 24 }}>
              <div><div className="label">Takeoff hours</div><div className="v">{hrs(take.totals.personHours)}</div></div>
              <div><div className="label">Labor</div><div className="v">{usd(take.totals.labor)}</div></div>
              <div><div className="label">Materials</div><div className="v">{usd(take.totals.materials)}</div></div>
              <div><div className="label">Takeoff total</div><div className="v">{usd(take.totals.total)}</div></div>
            </div>
          )}
          <p className="lede">{job.takeoff.summary}</p>
          <div className="two" style={{ marginTop: 24 }}>
            <div>
              <div className="label" style={{ marginBottom: 8 }}>Questions to confirm</div>
              <ul className="dash">{job.takeoff.questions.map((q, i) => <li key={i}>{q}</li>)}</ul>
              <div className="label" style={{ margin: "20px 0 8px" }}>Sheets reviewed</div>
              <ul className="dash">{job.takeoff.sheets.map((q, i) => <li key={i}>{q}</li>)}</ul>
            </div>
            <div>
              <div className="label" style={{ marginBottom: 8 }}>On the drawings, not shop scope</div>
              <ul className="dash">{job.takeoff.outOfScope.map((q, i) => <li key={i}>{q}</li>)}</ul>
            </div>
          </div>
          <p className="caption">The takeoff lines are on the Estimate tab under &quot;Claude takeoff&quot;.</p>
        </div>
      )}
    </>
  );
}
