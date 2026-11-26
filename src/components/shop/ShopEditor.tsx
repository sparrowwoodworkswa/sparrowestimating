"use client";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveShopLines } from "@/app/shop-actions";
import {
  PIECE_TASKS,
  JOB_TASKS,
  UNITS,
  MAT_UNITS,
  computeShopTotals,
  pieceHours,
  pieceLabor,
  extraCost,
  materialCost,
  taskLabel,
  hrs,
  usd,
  type PieceRow,
  type ExtraRow,
  type MaterialRow,
  type JobRates,
} from "@/lib/shop/model";

export type LibHint = { pieceType: string; unit: string; perUnit: Record<string, number>; from: string };
export type PriceHint = { item: string; unit: string; price: number; from: string };

let tmp = -1;
const nextId = () => tmp--;

export function ShopEditor(props: {
  jobId: number;
  rates: JobRates;
  basis: string;
  pieces: PieceRow[];
  extras: ExtraRow[];
  materials: MaterialRow[];
  library: LibHint[];
  prices: PriceHint[];
}) {
  const { jobId, rates, basis, library, prices } = props;
  const [pieces, setPieces] = useState(props.pieces);
  const [extras, setExtras] = useState(props.extras);
  const [materials, setMaterials] = useState(props.materials);
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();

  const sources = useMemo(
    () => [...new Set([basis, ...props.pieces.map((p) => p.source), ...props.extras.map((e) => e.source), ...props.materials.map((m) => m.source)])],
    [basis, props.pieces, props.extras, props.materials],
  );
  const [view, setView] = useState(basis);
  const inView = <T extends { source: string }>(r: T) => r.source === view;

  const sections = useMemo(() => {
    const names: string[] = [];
    for (const r of [...pieces, ...extras, ...materials].filter(inView)) if (!names.includes(r.section)) names.push(r.section);
    return names.length ? names : ["Main"];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pieces, extras, materials, view]);

  const totals = useMemo(() => computeShopTotals(pieces, extras, materials, rates, view), [pieces, extras, materials, rates, view]);
  const libByType = useMemo(() => new Map(library.map((l) => [l.pieceType.toLowerCase(), l])), [library]);
  const priceByItem = useMemo(() => new Map(prices.map((p) => [p.item.toLowerCase(), p])), [prices]);

  const touch = () => { setDirty(true); setMsg(""); };
  const upPiece = (id: number | undefined, patch: Partial<PieceRow>) => { setPieces((xs) => xs.map((x) => (x.id === id ? { ...x, ...patch } : x))); touch(); };
  const upExtra = (id: number | undefined, patch: Partial<ExtraRow>) => { setExtras((xs) => xs.map((x) => (x.id === id ? { ...x, ...patch } : x))); touch(); };
  const upMat = (id: number | undefined, patch: Partial<MaterialRow>) => { setMaterials((xs) => xs.map((x) => (x.id === id ? { ...x, ...patch } : x))); touch(); };

  const addPiece = (section: string) => {
    setPieces((xs) => [...xs, { id: nextId(), section, grp: "", description: "", pieceType: "", qty: 1, unit: "EA", hours: {}, include: true, source: view, note: "", sort: xs.length }]);
    touch();
  };
  const addExtra = (section: string) => {
    setExtras((xs) => [...xs, { id: nextId(), section, task: "estimating", label: "", who: "", hours: 0, crew: 1, rate: null, lump: null, include: true, source: view, note: "", sort: xs.length }]);
    touch();
  };
  const addMat = (section: string) => {
    setMaterials((xs) => [...xs, { id: nextId(), section, item: "", qty: 1, unit: "BF", unitPrice: 0, vendor: "", include: true, source: view, note: "", sort: xs.length }]);
    touch();
  };
  const addSection = () => {
    const name = prompt("Section name (an area or package, e.g. Bar, Dining room, Ceiling)");
    if (name?.trim()) addPiece(name.trim());
  };
  const renameSection = (from: string) => {
    const to = prompt("Rename section", from)?.trim();
    if (!to || to === from) return;
    const ren = <T extends { section: string; source: string }>(r: T) => (r.section === from && r.source === view ? { ...r, section: to } : r);
    setPieces((xs) => xs.map(ren));
    setExtras((xs) => xs.map(ren));
    setMaterials((xs) => xs.map(ren));
    touch();
  };

  const fillFromLibrary = (p: PieceRow) => {
    const l = libByType.get(p.pieceType.toLowerCase());
    if (!l) return;
    const hours = Object.fromEntries(Object.entries(l.perUnit).map(([k, v]) => [k, Math.round(v * p.qty * 4) / 4]));
    upPiece(p.id, { hours, unit: l.unit, note: p.note || `Hours from library: ${l.from}` });
  };
  const fillPrice = (m: MaterialRow) => {
    const pr = priceByItem.get(m.item.toLowerCase());
    if (pr && !m.unitPrice) upMat(m.id, { unit: pr.unit, unitPrice: Math.round(pr.price * 100) / 100, note: m.note || `Price book: ${pr.from}` });
  };

  const save = () =>
    start(async () => {
      try {
        await saveShopLines(jobId, { pieces, extras, materials });
        setDirty(false);
        setMsg("Saved.");
        router.refresh();
      } catch (e) {
        setMsg(e instanceof Error ? e.message : "Could not save.");
      }
    });

  const n = (v: string) => (v === "" ? 0 : Number(v));

  return (
    <div>
      {sources.length > 1 && (
        <div className="row" style={{ marginBottom: 16 }}>
          <span className="label">Showing</span>
          {sources.map((s) => (
            <button key={s} className={`btn sm ${s === view ? "" : "line"}`} onClick={() => setView(s)} type="button">
              {s}
              {s === basis ? " (job total)" : ""}
            </button>
          ))}
        </div>
      )}

      <datalist id="lib-types">{library.map((l) => <option key={l.pieceType + l.unit} value={l.pieceType} />)}</datalist>
      <datalist id="price-items">{prices.map((p) => <option key={p.item} value={p.item} />)}</datalist>

      {sections.map((section) => {
        const ps = pieces.filter((p) => p.section === section && inView(p));
        const xs = extras.filter((e) => e.section === section && inView(e));
        const ms = materials.filter((m) => m.section === section && inView(m));
        const st = totals.sections.find((s) => s.section === section);
        let lastGrp = "";
        return (
          <section key={section} style={{ marginBottom: 56 }}>
            <div className="row" style={{ borderBottom: "1px solid var(--ink)", paddingBottom: 8, marginBottom: 4 }}>
              <h2 className="subhead" style={{ fontSize: 20, fontWeight: 300 }}>{section}</h2>
              <button className="link" type="button" onClick={() => renameSection(section)}>Rename</button>
              <span className="spacer" />
              {st && (
                <span className="caption">
                  {hrs(st.personHours)} shop hours · labor {usd(st.labor)} · materials {usd(st.materials)} · <b style={{ color: "var(--ink)", fontWeight: 500 }}>total {usd(st.total)}</b>
                </span>
              )}
            </div>

            <div className="eyebrow" style={{ margin: "20px 0 4px" }}>Pieces · crew-hours by step</div>
            <div className="sw-scroll">
              <table>
                <thead>
                  <tr>
                    <th title="Counts toward the total">In</th>
                    <th>Group</th>
                    <th>Description</th>
                    <th>Piece type</th>
                    <th className="num">Qty</th>
                    <th>Unit</th>
                    {PIECE_TASKS.map((t) => (
                      <th key={t.key} className="num" title={t.hint}>{t.label.replace(" / assembly", "")}</th>
                    ))}
                    <th className="num">Hours</th>
                    <th className="num">Labor</th>
                    <th>Note</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {ps.map((p) => {
                    const lib = libByType.get(p.pieceType.toLowerCase());
                    const head = p.grp && p.grp !== lastGrp;
                    lastGrp = p.grp;
                    return [
                      head ? (
                        <tr key={`g${p.id}`} className="grp"><td colSpan={PIECE_TASKS.length + 10}>{p.grp}</td></tr>
                      ) : null,
                      <tr key={p.id} className={p.include ? "" : "off"}>
                        <td><input type="checkbox" checked={p.include} onChange={(e) => upPiece(p.id, { include: e.target.checked })} /></td>
                        <td><input className="cell s" style={{ width: 110 }} value={p.grp} onChange={(e) => upPiece(p.id, { grp: e.target.value })} /></td>
                        <td><input className="cell w" value={p.description} onChange={(e) => upPiece(p.id, { description: e.target.value })} /></td>
                        <td>
                          <input className="cell m" list="lib-types" value={p.pieceType} onChange={(e) => upPiece(p.id, { pieceType: e.target.value })} />
                          {lib && !pieceHours(p) && (
                            <button className="link" type="button" onClick={() => fillFromLibrary(p)}>Use library hours</button>
                          )}
                        </td>
                        <td><input className="cell n" type="number" step="any" value={p.qty} onChange={(e) => upPiece(p.id, { qty: n(e.target.value) })} /></td>
                        <td>
                          <select className="cell s" value={p.unit} onChange={(e) => upPiece(p.id, { unit: e.target.value })}>
                            {UNITS.map((u) => <option key={u}>{u}</option>)}
                          </select>
                        </td>
                        {PIECE_TASKS.map((t) => (
                          <td key={t.key}>
                            <input
                              className="cell n"
                              style={{ width: 54 }}
                              type="number"
                              step="any"
                              value={p.hours[t.key] ?? ""}
                              onChange={(e) => upPiece(p.id, { hours: { ...p.hours, [t.key]: n(e.target.value) } })}
                            />
                          </td>
                        ))}
                        <td className="num">{hrs(pieceHours(p))}</td>
                        <td className="num">{usd(pieceLabor(p, rates))}</td>
                        <td><input className="cell m" value={p.note} title={p.note} onChange={(e) => upPiece(p.id, { note: e.target.value })} /></td>
                        <td><button className="link" type="button" onClick={() => { setPieces((a) => a.filter((x) => x.id !== p.id)); touch(); }}>Remove</button></td>
                      </tr>,
                    ];
                  })}
                  <tr className="sub">
                    <td colSpan={6}><button className="link" type="button" onClick={() => addPiece(section)}>Add piece</button></td>
                    {PIECE_TASKS.map((t) => (
                      <td key={t.key} className="num">{hrs(st?.byTask[t.key]?.hours ?? 0)}</td>
                    ))}
                    <td className="num">{hrs(PIECE_TASKS.reduce((a, t) => a + (st?.byTask[t.key]?.hours ?? 0), 0))}</td>
                    <td colSpan={3} />
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="eyebrow" style={{ margin: "28px 0 4px" }}>Job tasks and lump sums</div>
            <div className="sw-scroll">
              <table>
                <thead>
                  <tr>
                    <th>In</th>
                    <th>Task</th>
                    <th>Label</th>
                    <th>Who</th>
                    <th className="num">Hours</th>
                    <th className="num" title="People per crew-hour">Crew</th>
                    <th className="num" title="Blank = job shop rate">Rate</th>
                    <th className="num" title="Fixed amount instead of hours">Lump $</th>
                    <th className="num">Cost</th>
                    <th>Note</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {xs.map((x) => (
                    <tr key={x.id} className={x.include ? "" : "off"}>
                      <td><input type="checkbox" checked={x.include} onChange={(e) => upExtra(x.id, { include: e.target.checked })} /></td>
                      <td>
                        <select className="cell" style={{ width: 170 }} value={x.task} onChange={(e) => upExtra(x.id, { task: e.target.value })}>
                          {[...JOB_TASKS, ...PIECE_TASKS].map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
                        </select>
                      </td>
                      <td><input className="cell m" value={x.label} placeholder={taskLabel(x.task)} onChange={(e) => upExtra(x.id, { label: e.target.value })} /></td>
                      <td><input className="cell" style={{ width: 120 }} value={x.who} onChange={(e) => upExtra(x.id, { who: e.target.value })} /></td>
                      <td><input className="cell n" type="number" step="any" value={x.hours} onChange={(e) => upExtra(x.id, { hours: n(e.target.value) })} /></td>
                      <td><input className="cell n" style={{ width: 48 }} type="number" step="any" value={x.crew} onChange={(e) => upExtra(x.id, { crew: n(e.target.value) || 1 })} /></td>
                      <td><input className="cell n" type="number" step="any" value={x.rate ?? ""} placeholder={String(rates.shopRate)} onChange={(e) => upExtra(x.id, { rate: e.target.value === "" ? null : Number(e.target.value) })} /></td>
                      <td><input className="cell n" style={{ width: 84 }} type="number" step="any" value={x.lump ?? ""} onChange={(e) => upExtra(x.id, { lump: e.target.value === "" ? null : Number(e.target.value) })} /></td>
                      <td className="num">{usd(extraCost(x, rates))}</td>
                      <td><input className="cell m" value={x.note} title={x.note} onChange={(e) => upExtra(x.id, { note: e.target.value })} /></td>
                      <td><button className="link" type="button" onClick={() => { setExtras((a) => a.filter((y) => y.id !== x.id)); touch(); }}>Remove</button></td>
                    </tr>
                  ))}
                  <tr><td colSpan={11}><button className="link" type="button" onClick={() => addExtra(section)}>Add task or lump sum</button></td></tr>
                </tbody>
              </table>
            </div>

            <div className="eyebrow" style={{ margin: "28px 0 4px" }}>Materials</div>
            <div className="sw-scroll">
              <table>
                <thead>
                  <tr>
                    <th>In</th>
                    <th>Item</th>
                    <th className="num">Qty</th>
                    <th>Unit</th>
                    <th className="num">Unit price</th>
                    <th>Vendor</th>
                    <th className="num">Cost</th>
                    <th>Note</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {ms.map((m) => (
                    <tr key={m.id} className={m.include ? "" : "off"}>
                      <td><input type="checkbox" checked={m.include} onChange={(e) => upMat(m.id, { include: e.target.checked })} /></td>
                      <td><input className="cell w" list="price-items" value={m.item} onChange={(e) => upMat(m.id, { item: e.target.value })} onBlur={() => fillPrice(m)} /></td>
                      <td><input className="cell n" style={{ width: 72 }} type="number" step="any" value={m.qty} onChange={(e) => upMat(m.id, { qty: n(e.target.value) })} /></td>
                      <td>
                        <select className="cell s" value={m.unit} onChange={(e) => upMat(m.id, { unit: e.target.value })}>
                          {MAT_UNITS.map((u) => <option key={u}>{u}</option>)}
                        </select>
                      </td>
                      <td><input className="cell n" style={{ width: 84 }} type="number" step="any" value={m.unitPrice} onChange={(e) => upMat(m.id, { unitPrice: n(e.target.value) })} /></td>
                      <td><input className="cell" style={{ width: 150 }} value={m.vendor} onChange={(e) => upMat(m.id, { vendor: e.target.value })} /></td>
                      <td className="num">{usd(materialCost(m))}</td>
                      <td><input className="cell m" value={m.note} title={m.note} onChange={(e) => upMat(m.id, { note: e.target.value })} /></td>
                      <td><button className="link" type="button" onClick={() => { setMaterials((a) => a.filter((y) => y.id !== m.id)); touch(); }}>Remove</button></td>
                    </tr>
                  ))}
                  <tr><td colSpan={9}><button className="link" type="button" onClick={() => addMat(section)}>Add material</button></td></tr>
                </tbody>
              </table>
            </div>

            {st && (
              <table style={{ maxWidth: 420, marginLeft: "auto", marginTop: 20 }}>
                <tbody>
                  <tr><td>Labor</td><td className="num">{usd(st.labor)}</td></tr>
                  <tr><td>Materials</td><td className="num">{usd(st.materials)}</td></tr>
                  <tr><td>Buffer {Math.round(rates.bufferPct * 100)}%</td><td className="num">{usd(st.buffer)}</td></tr>
                  {rates.taxPct > 0 && <tr><td>Tax {(rates.taxPct * 100).toFixed(1)}%</td><td className="num">{usd(st.tax)}</td></tr>}
                  <tr className="total"><td>{section} total</td><td className="num">{usd(st.total)}</td></tr>
                </tbody>
              </table>
            )}
          </section>
        );
      })}

      <div className="row">
        <button className="btn line" type="button" onClick={addSection}>Add section</button>
      </div>

      <div className="sticky-save row">
        <span className="caption">
          {view} · {hrs(totals.personHours)} shop hours · labor {usd(totals.labor)} · materials {usd(totals.materials)} · buffer {usd(totals.buffer)}
          {totals.tax ? ` · tax ${usd(totals.tax)}` : ""}
        </span>
        <span className="subhead">Total {usd(totals.total)}</span>
        <span className="spacer" />
        {msg && <span className="caption">{msg}</span>}
        <button className="btn" type="button" disabled={!dirty || pending} onClick={save}>
          {pending ? "Saving" : dirty ? "Save changes" : "Saved"}
        </button>
      </div>
    </div>
  );
}
