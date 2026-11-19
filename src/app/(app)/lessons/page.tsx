import Link from "next/link";
import { desc } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { saveLesson, setLessonStatus, approveAllProposed } from "@/app/actions";
import { SubmitButton } from "@/components/SubmitButton";

export default async function LessonsPage() {
  const db = await getDb();
  const all = await db.select().from(schema.lessons).orderBy(desc(schema.lessons.id));
  const projects = await db.select({ id: schema.projects.id, name: schema.projects.name }).from(schema.projects);
  const pname = (id: number | null) => projects.find((p) => p.id === id)?.name;
  const proposed = all.filter((l) => l.status === "proposed");
  const active = all.filter((l) => l.status === "active");
  const retired = all.filter((l) => l.status === "retired");

  const Item = ({ l }: { l: (typeof all)[number] }) => (
    <li>
      <div className="row" style={{ gap: 8 }}>
        <span className="chip accent">{l.scope}</span>
        {l.projectId && <Link className="small" href={`/projects/${l.projectId}/outcome`}>{pname(l.projectId)}</Link>}
        <span className="small muted">{l.source}</span>
        <span className="spacer" />
        {l.status !== "active" && <form action={setLessonStatus.bind(null, l.id, "active")}><button className="btn tonal small">{l.status === "proposed" ? "Approve" : "Restore"}</button></form>}
        {l.status !== "retired" && <form action={setLessonStatus.bind(null, l.id, "retired")}><button className="btn text small">{l.status === "proposed" ? "Reject" : "Retire"}</button></form>}
      </div>
      <form action={saveLesson} className="row" style={{ marginTop: 6, flexWrap: "nowrap", alignItems: "flex-start" }}>
        <input type="hidden" name="id" value={l.id} />
        <input type="hidden" name="scope" value={l.scope} />
        <input type="hidden" name="status" value={l.status} />
        <textarea className="input" name="text" defaultValue={l.text} style={{ minHeight: 60, flex: 1 }} />
        <button className="icon-btn" title="Save edit"><span className="material-symbols-outlined">save</span></button>
      </form>
    </li>
  );

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="headline">What we&apos;ve learned</h1>
          <p className="muted">The estimator&apos;s memory. Every active lesson goes into every ROM. New ones come from the learning step after a project is won, lost or built.</p>
        </div>
      </div>

      {proposed.length > 0 && (
        <div className="card" style={{ marginBottom: 16, borderColor: "var(--md-primary)" }}>
          <div className="card-head">
            <h3>Waiting for your review ({proposed.length})</h3>
            <form action={approveAllProposed}><button className="btn small">Approve all</button></form>
          </div>
          <ul className="list">{proposed.map((l) => <Item key={l.id} l={l} />)}</ul>
        </div>
      )}

      <div className="grid" style={{ gridTemplateColumns: "minmax(0, 1fr) minmax(280px, 360px)", alignItems: "start" }}>
        <div className="card">
          <h3>Active lessons ({active.length})</h3>
          <ul className="list">{active.map((l) => <Item key={l.id} l={l} />)}</ul>
          {retired.length > 0 && (
            <details className="panel" style={{ marginTop: 12 }}>
              <summary>Retired ({retired.length}) <span className="material-symbols-outlined chev">expand_more</span></summary>
              <div className="body"><ul className="list">{retired.map((l) => <Item key={l.id} l={l} />)}</ul></div>
            </details>
          )}
        </div>
        <form action={saveLesson} className="card stack" style={{ gap: 12 }}>
          <h3 style={{ margin: 0 }}>Add a lesson</h3>
          <label className="field"><span>Applies to</span><input className="input" name="scope" placeholder="General, Electrical, Site / Grading…" /></label>
          <label className="field"><span>Lesson</span><textarea className="input" name="text" required placeholder="e.g. Bainbridge permits run about $11/SF for new homes. Carry COBI fees as an allowance at that rate." /></label>
          <SubmitButton icon="add">Add lesson</SubmitButton>
        </form>
      </div>
    </>
  );
}
