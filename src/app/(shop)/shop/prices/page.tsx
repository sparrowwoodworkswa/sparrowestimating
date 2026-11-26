import { getPriceBook } from "@/lib/shop/data";
import { savePrice, deletePrice } from "@/app/shop-actions";
import { MarketCheck } from "@/components/shop/MarketCheck";
import { CURRENT_YEAR } from "@/lib/escalation";
import { MAT_UNITS, usd } from "@/lib/shop/model";

export const metadata = { title: "Price book · Sparrow shop" };

const CATEGORIES = ["Hardwood", "Softwood", "Sheet goods", "Hardware", "Finish", "Sundries", "Other"];
const SOURCES = ["Quote", "Invoice", "Sparrow estimate", "Market (web)"];

export default async function PricesPage() {
  const book = await getPriceBook();
  const byCat = CATEGORIES.map((c) => ({ c, rows: book.filter((r) => (r.category || "Other") === c) })).filter((g) => g.rows.length);
  return (
    <>
      <h1 className="doc-title">Price book</h1>
      <div className="doc-subtitle">Material prices with a date and a source. Estimates and the Claude takeoff price from here.</div>
      <p className="lede" style={{ marginTop: 24 }}>
        Best source first: supplier quotes and invoices, then past estimates, then a dated web check. Prices from earlier years are restated in {CURRENT_YEAR} dollars
        with the same escalation rates as the cost database.
      </p>

      <div className="two">
        <div>
          <h2 className="section">Add a quote</h2>
          <form action={savePrice}>
            <div className="form-grid">
              <label className="f"><span>Item</span><input name="item" required placeholder='e.g. 3/4" rift white oak plywood' /></label>
              <label className="f"><span>Category</span><select name="category">{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></label>
              <label className="f"><span>Unit</span><select name="unit" defaultValue="BF">{MAT_UNITS.map((u) => <option key={u}>{u}</option>)}</select></label>
              <label className="f"><span>Price per unit</span><input name="unitPrice" type="number" step="any" required /></label>
              <label className="f"><span>Vendor</span><input name="vendor" placeholder="Chinook, AWI, EB Bradley" /></label>
              <label className="f"><span>Date</span><input name="quoteDate" type="date" /></label>
              <label className="f"><span>Source</span><select name="source">{SOURCES.map((s) => <option key={s}>{s}</option>)}</select></label>
            </div>
            <label className="f" style={{ marginTop: 16 }}><span>Notes</span><input name="notes" /></label>
            <div className="row" style={{ marginTop: 16 }}><button className="btn" type="submit">Add to price book</button></div>
          </form>
        </div>
        <div>
          <h2 className="section">Market check</h2>
          <p className="caption">
            Claude searches published prices from lumber dealers and hardwood suppliers, favoring the Pacific Northwest, and saves a dated range with its sources.
            Use it to sanity-check a quote or fill a gap. It doesn&apos;t replace a quote.
          </p>
          <MarketCheck categories={CATEGORIES} />
        </div>
      </div>

      {byCat.map(({ c, rows }) => (
        <div key={c}>
          <h2 className="section">{c}</h2>
          <div className="sw-scroll">
            <table>
              <thead>
                <tr><th>Item</th><th>Unit</th><th className="num">Price</th><th className="num">{CURRENT_YEAR} $</th><th>Range</th><th>Source</th><th>Vendor</th><th>Date</th><th>Notes</th><th /></tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="wrap">{r.item}</td>
                    <td>{r.unit}</td>
                    <td className="num">{usd(r.unitPrice, 2)}</td>
                    <td className="num">{usd(r.current, 2)}</td>
                    <td className="caption">{r.low != null && r.high != null ? `${usd(r.low, 2)} to ${usd(r.high, 2)}` : ""}</td>
                    <td>{r.source}</td>
                    <td>{r.vendor}</td>
                    <td>{r.quoteDate}</td>
                    <td className="caption" style={{ maxWidth: 360, whiteSpace: "pre-line" }}>
                      {r.url ? <a href={r.url} target="_blank" rel="noreferrer">Source</a> : null} {r.notes.split("\n")[0]}
                    </td>
                    <td><form action={deletePrice.bind(null, r.id)}><button className="link" type="submit">Remove</button></form></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </>
  );
}
