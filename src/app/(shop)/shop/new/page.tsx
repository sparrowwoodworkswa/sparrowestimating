import { createShopJob } from "@/app/shop-actions";
import { CURRENT_YEAR } from "@/lib/escalation";

export default function NewShopJob() {
  return (
    <>
      <h1 className="doc-title">New shop job</h1>
      <div className="doc-subtitle">Start the estimate here, then add pieces by hand or upload plans for a Claude takeoff.</div>
      <form action={createShopJob} style={{ marginTop: 40 }}>
        <div className="form-grid">
          <label className="f"><span>Job name</span><input name="name" required placeholder="e.g. Civility bar" /></label>
          <label className="f"><span>Client</span><input name="client" /></label>
          <label className="f"><span>Architect</span><input name="architect" /></label>
          <label className="f"><span>Location</span><input name="location" /></label>
          <label className="f"><span>Year</span><input name="costYear" type="number" defaultValue={CURRENT_YEAR} /></label>
          <label className="f"><span>Shop rate ($ per person-hour)</span><input name="shopRate" type="number" step="any" defaultValue={105} /></label>
          <label className="f"><span>Buffer %</span><input name="bufferPct" type="number" step="any" defaultValue={30} /></label>
          <label className="f"><span>Tax % (standalone shop quotes only)</span><input name="taxPct" type="number" step="any" defaultValue={0} /></label>
        </div>
        <label className="f" style={{ marginTop: 20 }}><span>Notes</span><textarea name="notes" placeholder="Scope notes, what's excluded, who it's for" /></label>
        <div className="row" style={{ marginTop: 28 }}>
          <button className="btn" type="submit">Create job</button>
        </div>
      </form>
    </>
  );
}
