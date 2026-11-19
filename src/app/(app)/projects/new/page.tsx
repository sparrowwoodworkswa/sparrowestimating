import { createProject } from "@/app/actions";
import { FINISH_LEVELS } from "@/lib/csi";
import { getSettings } from "@/lib/data";
import { Dropzone } from "@/components/Dropzone";
import { SubmitButton } from "@/components/SubmitButton";

export default async function NewProject() {
  const s = await getSettings();
  const hasKey = !!process.env.ANTHROPIC_API_KEY;
  return (
    <form action={createProject} className="stack" style={{ maxWidth: 920 }}>
      <div className="page-head">
        <div>
          <h1 className="headline">New estimate</h1>
          <p className="muted">Drop in the architect&apos;s set. Claude reads every sheet, takes off quantities and builds a full ROM with MEP and site scopes.</p>
        </div>
      </div>

      {!hasKey && (
        <div className="banner warn">
          <span className="material-symbols-outlined">key</span>
          <div>Plan reading is off until <b>ANTHROPIC_API_KEY</b> is set. You can still create the project and upload plans now.</div>
        </div>
      )}

      <div className="card">
        <h3>Plans</h3>
        <Dropzone name="files" />
        <p className="small muted" style={{ marginTop: 8 }}>PDF drawing sets, specs, or images. Up to 600 pages per PDF.</p>
      </div>

      <div className="card">
        <h3>Project</h3>
        <div className="form-grid">
          <label className="field"><span>Project name</span><input className="input" name="name" placeholder="Read from the title block if blank" /></label>
          <label className="field"><span>Client</span><input className="input" name="client" /></label>
          <label className="field"><span>Architect</span><input className="input" name="architect" /></label>
          <label className="field"><span>Site address</span><input className="input" name="address" /></label>
          <label className="field"><span>City</span><input className="input" name="city" placeholder="Bainbridge Island" /></label>
          <label className="field"><span>Gross SF (optional)</span><input className="input" name="totalSf" inputMode="decimal" /></label>
          <label className="field">
            <span>Finish level</span>
            <select className="input" name="finishLevel" defaultValue="mid-high">
              {FINISH_LEVELS.map((f) => <option key={f}>{f}</option>)}
            </select>
          </label>
          <label className="field"><span>WA sales tax % for the site</span><input className="input" name="taxPct" defaultValue={s.markups.taxPct} inputMode="decimal" /></label>
        </div>
        <label className="field" style={{ marginTop: 16 }}>
          <span>Notes for the estimator (owner-supplied items, exclusions, finish basis, anything the plans don&apos;t say)</span>
          <textarea className="input" name="ownerNotes" placeholder="e.g. Owner supplies appliances. Septic by others. Plan on cedar siding, not fiber cement." />
        </label>
      </div>

      <div className="row">
        <label className="check">
          <input type="checkbox" name="start" value="1" defaultChecked={hasKey} disabled={!hasKey} /> Start the ROM as soon as plans upload
        </label>
        <div className="spacer" />
        <SubmitButton icon="auto_awesome">Create project</SubmitButton>
      </div>
    </form>
  );
}
