"use client";
import { useState, useTransition } from "react";
import type { ProposalContent } from "@/db/schema";
import { saveProposal, uploadProposalImage, updateProject } from "@/app/actions";
import { usd } from "@/lib/totals";

export function ProposalEditor({ projectId, initial, revision }: { projectId: number; initial: ProposalContent; revision: string }) {
  const [p, setP] = useState(initial);
  const [dirty, setDirty] = useState(false);
  const [pending, start] = useTransition();
  const set = <K extends keyof ProposalContent>(k: K, v: ProposalContent[K]) => { setP((x) => ({ ...x, [k]: v })); setDirty(true); };
  const save = () => start(async () => { await saveProposal(projectId, p); setDirty(false); });
  const img = (k: string) => (k.startsWith("local:") ? `/api/files/${encodeURIComponent(k)}` : k);

  return (
    <div className="stack">
      <div className="row" style={{ position: "sticky", top: 64, zIndex: 5, background: "var(--md-surface-container-low)", padding: "8px 0" }}>
        <span className="title-m">Proposal content</span>
        <span className="spacer" />
        <form action={updateProject.bind(null, projectId)} className="row" style={{ gap: 6 }}>
          <span className="small muted">Rev</span>
          <input className="input" name="revision" defaultValue={revision} style={{ width: 64, height: 36 }} />
          <button className="btn text small">Set</button>
        </form>
        <button className="btn" disabled={!dirty || pending} onClick={save}>
          <span className="material-symbols-outlined">save</span>{pending ? "Saving…" : dirty ? "Save changes" : "Saved"}
        </button>
      </div>

      <div className="grid cols-2" style={{ alignItems: "start" }}>
        <div className="card stack" style={{ gap: 12 }}>
          <h3 style={{ margin: 0 }}>Cover and note</h3>
          <label className="field"><span>Lede (one line under the project name)</span><input className="input" value={p.lede} onChange={(e) => set("lede", e.target.value)} /></label>
          <label className="field"><span>Note from Mike, first paragraph</span><textarea className="input" value={p.notePara1} onChange={(e) => set("notePara1", e.target.value)} /></label>
          <label className="field"><span>The project (two sentences)</span><textarea className="input" value={p.projectDescription} onChange={(e) => set("projectDescription", e.target.value)} /></label>
          <div className="form-grid">
            <label className="field"><span>Signature element</span><input className="input" value={p.signatureElement} onChange={(e) => set("signatureElement", e.target.value)} /></label>
            <label className="field"><span>What our shop builds</span><input className="input" value={p.shopItems} onChange={(e) => set("shopItems", e.target.value)} /></label>
          </div>
        </div>

        <div className="card stack" style={{ gap: 12 }}>
          <h3 style={{ margin: 0 }}>Drawings</h3>
          {(["heroImage", "elevationImage"] as const).map((slot) => (
            <div key={slot} className="stack" style={{ gap: 8 }}>
              <div className="label">{slot === "heroImage" ? "Hero drawing (rendering or section perspective)" : "Elevation"}</div>
              {p[slot] ? <img src={img(p[slot])} alt="" style={{ maxWidth: "100%", maxHeight: 180, objectFit: "contain", border: "1px solid var(--md-outline-variant)", borderRadius: 8, background: "#fff" }} /> : <span className="chip warn">fill in</span>}
              <form action={uploadProposalImage.bind(null, projectId, slot)} className="row">
                <input type="file" name="file" accept="image/*" className="input" style={{ paddingTop: 10, flex: 1 }} />
                <button className="btn tonal small">Upload</button>
              </form>
              <input className="input" placeholder="Caption, credit the architect" value={slot === "heroImage" ? p.heroCaption : p.elevationCaption} onChange={(e) => set(slot === "heroImage" ? "heroCaption" : "elevationCaption", e.target.value)} />
            </div>
          ))}
          <p className="small muted" style={{ margin: 0 }}>Tip: screenshot a sheet from the plan PDF and upload it here.</p>
        </div>
      </div>

      <div className="card stack" style={{ gap: 12 }}>
        <div className="card-head" style={{ margin: 0 }}>
          <h3 style={{ margin: 0 }}>Value options</h3>
          <button className="btn text small" onClick={() => set("valueOptions", [...p.valueOptions, { title: "", description: "", directDelta: 0 }])}><span className="material-symbols-outlined">add</span> Add option</button>
        </div>
        <p className="small muted" style={{ margin: 0 }}>Direct-cost change. The proposal adds markups and tax, and the client can toggle each option to see the new total.</p>
        {p.valueOptions.map((o, i) => (
          <div key={i} className="grid" style={{ gridTemplateColumns: "minmax(0,1fr) minmax(0,1.6fr) 140px 40px", alignItems: "start" }}>
            <input className="input" placeholder="Title" value={o.title} onChange={(e) => set("valueOptions", p.valueOptions.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} />
            <textarea className="input" style={{ minHeight: 44 }} placeholder="Description" value={o.description} onChange={(e) => set("valueOptions", p.valueOptions.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)))} />
            <input className="input num" title={usd(o.directDelta)} value={o.directDelta} onChange={(e) => set("valueOptions", p.valueOptions.map((x, j) => (j === i ? { ...x, directDelta: Number(e.target.value) || 0 } : x)))} />
            <button className="icon-btn" onClick={() => set("valueOptions", p.valueOptions.filter((_, j) => j !== i))}><span className="material-symbols-outlined">close</span></button>
          </div>
        ))}
      </div>

      <div className="grid cols-2" style={{ alignItems: "start" }}>
        <div className="card stack" style={{ gap: 12 }}>
          <h3 style={{ margin: 0 }}>Schedule</h3>
          {p.milestones.map((m, i) => (
            <div key={i} className="row" style={{ flexWrap: "nowrap" }}>
              <span className="small muted">Week</span>
              <input className="input num" style={{ width: 70 }} value={m.week} onChange={(e) => set("milestones", p.milestones.map((x, j) => (j === i ? { ...x, week: Number(e.target.value) || 0 } : x)))} />
              <input className="input" value={m.title} onChange={(e) => set("milestones", p.milestones.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} />
            </div>
          ))}
          <label className="field"><span>Schedule note</span><input className="input" value={p.scheduleNote} onChange={(e) => set("scheduleNote", e.target.value)} /></label>
        </div>
        <div className="card stack" style={{ gap: 12 }}>
          <h3 style={{ margin: 0 }}>Pricing notes and exclusions</h3>
          <label className="field"><span>Pricing notes (one per line)</span><textarea className="input" value={p.pricingNotes.join("\n")} onChange={(e) => set("pricingNotes", e.target.value.split("\n"))} /></label>
          <label className="field"><span>Not included (one per line)</span><textarea className="input" style={{ minHeight: 160 }} value={p.exclusions.join("\n")} onChange={(e) => set("exclusions", e.target.value.split("\n"))} /></label>
        </div>
      </div>
    </div>
  );
}
