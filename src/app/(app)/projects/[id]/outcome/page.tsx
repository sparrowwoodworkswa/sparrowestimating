import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { getLatestRun, getLines, getPackages, getProject } from "@/lib/data";
import { updateProject, startLearn, deleteProject } from "@/app/actions";
import { SubmitButton } from "@/components/SubmitButton";
import { RunPanel } from "@/components/RunPanel";
import { computeTotals, lineParts, usd } from "@/lib/totals";

export default async function OutcomePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = (await getProject(Number(id)))!;
  const db = await getDb();
  const [lines, pkgs, run, learned, events] = await Promise.all([
    getLines(p.id),
    getPackages(p.id),
    getLatestRun(p.id),
    db.select().from(schema.lessons).where(eq(schema.lessons.projectId, p.id)),
    db.select().from(schema.proposalEvents).where(eq(schema.proposalEvents.projectId, p.id)).orderBy(desc(schema.proposalEvents.id)).limit(30),
  ]);
  const t = computeTotals(lines, p.markups);
  const rom = lines.length ? t.total : p.contractTotalOverride;
  const edited = lines.filter((l) => l.source === "ai" && l.aiOriginal && Math.abs(lineParts({ ...l, ...(l.aiOriginal as object) }).total - lineParts(l).total) > 1).length;
  const bids = pkgs.filter((x) => x.bidAmount != null).length;
  const save = updateProject.bind(null, p.id);
  const views = events.filter((e) => e.kind === "viewed").length;

  return (
    <div className="grid" style={{ gridTemplateColumns: "minmax(0, 1fr) minmax(280px, 380px)", alignItems: "start" }}>
      <div className="stack">
        <form action={save} className="card stack" style={{ gap: 14 }}>
          <h3 style={{ margin: 0 }}>Did we win it?</h3>
          <div className="chip-set">
            {[["proposal_sent", "Waiting to hear"], ["won", "We won"], ["lost", "We lost"], ["in_construction", "In construction"], ["complete", "Complete"]].map(([v, label]) => (
              <label key={v} className="check chip" style={{ height: 36, padding: "0 14px" }}>
                <input type="radio" name="status" value={v} defaultChecked={p.status === v} /> {label}
              </label>
            ))}
          </div>
          <div className="form-grid">
            <label className="field"><span>Our ROM (contract total)</span><input className="input" disabled value={usd(rom)} /></label>
            <label className="field"><span>Winning or competing bid, if known</span><input className="input" name="competitorPrice" defaultValue={p.competitorPrice ?? ""} inputMode="decimal" placeholder="$" /></label>
            <label className="field"><span>Actual final cost (after construction)</span><input className="input" name="actualCost" defaultValue={p.actualCost ?? ""} inputMode="decimal" placeholder="$" /></label>
          </div>
          {p.competitorPrice && rom ? (
            <div className={`banner ${p.competitorPrice < rom ? "warn" : "good"}`}>
              <span className="material-symbols-outlined">compare_arrows</span>
              <div>Our ROM was {usd(Math.abs(rom - p.competitorPrice))} ({Math.round((Math.abs(rom - p.competitorPrice) / p.competitorPrice) * 100)}%) {rom > p.competitorPrice ? "above" : "below"} the competing number.</div>
            </div>
          ) : null}
          <label className="field"><span>Why we won or lost, client feedback, what the real costs were</span>
            <textarea className="input" name="outcomeNotes" defaultValue={p.outcomeNotes} style={{ minHeight: 120 }} placeholder="e.g. Client chose a builder at $612K. Said our site work and GC were high. Framing came in under our number." />
          </label>
          <div className="row"><SubmitButton icon="save">Save outcome</SubmitButton></div>
        </form>

        <div className="card">
          <div className="card-head">
            <h3>Teach the estimator</h3>
            {p.learnedAt && <span className="chip good">Learned {new Date(p.learnedAt).toLocaleDateString()}</span>}
          </div>
          <p className="muted" style={{ marginTop: 0 }}>
            Claude compares its first ROM with your edits ({edited} lines changed), the sub bids that came in ({bids} of {pkgs.length}),
            the outcome and the actual cost. It writes lessons and catalog prices for you to approve. Approved lessons go into every future ROM.
          </p>
          <RunPanel projectId={p.id} initial={run} kind="learn" start={startLearn} label="Learn from this project" icon="school" disabled={!process.env.ANTHROPIC_API_KEY} />
          {learned.length > 0 && (
            <>
              <div className="divider" />
              <div className="label" style={{ marginBottom: 8 }}>From this project</div>
              <ul className="list">
                {learned.map((l) => (
                  <li key={l.id}>
                    <div className="row" style={{ gap: 8 }}><span className={`chip ${l.status === "active" ? "good" : l.status === "proposed" ? "warn" : "neutral"}`}>{l.status}</span><span className="small muted">{l.scope}</span></div>
                    <div style={{ marginTop: 4 }}>{l.text}</div>
                  </li>
                ))}
              </ul>
              <Link href="/lessons" className="btn text">Review on the lessons page</Link>
            </>
          )}
        </div>
      </div>

      <div className="stack">
        <div className="card">
          <h3>Proposal activity</h3>
          {events.length === 0 ? (
            <p className="muted small">No views yet. Share the proposal link from the Proposal tab.</p>
          ) : (
            <>
              <p className="small muted" style={{ marginTop: 0 }}>{views} views</p>
              <ul className="list">
                {events.map((e) => (
                  <li key={e.id} className="small">
                    <span className={`chip ${e.kind === "accepted" ? "good" : e.kind === "question" ? "info" : "neutral"}`}>{e.kind}</span>{" "}
                    <span className="muted">{new Date(e.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
                    {e.detail && <div style={{ marginTop: 4 }}>{e.detail}</div>}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
        <form action={deleteProject.bind(null, p.id)} className="card">
          <h3>Danger zone</h3>
          <p className="small muted">Deletes the project, its plans, lines and packages.</p>
          <button className="btn danger small"><span className="material-symbols-outlined">delete_forever</span> Delete project</button>
        </form>
      </div>
    </div>
  );
}
