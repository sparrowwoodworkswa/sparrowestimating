import { getSettings } from "@/lib/data";
import { saveSettings, applyDefaultMarkupsToOpenProjects } from "@/app/actions";
import { SubmitButton } from "@/components/SubmitButton";
import { markupChain, usd } from "@/lib/totals";

export default async function SettingsPage() {
  const s = await getSettings();
  const c = s.company;
  const m = s.markups;
  const ex = markupChain(1_000_000, m);
  return (
    <form action={saveSettings} className="stack" style={{ maxWidth: 980 }}>
      <div className="page-head">
        <div>
          <h1 className="headline">Markups & brand</h1>
          <p className="muted">Company defaults. New projects start with these markups; each project can override them on its estimate.</p>
        </div>
        <SubmitButton icon="save">Save settings</SubmitButton>
      </div>

      <div className="grid cols-2" style={{ alignItems: "start" }}>
        <div className="card stack" style={{ gap: 12 }}>
          <h3 style={{ margin: 0 }}>Overhead, profit and markups</h3>
          <div className="form-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <label className="field"><span>Insurance & WA B&O %</span><input className="input" name="insurancePct" defaultValue={m.insurancePct} /></label>
            <label className="field"><span>Overhead %</span><input className="input" name="overheadPct" defaultValue={m.overheadPct} /></label>
            <label className="field"><span>Contractor fee / profit %</span><input className="input" name="feePct" defaultValue={m.feePct} /></label>
            <label className="field"><span>Contingency %</span><input className="input" name="contingencyPct" defaultValue={m.contingencyPct} /></label>
            <label className="field"><span>Default WA sales tax %</span><input className="input" name="taxPct" defaultValue={m.taxPct} /></label>
          </div>
          <div className="card filled small">
            On {usd(1_000_000)} of direct cost: contingency {usd(ex.contingency)}, insurance {usd(ex.insurance)}, overhead {usd(ex.overhead)}, fee {usd(ex.fee)}, tax {usd(ex.tax)}. Contract total <b>{usd(ex.total)}</b> ({ex.factor.toFixed(3)}x direct).
          </div>
          <button formAction={applyDefaultMarkupsToOpenProjects} className="btn text small" style={{ alignSelf: "flex-start" }}>Apply these to all draft and estimating projects</button>
        </div>

        <div className="card stack" style={{ gap: 12 }}>
          <h3 style={{ margin: 0 }}>Labor rates (burdened $/hr)</h3>
          <div className="form-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
            {Object.entries(s.laborRates).map(([role, rate]) => (
              <label key={role} className="field"><span>{role}</span><input className="input" name={`rate:${role}`} defaultValue={rate} /></label>
            ))}
            <label className="field"><span>New role</span><input className="input" name="newRole" placeholder="e.g. Finish carpenter" /></label>
            <label className="field"><span>Rate</span><input className="input" name="newRate" /></label>
          </div>
          <p className="small muted" style={{ margin: 0 }}>Clear a rate to remove the role.</p>
        </div>

        <div className="card stack" style={{ gap: 12 }}>
          <h3 style={{ margin: 0 }}>Brand kit</h3>
          <div className="row">
            {c.logoFullUrl && <img src={c.logoFullUrl} alt="Full logo" style={{ height: 56, background: "#3d3c38", padding: 6, borderRadius: 8 }} />}
            {c.logoUrl ? <img src={c.logoUrl} alt="Logo" style={{ height: 56, background: "#fff", padding: 6, borderRadius: 8, border: "1px solid var(--md-outline-variant)" }} /> : <span className="chip warn">No logo uploaded yet</span>}
            {c.logoUrl && <label className="check small"><input type="checkbox" name="removeLogo" value="1" /> Remove</label>}
          </div>
          <label className="field"><span>Replace the bird mark (PNG or SVG with a transparent background)</span><input className="input" type="file" name="logo" accept="image/*" style={{ paddingTop: 10 }} /></label>
          <div className="form-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <label className="field"><span>Accent color</span><input className="input" type="color" name="accent" defaultValue={c.colors.accent} style={{ padding: 4 }} /></label>
            <label className="field"><span>Ink color</span><input className="input" type="color" name="ink" defaultValue={c.colors.ink} style={{ padding: 4 }} /></label>
            <label className="field"><span>Band color (proposal cover and cost section)</span><input className="input" type="color" name="band" defaultValue={c.colors.band ?? "#E6E4D8"} style={{ padding: 4 }} /></label>
          </div>
          <label className="field"><span>Company name</span><input className="input" name="name" defaultValue={c.name} /></label>
          <label className="field"><span>Tagline</span><input className="input" name="tagline" defaultValue={c.tagline} /></label>
          <label className="field"><span>Location</span><input className="input" name="location" defaultValue={c.location} /></label>
          <div className="form-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <label className="field"><span>Phone</span><input className="input" name="phone" defaultValue={c.phone} /></label>
            <label className="field"><span>Email</span><input className="input" name="email" defaultValue={c.email} /></label>
          </div>
          <label className="field"><span>Website</span><input className="input" name="website" defaultValue={c.website} /></label>
          <label className="field"><span>Mailing address (proposal footer)</span><input className="input" name="address" defaultValue={c.address ?? ""} /></label>
          <label className="field"><span>Recognition line</span><input className="input" name="recognition" defaultValue={c.recognition} /></label>
        </div>

        <div className="card stack" style={{ gap: 12 }}>
          <h3 style={{ margin: 0 }}>Proposal defaults</h3>
          <label className="field"><span>Owner benefits (one per line: Title | sentence)</span>
            <textarea className="input" name="benefits" defaultValue={(c.benefits ?? []).map((b) => `${b.title} | ${b.body}`).join("\n")} style={{ minHeight: 130 }} />
          </label>
          <label className="field"><span>Film link (YouTube, optional; shows a film section on every proposal)</span><input className="input" name="filmUrl" defaultValue={c.filmUrl ?? ""} placeholder="https://youtu.be/…" /></label>
          <div className="form-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <label className="field"><span>Film headline</span><input className="input" name="filmHeading" defaultValue={c.filmHeading ?? ""} /></label>
            <label className="field"><span>Closing line</span><input className="input" name="closing" defaultValue={c.closing ?? ""} /></label>
          </div>
          <label className="field"><span>Film intro</span><input className="input" name="filmBody" defaultValue={c.filmBody ?? ""} /></label>
          <label className="field"><span>Default exclusions (one per line)</span><textarea className="input" name="defaultExclusions" defaultValue={c.defaultExclusions.join("\n")} style={{ minHeight: 180 }} /></label>
          <p className="small muted" style={{ margin: 0 }}>Team bios and photos are in the database seed ({c.team.length} people). Photos live in <code>public/brand/team</code>.</p>
        </div>
      </div>

      <div className="card stack" style={{ gap: 12 }}>
        <h3 style={{ margin: 0 }}>Estimating standards</h3>
        <p className="small muted" style={{ margin: 0 }}>The rulebook Claude follows on every ROM: how to take off, what Sparrow self-performs, what to always carry, what never to carry.</p>
        <textarea className="input" name="estimatingStandards" defaultValue={s.estimatingStandards} style={{ minHeight: 320, fontSize: 13 }} />
      </div>
    </form>
  );
}
