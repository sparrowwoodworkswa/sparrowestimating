import { getLatestRun, getPlanFiles, getProject, getLines, getSettings } from "@/lib/data";
import { startEstimate, deletePlanFile, updateProject } from "@/app/actions";
import { RunPanel } from "@/components/RunPanel";
import { UploadMore } from "@/components/UploadMore";
import { SubmitButton } from "@/components/SubmitButton";
import { FINISH_LEVELS, STATUSES } from "@/lib/csi";
import { num } from "@/lib/totals";

export default async function ProjectOverview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = (await getProject(Number(id)))!;
  const [files, run, lines, settings] = await Promise.all([getPlanFiles(p.id), getLatestRun(p.id), getLines(p.id), getSettings()]);
  const a = p.analysis;
  const hasKey = !!process.env.ANTHROPIC_API_KEY;

  return (
    <div className="grid" style={{ gridTemplateColumns: "minmax(0, 1fr) minmax(280px, 360px)", alignItems: "start" }}>
      <div className="stack">
        <div className="card">
          <div className="card-head">
            <h3>Build the ROM from the plans</h3>
          </div>
          <p className="muted" style={{ marginTop: 0 }}>
            Claude reads the full set, takes off shared quantities, then prices nine work packages in parallel: general requirements,
            site and grading, concrete, structure, envelope, finishes, plumbing, HVAC and electrical. It writes a bid-ready scope and
            material list for every sub trade, then drafts the proposal. Expect 5 to 15 minutes.
          </p>
          {!hasKey && (
            <div className="banner warn" style={{ marginBottom: 12 }}>
              <span className="material-symbols-outlined">key</span>
              <div>Set <b>ANTHROPIC_API_KEY</b> in the environment to turn on plan reading.</div>
            </div>
          )}
          <RunPanel
            projectId={p.id}
            initial={run}
            start={startEstimate}
            label={lines.some((l) => l.source === "ai") ? "Re-run ROM from plans" : "Build ROM from plans"}
            confirmText={lines.some((l) => l.source === "ai") ? "This replaces the AI-generated lines and trade packages. Lines you added by hand are kept. Continue?" : undefined}
            disabled={!files.length || !hasKey}
          />
        </div>

        {a ? (
          <>
            <div className="card">
              <h3>What Claude read</h3>
              <p style={{ marginTop: 0 }}>{a.summary}</p>
              <div className="grid cols-4">
                <div><div className="label">Building</div><div>{a.buildingType}</div></div>
                <div><div className="label">Stories</div><div>{a.stories ?? "–"}</div></div>
                <div><div className="label">Gross / conditioned SF</div><div className="num">{num(a.totalSf)} / {num(a.conditionedSf)}</div></div>
                <div><div className="label">Schedule</div><div>{a.scheduleWeeks ? `${a.scheduleWeeks} weeks` : "–"}</div></div>
              </div>
            </div>

            {a.conflicts.length > 0 && (
              <div className="card">
                <div className="card-head">
                  <h3>What we caught in the drawings</h3>
                  <span className="chip warn">{a.conflicts.length} items</span>
                </div>
                <ul className="list">
                  {a.conflicts.map((c, i) => (
                    <li key={i}>
                      <div>{c.issue}</div>
                      <div className="small muted">{c.impact} · Priced: {c.assumption}</div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {a.quantities.length > 0 && (
              <details className="panel" open>
                <summary>
                  <span className="material-symbols-outlined">straighten</span> Shared takeoff quantities
                  <span className="chip neutral">{a.quantities.length}</span>
                  <span className="material-symbols-outlined chev">expand_more</span>
                </summary>
                <div className="body">
                  <div className="table-wrap">
                    <table className="data">
                      <thead><tr><th>Quantity</th><th className="n">Value</th><th>Unit</th><th>Basis</th></tr></thead>
                      <tbody>
                        {a.quantities.map((q, i) => (
                          <tr key={i}><td>{q.name}</td><td className="n">{num(q.value, 1)}</td><td>{q.unit}</td><td className="muted small">{q.basis}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </details>
            )}

            {a.systems.length > 0 && (
              <details className="panel">
                <summary>
                  <span className="material-symbols-outlined">layers</span> Building systems
                  <span className="material-symbols-outlined chev">expand_more</span>
                </summary>
                <div className="body">
                  <ul className="list">{a.systems.map((s, i) => <li key={i}><b>{s.system}.</b> {s.description}</li>)}</ul>
                </div>
              </details>
            )}

            {(a.missingInfo.length > 0 || a.sheets.length > 0) && (
              <details className="panel">
                <summary>
                  <span className="material-symbols-outlined">menu_book</span> Sheet index and missing information
                  <span className="material-symbols-outlined chev">expand_more</span>
                </summary>
                <div className="body">
                  {a.missingInfo.length > 0 && (
                    <>
                      <div className="label" style={{ marginBottom: 6 }}>Missing (forces allowances)</div>
                      <div className="chip-set" style={{ marginBottom: 16 }}>{a.missingInfo.map((m) => <span key={m} className="chip warn">{m}</span>)}</div>
                    </>
                  )}
                  <div className="grid cols-3">{a.sheets.map((s) => <div key={s.number} className="small"><b>{s.number}</b> {s.title}</div>)}</div>
                </div>
              </details>
            )}
          </>
        ) : (
          <div className="card empty">
            <span className="material-symbols-outlined">architecture</span>
            <p>Upload the plan set and build the ROM. The takeoff, drawing conflicts and building systems show up here.</p>
          </div>
        )}
      </div>

      <div className="stack">
        <div className="card">
          <h3>Plan files</h3>
          {files.length === 0 && <p className="muted small">No plans yet.</p>}
          <ul className="list">
            {files.map((f) => (
              <li key={f.id} className="row" style={{ flexWrap: "nowrap" }}>
                <span className="material-symbols-outlined" style={{ color: "var(--md-primary)" }}>{f.kind === "image" ? "image" : "picture_as_pdf"}</span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <a href={f.storageKey.startsWith("local:") ? `/api/files/${encodeURIComponent(f.storageKey)}` : f.storageKey} target="_blank" style={{ wordBreak: "break-all" }}>{f.filename}</a>
                  <div className="small muted">{(f.sizeBytes / 1024 / 1024).toFixed(1)} MB{f.anthropicFileId ? " · read by Claude" : ""}</div>
                </div>
                <form action={deletePlanFile.bind(null, p.id, f.id)}>
                  <button className="icon-btn small" title="Remove"><span className="material-symbols-outlined">delete</span></button>
                </form>
              </li>
            ))}
          </ul>
          <UploadMore projectId={p.id} blobEnabled={!!process.env.BLOB_READ_WRITE_TOKEN} />
        </div>

        <form action={updateProject.bind(null, p.id)} className="card stack" style={{ gap: 12 }}>
          <h3 style={{ margin: 0 }}>Project details</h3>
          <label className="field"><span>Name</span><input className="input" name="name" defaultValue={p.name} /></label>
          <label className="field"><span>Client</span><input className="input" name="client" defaultValue={p.client} /></label>
          <label className="field"><span>Architect</span><input className="input" name="architect" defaultValue={p.architect} /></label>
          <label className="field"><span>Structural</span><input className="input" name="structural" defaultValue={p.structural} /></label>
          <label className="field"><span>Address</span><input className="input" name="address" defaultValue={p.address} /></label>
          <label className="field"><span>City</span><input className="input" name="city" defaultValue={p.city} /></label>
          <label className="field"><span>Design stage</span><input className="input" name="designStage" defaultValue={p.designStage} /></label>
          <div className="form-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <label className="field"><span>Also known as</span><input className="input" name="alias" defaultValue={p.alias} placeholder="e.g. Goth Mansion" /></label>
            <label className="field"><span>Cost year</span><input className="input" name="costYear" defaultValue={p.costYear ?? ""} placeholder="Year estimated or built" /></label>
          </div>
          <label className="field"><span>Superintendent</span>
            <select className="input" name="superintendent" defaultValue={p.superintendent}>
              <option value="">Not assigned yet</option>
              {settings.company.team.filter((m) => m.superintendent).map((m) => <option key={m.name}>{m.name}</option>)}
            </select>
          </label>
          <div className="form-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <label className="field"><span>Gross SF</span><input className="input" name="totalSf" defaultValue={p.totalSf ?? ""} /></label>
            <label className="field"><span>Conditioned SF</span><input className="input" name="conditionedSf" defaultValue={p.conditionedSf ?? ""} /></label>
          </div>
          <div className="form-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <label className="field"><span>Finish</span>
              <select className="input" name="finishLevel" defaultValue={p.finishLevel}>{FINISH_LEVELS.map((f) => <option key={f}>{f}</option>)}</select>
            </label>
            <label className="field"><span>Status</span>
              <select className="input" name="status" defaultValue={p.status}>{STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select>
            </label>
          </div>
          <label className="field"><span>Notes for the estimator</span><textarea className="input" name="ownerNotes" defaultValue={p.ownerNotes} /></label>
          <SubmitButton className="btn tonal" icon="save">Save details</SubmitButton>
        </form>
      </div>
    </div>
  );
}
