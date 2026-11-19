import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { getProject, getSettings, getPlanFiles } from "@/lib/data";
import { PrintButton } from "@/components/PrintButton";
import "../../doc.css";

export const dynamic = "force-dynamic";

export default async function BidPackage({ params }: { params: Promise<{ pkg: string }> }) {
  const { pkg } = await params;
  const db = await getDb();
  const [x] = await db.select().from(schema.tradePackages).where(eq(schema.tradePackages.id, Number(pkg)));
  if (!x) notFound();
  const [p, s, files] = await Promise.all([getProject(x.projectId), getSettings(), getPlanFiles(x.projectId)]);
  if (!p) notFound();
  const c = s.company;
  const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  return (
    <div className="doc bid">
      <div className="noprint toolbar"><PrintButton /></div>
      <header className="doc-head">
        <div>
          {c.logoUrl ? <img src={c.logoUrl} alt={c.name} className="doc-logo" /> : <div className="wordmark">{c.name.toUpperCase()}</div>}
          <div className="muted small">{c.tagline} · {c.location}</div>
        </div>
        <div className="right small">
          <div className="lab">Request for bid</div>
          <div>{today}</div>
          {c.phone && <div>{c.phone}</div>}
          {c.email && <div>{c.email}</div>}
        </div>
      </header>

      <h1>{x.trade}</h1>
      <p className="lede">{p.name}</p>
      <div className="fields">
        <div><span>Project</span>{p.name}</div>
        <div><span>Location</span>{[p.address, p.city].filter(Boolean).join(", ") || "–"}</div>
        <div><span>Architect</span>{p.architect || "–"}</div>
        <div><span>Structural</span>{p.structural || "–"}</div>
        <div><span>Drawing set</span>{p.designStage || "–"}</div>
        <div><span>Area</span>{p.totalSf ? `${p.totalSf.toLocaleString()} SF` : "–"}</div>
      </div>

      <p>
        {c.name} is pricing this project for the owner and requests your bid for the scope below. Plans are attached
        {files.length ? ` (${files.map((f) => f.filename).join(", ")})` : ""}. Please price per the drawings, note any exclusions,
        and fill in the bid form at the end. Questions go to the Sparrow project manager.
      </p>

      <section>
        <div className="lab">01 Scope of work</div>
        {x.scopeOfWork.split(/\n{2,}/).map((para, i) => <p key={i} style={{ whiteSpace: "pre-wrap" }}>{para}</p>)}
        {x.sheetRefs && <p className="muted small">Sheets to review: {x.sheetRefs}</p>}
      </section>

      <section className="two">
        <div>
          <div className="lab">02 Included</div>
          <ul>{x.inclusions.map((i) => <li key={i}>{i}</li>)}</ul>
        </div>
        <div>
          <div className="lab">03 Not included</div>
          <ul>{x.exclusions.map((i) => <li key={i}>{i}</li>)}</ul>
        </div>
      </section>

      {x.materials.length > 0 && (
        <section>
          <div className="lab">04 Material list</div>
          <p className="muted small">Quantities are Sparrow&apos;s takeoff from the drawings. Verify and price your own takeoff; note any differences.</p>
          <table className="tbl">
            <thead><tr><th>#</th><th>Item</th><th>Spec</th><th className="n">Qty</th><th>Unit</th><th className="n">Unit price</th><th className="n">Total</th></tr></thead>
            <tbody>
              {x.materials.map((m, i) => (
                <tr key={i}>
                  <td className="muted">{i + 1}</td>
                  <td>{m.item}{m.notes && <div className="muted small">{m.notes}</div>}</td>
                  <td>{m.spec}</td>
                  <td className="n">{m.qty.toLocaleString()}</td>
                  <td>{m.unit}</td>
                  <td className="blank"></td>
                  <td className="blank"></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {x.questions.length > 0 && (
        <section>
          <div className="lab">05 Please answer with your bid</div>
          <ol>{x.questions.map((q) => <li key={q}>{q}</li>)}</ol>
        </section>
      )}

      <section className="bidform">
        <div className="lab">Bid form</div>
        <div className="formgrid">
          <div><span>Company</span><i /></div>
          <div><span>Contact / phone / email</span><i /></div>
          <div><span>Base bid (labor + material, excl. WA sales tax)</span><i /></div>
          <div><span>Lead time / earliest start</span><i /></div>
          <div><span>Duration on site</span><i /></div>
          <div><span>Bid valid through</span><i /></div>
          <div className="wide"><span>Exclusions and clarifications</span><i /><i /><i /></div>
          <div><span>Signature</span><i /></div>
          <div><span>Date</span><i /></div>
        </div>
      </section>

      <footer className="doc-foot small muted">{c.name} · {c.location}{c.website ? ` · ${c.website}` : ""}</footer>
    </div>
  );
}
