import { notFound } from "next/navigation";
import { getShopJob, listGcProjects, totalsBySource } from "@/lib/shop/data";
import { updateShopJob, deleteShopJob } from "@/app/shop-actions";
import { JOB_STATUSES } from "@/lib/shop/model";

export default async function ShopJobSettings({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const full = await getShopJob(Number(id));
  if (!full) notFound();
  const { job } = full;
  const gc = await listGcProjects();
  const sources = totalsBySource(full).map((s) => s.source);
  if (!sources.includes(job.basis)) sources.unshift(job.basis);
  const crews = job.crews ?? {};
  return (
    <>
      <form action={updateShopJob.bind(null, job.id)}>
        <h2 className="section">Job</h2>
        <div className="form-grid">
          <label className="f"><span>Job name</span><input name="name" defaultValue={job.name} /></label>
          <label className="f"><span>Client</span><input name="client" defaultValue={job.client} /></label>
          <label className="f"><span>Architect</span><input name="architect" defaultValue={job.architect} /></label>
          <label className="f"><span>Location</span><input name="location" defaultValue={job.location} /></label>
          <label className="f"><span>Status</span>
            <select name="status" defaultValue={job.status}>{JOB_STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}</select>
          </label>
          <label className="f"><span>Year (built or estimated)</span><input name="costYear" type="number" defaultValue={job.costYear ?? ""} /></label>
        </div>

        <h2 className="section">Rates and markup</h2>
        <div className="form-grid">
          <label className="f"><span>Shop rate ($ per person-hour)</span><input name="shopRate" type="number" step="any" defaultValue={job.shopRate} /></label>
          <label className="f"><span>Buffer %</span><input name="bufferPct" type="number" step="any" defaultValue={Math.round(job.bufferPct * 1000) / 10} /></label>
          <label className="f"><span>Tax % (standalone quotes)</span><input name="taxPct" type="number" step="any" defaultValue={Math.round(job.taxPct * 1000) / 10} /></label>
          <label className="f"><span>Install crew size</span><input name="crewInstall" type="number" step="any" defaultValue={crews.install ?? 2} /></label>
          <label className="f"><span>Packaging crew size</span><input name="crewPackaging" type="number" step="any" defaultValue={crews.packaging ?? 2} /></label>
          <label className="f"><span>Transport crew size</span><input name="crewTransport" type="number" step="any" defaultValue={crews.transport ?? 2} /></label>
        </div>
        <p className="caption" style={{ marginTop: 12 }}>
          The buffer covers what shop estimates tend to miss. The Actuals tab shows how much of it each job really used, so the number can come down as the estimates get tighter.
          When the shop builds for a Sparrow GC job, leave tax at 0. The GC estimate adds the fee and tax.
        </p>

        <h2 className="section">Which estimate counts</h2>
        <div className="form-grid">
          <label className="f"><span>Job total comes from</span>
            <select name="basis" defaultValue={job.basis}>{sources.map((s) => <option key={s}>{s}</option>)}</select>
          </label>
          <label className="f"><span>GC project (for Send to GC estimate)</span>
            <select name="gcProjectId" defaultValue={job.gcProjectId ?? ""}>
              <option value="">None</option>
              {gc.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
        </div>

        <h2 className="section">Notes</h2>
        <textarea name="notes" defaultValue={job.notes} />
        <div className="row" style={{ marginTop: 24 }}><button className="btn" type="submit">Save settings</button></div>
      </form>

      <h2 className="section">Delete</h2>
      <form action={deleteShopJob.bind(null, job.id)}>
        <p className="caption">Deletes the job, its lines, actuals and plan files. This can&apos;t be undone.</p>
        <button className="btn line" type="submit">Delete this job</button>
      </form>
    </>
  );
}
