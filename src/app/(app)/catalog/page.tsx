import { desc } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { saveCatalogItem, importCatalogCsv, setCatalogActive, deleteCatalogItem } from "@/app/actions";
import { SubmitButton } from "@/components/SubmitButton";
import { TRADES } from "@/lib/csi";
import { usd } from "@/lib/totals";

const SRC: Record<string, { label: string; tone: string }> = {
  sub_quote: { label: "Sub quote", tone: "good" },
  bid: { label: "Bid", tone: "good" },
  actual: { label: "Actual cost", tone: "good" },
  estimate: { label: "Past estimate", tone: "neutral" },
  learned: { label: "Learned", tone: "info" },
};

export default async function CatalogPage({ searchParams }: { searchParams: Promise<{ trade?: string; q?: string }> }) {
  const { trade = "", q = "" } = await searchParams;
  const db = await getDb();
  const all = await db.select().from(schema.catalog).orderBy(desc(schema.catalog.active), schema.catalog.trade, desc(schema.catalog.createdAt));
  const trades = [...new Set(all.map((c) => c.trade))].sort();
  const ql = q.toLowerCase();
  const rows = all.filter((c) => (!trade || c.trade === trade) && (!ql || `${c.item} ${c.vendor} ${c.notes}`.toLowerCase().includes(ql)));
  const pending = all.filter((c) => !c.active && c.source === "learned").length;

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="headline">Price catalog</h1>
          <p className="muted">Real numbers from your subs. Every ROM prices from here first, so a concrete sub&apos;s $/CY installed goes straight into the next estimate.</p>
        </div>
      </div>

      {pending > 0 && (
        <div className="banner" style={{ marginBottom: 16 }}>
          <span className="material-symbols-outlined">school</span>
          <div>{pending} prices learned from past projects are waiting for review. Turn them on below to use them in ROMs.</div>
        </div>
      )}

      <div className="grid cols-2" style={{ marginBottom: 16, alignItems: "start" }}>
        <form action={saveCatalogItem} className="card stack" style={{ gap: 12 }}>
          <h3 style={{ margin: 0 }}>Add a sub price</h3>
          <div className="form-grid">
            <label className="field"><span>Trade</span>
              <input className="input" name="trade" list="trades" required placeholder="Concrete" />
              <datalist id="trades">{[...new Set([...TRADES, ...trades])].map((t) => <option key={t} value={t} />)}</datalist>
            </label>
            <label className="field"><span>Subcontractor / supplier</span><input className="input" name="vendor" placeholder="JB Concrete" /></label>
          </div>
          <label className="field"><span>Item</span><input className="input" name="item" required placeholder="Footings and stem walls, formed, placed and finished" /></label>
          <div className="form-grid">
            <label className="field"><span>Price</span><input className="input" name="unitPrice" required inputMode="decimal" placeholder="$385" /></label>
            <label className="field"><span>Per</span><input className="input" name="unit" placeholder="CY" /></label>
            <label className="field"><span>Price is</span>
              <select className="input" name="priceType"><option value="installed">Installed (labor + material)</option><option value="material">Material only</option><option value="labor">Labor only</option></select>
            </label>
            <label className="field"><span>Source</span>
              <select className="input" name="source"><option value="sub_quote">Sub quote</option><option value="bid">Bid on a project</option><option value="actual">Actual cost</option><option value="estimate">Past estimate</option></select>
            </label>
            <label className="field"><span>Quote date</span><input className="input" name="quoteDate" type="month" /></label>
            <label className="field"><span>Region</span><input className="input" name="region" defaultValue="Kitsap / Puget Sound" /></label>
          </div>
          <label className="field"><span>Notes (what&apos;s included, minimums, conditions)</span><input className="input" name="notes" placeholder="Includes pump. $2,500 minimum. 3,000 psi." /></label>
          <div className="row"><SubmitButton icon="add">Add to catalog</SubmitButton></div>
        </form>

        <form action={importCatalogCsv} className="card stack" style={{ gap: 12 }}>
          <h3 style={{ margin: 0 }}>Import a price sheet</h3>
          <p className="muted small" style={{ margin: 0 }}>
            CSV with a header row. Columns: <code>trade, item, unit, unit_price, vendor, quote_date, notes</code>. Have a sub fill in a spreadsheet and export it as CSV.
          </p>
          <input className="input" type="file" name="file" accept=".csv,text/csv" required style={{ paddingTop: 10 }} />
          <div className="row"><SubmitButton className="btn tonal" icon="upload_file">Import</SubmitButton></div>
        </form>
      </div>

      <form className="row" style={{ marginBottom: 12 }}>
        <select className="input" name="trade" defaultValue={trade} style={{ maxWidth: 240 }}>
          <option value="">All trades ({all.length})</option>
          {trades.map((t) => <option key={t} value={t}>{t} ({all.filter((c) => c.trade === t).length})</option>)}
        </select>
        <input className="input" name="q" defaultValue={q} placeholder="Search items, vendors, notes" style={{ maxWidth: 320 }} />
        <button className="btn tonal">Filter</button>
      </form>

      <div className="table-wrap">
        <table className="data">
          <thead><tr><th>Trade</th><th>Item</th><th className="n">Price</th><th>Source</th><th>Vendor</th><th>Date</th><th>In ROMs</th><th></th></tr></thead>
          <tbody>
            {rows.map((c) => {
              const src = SRC[c.source] ?? SRC.estimate;
              return (
                <tr key={c.id} style={{ opacity: c.active ? 1 : 0.6 }}>
                  <td className="muted">{c.trade}</td>
                  <td>{c.item}{c.notes && <div className="small muted">{c.notes}</div>}</td>
                  <td className="n">{usd(c.unitPrice, 2)} / {c.unit}<div className="small muted">{c.priceType}</div></td>
                  <td><span className={`chip ${src.tone}`}>{src.label}</span></td>
                  <td>{c.vendor}</td>
                  <td className="muted">{c.quoteDate}</td>
                  <td>
                    <form action={setCatalogActive.bind(null, c.id, !c.active)}>
                      <button className={`btn small ${c.active ? "tonal" : "outlined"}`}>{c.active ? "On" : "Off"}</button>
                    </form>
                  </td>
                  <td>
                    <form action={deleteCatalogItem.bind(null, c.id)}>
                      <button className="icon-btn small" title="Delete"><span className="material-symbols-outlined">delete</span></button>
                    </form>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
