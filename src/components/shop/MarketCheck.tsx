"use client";
import { useState, useTransition } from "react";
import { runMarketCheck } from "@/app/shop-actions";
import type { MarketResult } from "@/lib/shop/schemas";
import { MAT_UNITS, usd } from "@/lib/shop/model";

export function MarketCheck({ categories }: { categories: string[] }) {
  const [res, setRes] = useState<MarketResult | null>(null);
  const [err, setErr] = useState("");
  const [pending, start] = useTransition();
  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          setErr("");
          setRes(null);
          start(async () => {
            const r = await runMarketCheck(fd);
            if (r.ok) setRes(r.result);
            else setErr(r.error);
          });
        }}
      >
        <div className="form-grid">
          <label className="f"><span>Item</span><input name="item" placeholder='e.g. 8/4 FAS rift white oak' /></label>
          <label className="f"><span>Unit</span><select name="unit" defaultValue="BF">{MAT_UNITS.map((u) => <option key={u}>{u}</option>)}</select></label>
          <label className="f"><span>Category</span><select name="category" defaultValue="Hardwood">{categories.map((c) => <option key={c}>{c}</option>)}</select></label>
        </div>
        <div className="row" style={{ marginTop: 16 }}>
          <button className="btn" type="submit" disabled={pending}>{pending ? "Searching, about a minute" : "Check market price"}</button>
        </div>
      </form>
      {err && <p className="note">{err}</p>}
      {res && (
        <div className="warm" style={{ marginTop: 20 }}>
          <div className="subhead">{res.item}</div>
          <div style={{ fontSize: 26, fontWeight: 300, margin: "4px 0" }}>
            {usd(res.typical, 2)} <span className="caption">per {res.unit} · range {usd(res.low, 2)} to {usd(res.high, 2)}</span>
          </div>
          <p>{res.note}</p>
          <ul className="dash">
            {res.sources.map((s, i) => (
              <li key={i}>
                <a href={s.url} target="_blank" rel="noreferrer">{s.title}</a> · {s.price} · {s.date}
              </li>
            ))}
          </ul>
          <p className="caption">Saved to the price book as Market (web). Supplier quotes still win when you have them.</p>
        </div>
      )}
    </div>
  );
}
