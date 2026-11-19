"use client";
import { useState, useTransition } from "react";
import type { Material } from "@/db/schema";
import { updateMaterials } from "@/app/actions";

export function MaterialsEditor({ pkgId, initial }: { pkgId: number; initial: Material[] }) {
  const [rows, setRows] = useState<Material[]>(initial);
  const [dirty, setDirty] = useState(false);
  const [pending, start] = useTransition();
  const set = (i: number, k: keyof Material, v: string) => {
    setRows((r) => r.map((m, j) => (j === i ? { ...m, [k]: k === "qty" ? Number(v) || 0 : v } : m)));
    setDirty(true);
  };
  return (
    <>
      <div className="table-wrap">
        <table className="data edit">
          <thead><tr><th>Item</th><th>Spec</th><th className="n" style={{ width: 90 }}>Qty</th><th style={{ width: 80 }}>Unit</th><th>Notes</th><th style={{ width: 40 }}></th></tr></thead>
          <tbody>
            {rows.map((m, i) => (
              <tr key={i}>
                <td><input value={m.item} onChange={(e) => set(i, "item", e.target.value)} /></td>
                <td><input value={m.spec} onChange={(e) => set(i, "spec", e.target.value)} /></td>
                <td><input className="n" value={m.qty} onChange={(e) => set(i, "qty", e.target.value)} /></td>
                <td><input value={m.unit} onChange={(e) => set(i, "unit", e.target.value)} /></td>
                <td><input value={m.notes} onChange={(e) => set(i, "notes", e.target.value)} /></td>
                <td><button className="icon-btn small" onClick={() => { setRows((r) => r.filter((_, j) => j !== i)); setDirty(true); }}><span className="material-symbols-outlined">close</span></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="row" style={{ marginTop: 10 }}>
        <button className="btn text small" onClick={() => { setRows((r) => [...r, { item: "", spec: "", qty: 1, unit: "EA", notes: "" }]); setDirty(true); }}>
          <span className="material-symbols-outlined">add</span> Add item
        </button>
        <span className="spacer" />
        <button className="btn tonal small" disabled={!dirty || pending} onClick={() => start(async () => { await updateMaterials(pkgId, rows); setDirty(false); })}>
          {pending ? "Saving…" : dirty ? "Save material list" : "Saved"}
        </button>
      </div>
    </>
  );
}
