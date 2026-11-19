"use client";
import { useMemo, useState, useTransition } from "react";
import type { EstimateLine, Markups } from "@/db/schema";
import { DIVISIONS } from "@/lib/csi";
import { computeTotals, lineParts, lineUnitCost, usd, num } from "@/lib/totals";
import { updateLine, addLine, deleteLine, updateMarkups, addLineFromCatalog, type LinePatch } from "@/app/actions";

type Cat = { id: number; trade: string; item: string; unit: string; unitPrice: number; vendor: string };

export function EstimateEditor({
  project,
  initialLines,
  laborRates,
  catalog,
  defaultMarkups,
}: {
  project: { id: number; totalSf: number | null; markups: Markups; name: string; contractTotalOverride: number | null };
  initialLines: EstimateLine[];
  laborRates: Record<string, number>;
  catalog: Cat[];
  defaultMarkups: Markups;
}) {
  const [lines, setLines] = useState(initialLines);
  const [m, setM] = useState<Markups>(project.markups);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState("");
  const [saving, startSave] = useTransition();
  const [catFor, setCatFor] = useState<string | null>(null);
  const t = useMemo(() => computeTotals(lines, m), [lines, m]);
  const sf = project.totalSf;
  const maxDiv = Math.max(1, ...t.divisions.map((d) => d.total));

  const patch = (id: number, p: LinePatch) => {
    setLines((ls) => ls.map((l) => (l.id === id ? { ...l, ...p } : l)));
    startSave(async () => { await updateLine(id, p); });
  };
  const setMarkup = (k: keyof Markups, v: number) => {
    const next = { ...m, [k]: v };
    setM(next);
    startSave(async () => { await updateMarkups(project.id, next); });
  };
  const fl = filter.toLowerCase();
  const visible = (l: EstimateLine) => !fl || [l.description, l.scope, l.trade, l.csiCode, l.note].some((x) => x.toLowerCase().includes(fl));

  return (
    <div className="stack">
      <div className="grid" style={{ gridTemplateColumns: "minmax(0, 1.4fr) minmax(300px, 1fr)", alignItems: "start" }}>
        <div className="card">
          <div className="card-head">
            <h3>Cost by CSI division</h3>
            <span className="small muted">{t.lineCount} lines · {num(t.laborHours)} self-performed hrs</span>
          </div>
          {t.divisions.map((d) => (
            <div key={d.code} className="row" style={{ flexWrap: "nowrap", gap: 12, padding: "5px 0" }}>
              <span style={{ width: 210, flexShrink: 0 }} className="small">
                <b style={{ color: "var(--md-primary)" }}>{d.code}</b> {d.name}
              </span>
              <div className="bar-track" style={{ flex: 1 }}><div className="bar-fill" style={{ width: `${(d.total / maxDiv) * 100}%` }} /></div>
              <span className="small num" style={{ width: 90, textAlign: "right" }}>{d.total ? usd(d.total) : "–"}</span>
              <span className="small num muted" style={{ width: 60, textAlign: "right" }}>{d.total && sf ? `${usd(d.total / sf)}/sf` : ""}</span>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="card-head">
            <h3>Markups</h3>
            <span className="small muted">{saving ? "Saving…" : "Saved"}</span>
          </div>
          <table className="data" style={{ fontSize: 14 }}>
            <tbody>
              <tr><td>Direct cost</td><td></td><td className="n">{usd(t.direct)}</td></tr>
              {([
                ["contingencyPct", "Contingency", t.contingency, "on direct"],
                ["insurancePct", "Insurance & WA B&O", t.insurance, "on direct + contingency"],
                ["overheadPct", "Overhead", t.overhead, "on the above"],
                ["feePct", "Contractor fee (profit)", t.fee, "on the above"],
                ["taxPct", "WA sales tax", t.tax, "on contract price"],
              ] as const).map(([k, label, val, hint]) => (
                <tr key={k}>
                  <td>{label}<div className="small muted">{hint}</div></td>
                  <td style={{ width: 92 }}>
                    <div className="row" style={{ flexWrap: "nowrap", gap: 4 }}>
                      <input
                        className="input num"
                        style={{ height: 34, textAlign: "right", padding: "0 8px" }}
                        type="number"
                        step="0.1"
                        value={m[k]}
                        onChange={(e) => setMarkup(k, Number(e.target.value))}
                      />
                      <span className="muted">%</span>
                    </div>
                  </td>
                  <td className="n">{usd(val)}</td>
                </tr>
              ))}
              <tr className="subtotal">
                <td style={{ fontSize: 16 }}>Contract total</td>
                <td></td>
                <td className="n" style={{ fontSize: 18 }}>{usd(t.total)}</td>
              </tr>
            </tbody>
          </table>
          <div className="row small muted" style={{ marginTop: 10, justifyContent: "space-between" }}>
            <span>{sf ? `${usd(t.total / sf)}/SF on ${num(sf)} SF` : "Add SF on the Plans tab for $/SF"}</span>
            <button className="btn text small" onClick={() => { setM(defaultMarkups); startSave(async () => { await updateMarkups(project.id, defaultMarkups); }); }}>Reset to company defaults</button>
          </div>
        </div>
      </div>

      <div className="row">
        <div className="search" style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--md-surface)", border: "1px solid var(--md-outline-variant)", borderRadius: 24, padding: "0 14px", height: 40, flex: "1 1 260px", maxWidth: 420 }}>
          <span className="material-symbols-outlined muted">filter_list</span>
          <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter lines" style={{ border: 0, outline: "none", background: "transparent", font: "inherit", flex: 1, color: "inherit" }} />
        </div>
        <button className="btn text" onClick={() => setOpen(Object.fromEntries(DIVISIONS.map((d) => [d.code, true])))}>Expand all</button>
        <button className="btn text" onClick={() => setOpen({})}>Collapse all</button>
        <div className="spacer" />
        <a className="btn tonal" href={`/api/projects/${project.id}/export`}>
          <span className="material-symbols-outlined">download</span> Download ROM (.xlsx)
        </a>
      </div>

      {lines.length === 0 && project.contractTotalOverride ? (
        <div className="banner">
          <span className="material-symbols-outlined">info</span>
          <div>This is a historical project with a typed total ({usd(project.contractTotalOverride)}) and no line items. Add lines below or upload the plans to build a full ROM.</div>
        </div>
      ) : null}

      <div className="stack" style={{ gap: 8 }}>
        {t.divisions.map((d) => {
          const dl = lines.filter((l) => l.division === d.code && visible(l));
          const isOpen = open[d.code] ?? (!!fl && dl.length > 0);
          return (
            <details key={d.code} className="panel" open={isOpen} onToggle={(e) => { const o = (e.target as HTMLDetailsElement).open; if (o !== isOpen) setOpen((s) => ({ ...s, [d.code]: o })); }}>
              <summary>
                <span style={{ color: "var(--md-primary)", width: 22 }}>{d.code}</span>
                <span>{d.name}</span>
                <span className="chip neutral">{d.count} lines</span>
                {d.allowance > 0 && <span className="chip warn">{usd(d.allowance)} allowance</span>}
                <span className="spacer" />
                <span className="num">{d.total ? usd(d.total) : "–"}</span>
                <span className="material-symbols-outlined chev" style={{ marginLeft: 8 }}>expand_more</span>
              </summary>
              <div className="body">
                {dl.length > 0 && (
                  <div className="table-wrap">
                    <table className="data edit">
                      <thead>
                        <tr>
                          <th style={{ minWidth: 240 }}>Item / scope</th>
                          <th style={{ width: 70 }} className="n">Qty</th>
                          <th style={{ width: 64 }}>Unit</th>
                          <th style={{ width: 70 }} className="n">Hrs/unit</th>
                          <th style={{ width: 76 }} className="n">$/hr</th>
                          <th style={{ width: 84 }} className="n">Mat/unit</th>
                          <th style={{ width: 84 }} className="n">Sub/unit</th>
                          <th style={{ width: 120 }}>Trade</th>
                          <th style={{ width: 96 }} className="n">Total</th>
                          <th style={{ width: 40 }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {dl.map((l) => {
                          const p = lineParts(l);
                          return (
                            <tr key={l.id}>
                              <td>
                                <Cell value={l.description} onSave={(v) => patch(l.id, { description: v })} bold />
                                <Cell value={l.scope} onSave={(v) => patch(l.id, { scope: v })} area placeholder="Scope we priced" />
                                <div className="row" style={{ gap: 6, padding: "0 6px" }}>
                                  <Cell value={l.csiCode} onSave={(v) => patch(l.id, { csiCode: v })} small placeholder="CSI code" width={84} />
                                  <label className="check small muted"><input type="checkbox" checked={l.isAllowance} onChange={(e) => patch(l.id, { isAllowance: e.target.checked })} />Allowance</label>
                                  {l.source === "ai" && l.aiOriginal && lineParts({ ...l, ...(l.aiOriginal as object) }).total !== p.total && <span className="chip info" title="You changed Claude's number. The learning step uses this.">edited</span>}
                                  {l.source === "manual" && <span className="chip neutral">added</span>}
                                </div>
                                <Cell value={l.note} onSave={(v) => patch(l.id, { note: v })} small area placeholder="Note / takeoff basis" />
                              </td>
                              <td><NumCell value={l.qty} onSave={(v) => patch(l.id, { qty: v })} /></td>
                              <td><Cell value={l.unit} onSave={(v) => patch(l.id, { unit: v })} /></td>
                              <td><NumCell value={l.laborHoursPerUnit} onSave={(v) => patch(l.id, { laborHoursPerUnit: v })} /></td>
                              <td>
                                <select value={String(l.laborRate)} onChange={(e) => patch(l.id, { laborRate: Number(e.target.value) })} title="Labor rate">
                                  {[...new Set([l.laborRate, ...Object.values(laborRates)])].sort((a, b) => a - b).map((r) => (
                                    <option key={r} value={r}>{r ? `$${r}` : "–"} {Object.entries(laborRates).find(([, v]) => v === r)?.[0] ?? ""}</option>
                                  ))}
                                </select>
                              </td>
                              <td><NumCell value={l.materialUnit} onSave={(v) => patch(l.id, { materialUnit: v })} /></td>
                              <td><NumCell value={l.subUnit} onSave={(v) => patch(l.id, { subUnit: v })} /></td>
                              <td><Cell value={l.trade} onSave={(v) => patch(l.id, { trade: v })} /></td>
                              <td className="n" style={{ paddingTop: 10 }}>
                                <b>{usd(p.total)}</b>
                                <div className="small muted">{usd(lineUnitCost(l), 2)}/{l.unit}</div>
                              </td>
                              <td>
                                <button
                                  className="icon-btn small"
                                  title="Delete line"
                                  onClick={() => {
                                    if (!confirm(`Delete "${l.description}"?`)) return;
                                    setLines((ls) => ls.filter((x) => x.id !== l.id));
                                    startSave(async () => { await deleteLine(l.id); });
                                  }}
                                >
                                  <span className="material-symbols-outlined">delete</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
                <div className="row" style={{ marginTop: 10 }}>
                  <button className="btn text small" onClick={() => startSave(async () => { const nl = await addLine(project.id, d.code); setLines((ls) => [...ls, nl]); })}>
                    <span className="material-symbols-outlined">add</span> Add line
                  </button>
                  <button className="btn text small" onClick={() => setCatFor(catFor === d.code ? null : d.code)}>
                    <span className="material-symbols-outlined">sell</span> Add from price catalog
                  </button>
                </div>
                {catFor === d.code && (
                  <CatalogPicker
                    catalog={catalog}
                    onPick={(c, qty) =>
                      startSave(async () => {
                        const nl = await addLineFromCatalog(project.id, c.id, d.code, qty);
                        if (nl) setLines((ls) => [...ls, nl]);
                        setCatFor(null);
                      })
                    }
                  />
                )}
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}

function Cell({ value, onSave, bold, area, small, placeholder, width }: { value: string; onSave: (v: string) => void; bold?: boolean; area?: boolean; small?: boolean; placeholder?: string; width?: number }) {
  const [v, setV] = useState(value);
  const style = { fontWeight: bold ? 500 : 400, fontSize: small ? 12 : 13, color: small ? "var(--md-on-surface-variant)" : undefined, width };
  const commit = () => v !== value && onSave(v);
  return area ? (
    <textarea value={v} placeholder={placeholder} style={style} onChange={(e) => setV(e.target.value)} onBlur={commit} rows={1} />
  ) : (
    <input value={v} placeholder={placeholder} style={style} onChange={(e) => setV(e.target.value)} onBlur={commit} onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()} />
  );
}

function NumCell({ value, onSave }: { value: number; onSave: (v: number) => void }) {
  const [v, setV] = useState(String(value));
  return (
    <input
      className="n"
      inputMode="decimal"
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => {
        const n = Number(v.replace(/[$,]/g, ""));
        if (!Number.isNaN(n) && n !== value) onSave(n);
        else setV(String(value));
      }}
      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
    />
  );
}

function CatalogPicker({ catalog, onPick }: { catalog: Cat[]; onPick: (c: Cat, qty: number) => void }) {
  const [q, setQ] = useState("");
  const [qty, setQty] = useState("1");
  const ql = q.toLowerCase();
  const hits = catalog.filter((c) => !ql || `${c.trade} ${c.item} ${c.vendor}`.toLowerCase().includes(ql)).slice(0, 12);
  return (
    <div className="card filled" style={{ marginTop: 8, padding: 12 }}>
      <div className="row">
        <input className="input" style={{ flex: 1, height: 38 }} autoFocus placeholder="Search the price catalog" value={q} onChange={(e) => setQ(e.target.value)} />
        <input className="input num" style={{ width: 90, height: 38 }} value={qty} onChange={(e) => setQty(e.target.value)} title="Quantity" />
      </div>
      <ul className="list" style={{ marginTop: 6 }}>
        {hits.map((c) => (
          <li key={c.id} className="row" style={{ padding: "8px 0" }}>
            <div style={{ flex: 1 }}>
              <div>{c.item}</div>
              <div className="small muted">{c.trade}{c.vendor ? ` · ${c.vendor}` : ""}</div>
            </div>
            <span className="num">{usd(c.unitPrice, 2)}/{c.unit}</span>
            <button className="btn tonal small" onClick={() => onPick(c, Number(qty) || 1)}>Add</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
