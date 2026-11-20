"use client";
import { useState, useTransition } from "react";
import { PROPOSAL_SECTIONS, type ProposalContent } from "@/db/schema";
import type { ResolvedProposal } from "@/lib/proposal";
import { saveProposal, uploadProposalAsset, updateProject } from "@/app/actions";
import { usd } from "@/lib/totals";

const img = (k: string) => (k.startsWith("local:") ? `/api/files/${encodeURIComponent(k)}` : k);
type Item = { title: string; body: string };

export function ProposalEditor({ projectId, initial, revision, shareUrl }: { projectId: number; initial: ResolvedProposal; revision: string; shareUrl: string }) {
  const [p, setP] = useState<ResolvedProposal>(initial);
  const [dirty, setDirty] = useState(false);
  const [pending, start] = useTransition();
  const [uploading, setUploading] = useState<string | null>(null);
  const set = <K extends keyof ProposalContent>(k: K, v: ResolvedProposal[K]) => { setP((x) => ({ ...x, [k]: v })); setDirty(true); };
  const save = () => start(async () => { await saveProposal(projectId, p); setDirty(false); });

  const upload = async (slot: string, file: File | undefined, onKey: (k: string) => void) => {
    if (!file) return;
    setUploading(slot);
    const fd = new FormData();
    fd.set("file", file);
    const key = await uploadProposalAsset(fd);
    setUploading(null);
    if (key) onKey(key);
  };

  return (
    <div className="stack">
      <div className="row" style={{ position: "sticky", top: 64, zIndex: 5, background: "var(--md-surface-container-low)", padding: "8px 0" }}>
        <span className="title-m">Edit the proposal</span>
        <span className="small muted">Changes show on the client link after you save.</span>
        <span className="spacer" />
        <form action={updateProject.bind(null, projectId)} className="row" style={{ gap: 6 }}>
          <span className="small muted">Rev</span>
          <input className="input" name="revision" defaultValue={revision} style={{ width: 64, height: 36 }} />
          <button className="btn text small">Set</button>
        </form>
        <a className="btn outlined" href={shareUrl} target="_blank"><span className="material-symbols-outlined">visibility</span> Preview</a>
        <button className="btn" disabled={!dirty || pending} onClick={save}>
          <span className="material-symbols-outlined">save</span>{pending ? "Saving…" : dirty ? "Save changes" : "Saved"}
        </button>
      </div>

      <div className="card">
        <h3>Sections</h3>
        <p className="small muted" style={{ marginTop: 0 }}>Turn off anything you don&apos;t want this client to see. Numbering and the contents list adjust on their own.</p>
        <div className="chip-set">
          {PROPOSAL_SECTIONS.map((s) => {
            const on = !p.hidden.includes(s.key);
            return (
              <button key={s.key} className={`chip ${on ? "accent" : ""}`} style={{ cursor: "pointer", height: 34 }} onClick={() => set("hidden", on ? [...p.hidden, s.key] : p.hidden.filter((h) => h !== s.key))}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{on ? "check" : "visibility_off"}</span>{s.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid cols-2" style={{ alignItems: "start" }}>
        <div className="card stack" style={{ gap: 12 }}>
          <h3 style={{ margin: 0 }}>Cover and welcome letter</h3>
          <label className="field"><span>Lede (one line under the project name)</span><input className="input" value={p.lede} onChange={(e) => set("lede", e.target.value)} /></label>
          <label className="field"><span>Greeting</span><input className="input" value={p.salutation} onChange={(e) => set("salutation", e.target.value)} placeholder="Dear Mike and Megan," /></label>
          <label className="field"><span>Letter, first paragraph</span><textarea className="input" value={p.notePara1} onChange={(e) => set("notePara1", e.target.value)} /></label>
          <label className="field"><span>Letter, second paragraph</span><textarea className="input" value={p.notePara2} onChange={(e) => set("notePara2", e.target.value)} /></label>
          <label className="field"><span>The project (two sentences)</span><textarea className="input" value={p.projectDescription} onChange={(e) => set("projectDescription", e.target.value)} /></label>
          <div className="form-grid">
            <label className="field"><span>Signature element</span><input className="input" value={p.signatureElement} onChange={(e) => set("signatureElement", e.target.value)} /></label>
            <label className="field"><span>What our shop builds</span><input className="input" value={p.shopItems} onChange={(e) => set("shopItems", e.target.value)} /></label>
          </div>
        </div>

        <div className="card stack" style={{ gap: 14 }}>
          <h3 style={{ margin: 0 }}>Images</h3>
          <div className="stack" style={{ gap: 8 }}>
            <div className="label">Hero image (full width under the cover)</div>
            {p.heroImage ? <img src={img(p.heroImage)} alt="" style={{ maxWidth: "100%", maxHeight: 160, objectFit: "cover", borderRadius: 8 }} /> : <span className="chip warn">fill in</span>}
            <div className="row">
              <input type="file" accept="image/*" className="input" style={{ paddingTop: 10, flex: 1 }} onChange={(e) => upload("hero", e.target.files?.[0], (k) => set("heroImage", k))} />
              {p.heroImage && <button className="btn text small" onClick={() => set("heroImage", "")}>Remove</button>}
            </div>
            <input className="input" placeholder="Caption, credit the architect" value={p.heroCaption} onChange={(e) => set("heroCaption", e.target.value)} />
          </div>
          <div className="divider" style={{ margin: "4px 0" }} />
          <div className="label">Gallery (renderings, elevations, site photos)</div>
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
            {[...(p.elevationImage ? [{ src: p.elevationImage, caption: p.elevationCaption, elev: true }] : []), ...p.gallery.map((g) => ({ ...g, elev: false }))].map((g, i) => (
              <div key={g.src + i} className="stack" style={{ gap: 4 }}>
                <img src={img(g.src)} alt="" style={{ width: "100%", aspectRatio: "16/10", objectFit: "cover", borderRadius: 6, background: "#fff" }} />
                <input className="input" style={{ height: 34 }} placeholder="Caption" value={g.caption}
                  onChange={(e) => g.elev ? set("elevationCaption", e.target.value) : set("gallery", p.gallery.map((x) => (x.src === g.src ? { ...x, caption: e.target.value } : x)))} />
                <button className="btn text small" onClick={() => g.elev ? set("elevationImage", "") : set("gallery", p.gallery.filter((x) => x.src !== g.src))}>Remove</button>
              </div>
            ))}
          </div>
          <label className="btn tonal small" style={{ alignSelf: "flex-start" }}>
            <span className="material-symbols-outlined">add_photo_alternate</span>{uploading === "gallery" ? "Uploading…" : "Add images"}
            <input type="file" accept="image/*" multiple hidden onChange={async (e) => { for (const f of Array.from(e.target.files ?? [])) await upload("gallery", f, (k) => setP((x) => { setDirty(true); return { ...x, gallery: [...x.gallery, { src: k, caption: "" }] }; })); }} />
          </label>
          <p className="small muted" style={{ margin: 0 }}>Tip: screenshot a rendering or elevation from the plan PDF and add it here.</p>
          <div className="divider" style={{ margin: "4px 0" }} />
          <label className="field"><span>Film (YouTube link, optional)</span><input className="input" value={p.filmUrl} onChange={(e) => set("filmUrl", e.target.value)} placeholder="https://youtu.be/…" /></label>
        </div>
      </div>

      <div className="grid cols-2" style={{ alignItems: "start" }}>
        <div className="card"><ItemList label="Owner benefits (4 reads best)" items={p.benefits} onChange={(v) => set("benefits", v)} /></div>
        <div className="card stack" style={{ gap: 12 }}>
          <h3 style={{ margin: 0 }}>Pricing notes and exclusions</h3>
          <label className="field"><span>Pricing notes (one per line)</span><textarea className="input" value={p.pricingNotes.join("\n")} onChange={(e) => set("pricingNotes", e.target.value.split("\n"))} /></label>
          <label className="field"><span>Not included (one per line)</span><textarea className="input" style={{ minHeight: 150 }} value={p.exclusions.join("\n")} onChange={(e) => set("exclusions", e.target.value.split("\n"))} /></label>
        </div>
      </div>

      <div className="card stack" style={{ gap: 12 }}>
        <div className="card-head" style={{ margin: 0 }}>
          <h3 style={{ margin: 0 }}>Value options</h3>
          <button className="btn text small" onClick={() => set("valueOptions", [...p.valueOptions, { title: "", description: "", directDelta: 0 }])}><span className="material-symbols-outlined">add</span> Add option</button>
        </div>
        <p className="small muted" style={{ margin: 0 }}>Enter the change in direct cost. The page adds markups and tax, and the client toggles options to see the new total.</p>
        {p.valueOptions.map((o, i) => (
          <div key={i} className="grid" style={{ gridTemplateColumns: "minmax(0,1fr) minmax(0,1.6fr) 140px 40px", alignItems: "start" }}>
            <input className="input" placeholder="Title" value={o.title} onChange={(e) => set("valueOptions", p.valueOptions.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} />
            <textarea className="input" style={{ minHeight: 44 }} placeholder="Description" value={o.description} onChange={(e) => set("valueOptions", p.valueOptions.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)))} />
            <input className="input num" title={usd(o.directDelta)} value={o.directDelta} onChange={(e) => set("valueOptions", p.valueOptions.map((x, j) => (j === i ? { ...x, directDelta: Number(e.target.value) || 0 } : x)))} />
            <button className="icon-btn" onClick={() => set("valueOptions", p.valueOptions.filter((_, j) => j !== i))}><span className="material-symbols-outlined">close</span></button>
          </div>
        ))}
      </div>

      <div className="card stack" style={{ gap: 10 }}>
        <div className="card-head" style={{ margin: 0 }}>
          <h3 style={{ margin: 0 }}>Schedule</h3>
          <button className="btn text small" onClick={() => set("milestones", [...p.milestones, { week: (p.milestones.at(-1)?.week ?? 0) + 4, title: "", detail: "" }])}><span className="material-symbols-outlined">add</span> Add milestone</button>
        </div>
        {p.milestones.map((m, i) => (
          <div key={i} className="grid" style={{ gridTemplateColumns: "90px minmax(0,1fr) minmax(0,2fr) 40px", alignItems: "start", gap: 8 }}>
            <input className="input num" title="Week" value={m.week} onChange={(e) => set("milestones", p.milestones.map((x, j) => (j === i ? { ...x, week: Number(e.target.value) || 0 } : x)))} />
            <input className="input" placeholder="Milestone" value={m.title} onChange={(e) => set("milestones", p.milestones.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} />
            <input className="input" placeholder="What's done by then" value={m.detail ?? ""} onChange={(e) => set("milestones", p.milestones.map((x, j) => (j === i ? { ...x, detail: e.target.value } : x)))} />
            <button className="icon-btn" onClick={() => set("milestones", p.milestones.filter((_, j) => j !== i))}><span className="material-symbols-outlined">close</span></button>
          </div>
        ))}
        <label className="field"><span>Schedule note</span><input className="input" value={p.scheduleNote} onChange={(e) => set("scheduleNote", e.target.value)} /></label>
      </div>

      <div className="grid cols-2" style={{ alignItems: "start" }}>
        <div className="card stack" style={{ gap: 12 }}>
          <h3 style={{ margin: 0 }}>Pre-construction</h3>
          <label className="field"><span>Intro</span><textarea className="input" style={{ minHeight: 60 }} value={p.preconIntro} onChange={(e) => set("preconIntro", e.target.value)} /></label>
          <ItemList label="What you get" items={p.preconDeliverables} onChange={(v) => set("preconDeliverables", v)} titleLabel="Deliverable" />
        </div>
        <div className="card stack" style={{ gap: 12 }}>
          <h3 style={{ margin: 0 }}>Agreement and closing</h3>
          <label className="field"><span>Agreement name</span><input className="input" value={p.agreementLabel} onChange={(e) => set("agreementLabel", e.target.value)} /></label>
          <label className="field"><span>Agreement link (DocuSign, Dropbox Sign, PDF link) or upload a PDF</span>
            <input className="input" value={p.agreementUrl.startsWith("local:") ? "(uploaded PDF)" : p.agreementUrl} onChange={(e) => set("agreementUrl", e.target.value)} placeholder="Leave blank to hide" />
          </label>
          <div className="row">
            <input type="file" accept="application/pdf" className="input" style={{ paddingTop: 10, flex: 1 }} onChange={(e) => upload("agreement", e.target.files?.[0], (k) => set("agreementUrl", k))} />
            {p.agreementUrl && <button className="btn text small" onClick={() => set("agreementUrl", "")}>Remove</button>}
          </div>
          <label className="field"><span>Retainer (blank shows none)</span><input className="input" value={p.retainer} onChange={(e) => set("retainer", e.target.value)} placeholder="" /></label>
          <label className="field"><span>Closing line under &quot;Thank you.&quot;</span><input className="input" value={p.closing} onChange={(e) => set("closing", e.target.value)} /></label>
        </div>
      </div>
    </div>
  );
}

function ItemList({ label, items, onChange, titleLabel = "Title" }: { label: string; items: Item[]; onChange: (v: Item[]) => void; titleLabel?: string }) {
return (
  <div className="stack" style={{ gap: 8 }}>
    <div className="row"><span className="label">{label}</span><span className="spacer" />
      <button className="btn text small" onClick={() => onChange([...items, { title: "", body: "" }])}><span className="material-symbols-outlined">add</span> Add</button>
    </div>
    {items.map((it, i) => (
      <div key={i} className="grid" style={{ gridTemplateColumns: "minmax(0,1fr) minmax(0,1.6fr) 40px", alignItems: "start", gap: 8 }}>
        <input className="input" placeholder={titleLabel} value={it.title} onChange={(e) => onChange(items.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} />
        <textarea className="input" style={{ minHeight: 44 }} value={it.body} onChange={(e) => onChange(items.map((x, j) => (j === i ? { ...x, body: e.target.value } : x)))} />
        <button className="icon-btn" onClick={() => onChange(items.filter((_, j) => j !== i))}><span className="material-symbols-outlined">close</span></button>
      </div>
    ))}
  </div>
);
}
