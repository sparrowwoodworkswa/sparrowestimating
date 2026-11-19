import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { updatePackage, deletePackage } from "@/app/actions";
import { SubmitButton } from "@/components/SubmitButton";
import { MaterialsEditor } from "@/components/MaterialsEditor";
import { usd } from "@/lib/totals";

export default async function PackagePage({ params }: { params: Promise<{ id: string; pkg: string }> }) {
  const { id, pkg } = await params;
  const db = await getDb();
  const [x] = await db.select().from(schema.tradePackages).where(eq(schema.tradePackages.id, Number(pkg)));
  if (!x || x.projectId !== Number(id)) notFound();
  const save = updatePackage.bind(null, x.id);

  return (
    <div className="stack">
      <div className="row">
        <Link href={`/projects/${id}/trades`} className="btn text"><span className="material-symbols-outlined">arrow_back</span> All trades</Link>
        <h2 className="title-l">{x.trade}</h2>
        <span className="spacer" />
        <a className="btn outlined" href={`/api/projects/${id}/packages/${x.id}/export`}><span className="material-symbols-outlined">table_view</span> Material list (.xlsx)</a>
        <Link className="btn" href={`/bid/${x.id}`} target="_blank"><span className="material-symbols-outlined">print</span> Print / PDF bid package</Link>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "minmax(0, 1fr) minmax(280px, 340px)", alignItems: "start" }}>
        <form action={save} className="card stack" style={{ gap: 14 }}>
          <h3 style={{ margin: 0 }}>Scope of work</h3>
          <textarea className="input" name="scopeOfWork" defaultValue={x.scopeOfWork} style={{ minHeight: 220 }} />
          <div className="form-grid">
            <label className="field"><span>Inclusions (one per line)</span><textarea className="input" name="inclusions" defaultValue={x.inclusions.join("\n")} style={{ minHeight: 140 }} /></label>
            <label className="field"><span>Exclusions (one per line)</span><textarea className="input" name="exclusions" defaultValue={x.exclusions.join("\n")} style={{ minHeight: 140 }} /></label>
          </div>
          <label className="field"><span>Questions / RFIs for the sub (one per line)</span><textarea className="input" name="questions" defaultValue={x.questions.join("\n")} /></label>
          <label className="field"><span>Sheets to review</span><input className="input" name="sheetRefs" defaultValue={x.sheetRefs} /></label>
          <div className="row"><SubmitButton className="btn tonal" icon="save">Save scope</SubmitButton></div>
        </form>

        <div className="stack">
          <form action={save} className="card stack" style={{ gap: 12 }}>
            <h3 style={{ margin: 0 }}>Bid tracking</h3>
            <div className="small muted">ROM carried: <b>{usd(x.estimatedPrice)}</b> direct</div>
            <label className="field"><span>ROM for this trade</span><input className="input" name="estimatedPrice" defaultValue={x.estimatedPrice} /></label>
            <label className="field"><span>Status</span>
              <select className="input" name="bidStatus" defaultValue={x.bidStatus}>
                <option value="not_sent">Not sent</option><option value="sent">Out to bid</option><option value="received">Bid received</option><option value="awarded">Awarded</option>
              </select>
            </label>
            <label className="field"><span>Subcontractor</span><input className="input" name="bidVendor" defaultValue={x.bidVendor} /></label>
            <label className="field"><span>Bid amount</span><input className="input" name="bidAmount" defaultValue={x.bidAmount ?? ""} inputMode="decimal" /></label>
            <label className="field"><span>Bid notes (exclusions, assumptions)</span><textarea className="input" name="bidNotes" defaultValue={x.bidNotes} /></label>
            <label className="check small"><input type="checkbox" name="addToCatalog" value="1" defaultChecked /> Add this bid to the price catalog</label>
            <SubmitButton className="btn" icon="save">Save bid</SubmitButton>
          </form>
          <form action={deletePackage.bind(null, Number(id), x.id)}>
            <button className="btn danger small"><span className="material-symbols-outlined">delete</span> Delete package</button>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card-head"><h3>Material list</h3><span className="small muted">{x.materials.length} items</span></div>
        <MaterialsEditor pkgId={x.id} initial={x.materials} />
      </div>
    </div>
  );
}
