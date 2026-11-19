import "server-only";
import ExcelJS from "exceljs";
import type { EstimateLine, Project, TradePackage, Settings } from "@/db/schema";
import { DIVISIONS, divisionName } from "./csi";
import { computeTotals, lineParts } from "./totals";

const MONEY = '"$"#,##0';
const MONEY2 = '"$"#,##0.00';
const HEAD_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0EFEA" } };
const INPUT_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF6D5" } };

function header(ws: ExcelJS.Worksheet, row: number) {
  const r = ws.getRow(row);
  r.font = { bold: true, name: "Arial", size: 10 };
  r.eachCell((c) => { c.fill = HEAD_FILL; c.border = { bottom: { style: "thin", color: { argb: "FF1A1A18" } } }; });
}

export async function buildRomWorkbook(p: Project, lines: EstimateLine[], packages: TradePackage[], s: Settings) {
  const wb = new ExcelJS.Workbook();
  wb.creator = s.company.name;
  wb.created = new Date();
  const t = computeTotals(lines, p.markups);
  const m = p.markups;

  const sum = wb.addWorksheet("Summary");
  const d = wb.addWorksheet("Detail", { views: [{ state: "frozen", ySplit: 1 }] });
  const tp = wb.addWorksheet("Trade Packages");
  const imp = wb.addWorksheet("Import");
  // ---- Rates (inputs) ----
  const rates = wb.addWorksheet("Rates");
  rates.columns = [{ width: 34 }, { width: 14 }];
  rates.addRow(["Markup", "Value"]);
  header(rates, 1);
  const inputs: [string, number][] = [
    ["Contingency %", m.contingencyPct / 100],
    ["Insurance & WA B&O %", m.insurancePct / 100],
    ["Overhead %", m.overheadPct / 100],
    ["Contractor fee %", m.feePct / 100],
    ["WA sales tax %", m.taxPct / 100],
    ["Gross SF", p.totalSf ?? 0],
  ];
  inputs.forEach(([k, v], i) => {
    const r = rates.addRow([k, v]);
    r.getCell(2).numFmt = i < 5 ? "0.00%" : "#,##0";
    r.getCell(2).fill = INPUT_FILL;
    r.getCell(2).font = { color: { argb: "FF1F4E9E" }, name: "Arial" };
  });
  rates.addRow([]);
  rates.addRow(["Labor role", "$/hr"]);
  header(rates, rates.rowCount);
  for (const [k, v] of Object.entries(s.laborRates)) rates.addRow([k, v]).getCell(2).numFmt = MONEY;

  // ---- Detail ----
  d.columns = [
    { header: "Div", key: "div", width: 6 },
    { header: "Division", key: "divname", width: 26 },
    { header: "Cost code", key: "code", width: 11 },
    { header: "Description", key: "desc", width: 44 },
    { header: "Scope included", key: "scope", width: 60 },
    { header: "Qty", key: "qty", width: 10 },
    { header: "Unit", key: "unit", width: 7 },
    { header: "Labor hrs/unit", key: "hpu", width: 11 },
    { header: "Labor $/hr", key: "rate", width: 10 },
    { header: "Material $/unit", key: "mat", width: 12 },
    { header: "Sub $/unit", key: "sub", width: 12 },
    { header: "Labor hrs", key: "hrs", width: 10 },
    { header: "Labor $", key: "labor", width: 12 },
    { header: "Material $", key: "material", width: 12 },
    { header: "Sub $", key: "subt", width: 12 },
    { header: "Total $", key: "total", width: 13 },
    { header: "Allowance", key: "allow", width: 9 },
    { header: "Trade", key: "trade", width: 18 },
    { header: "Note", key: "note", width: 50 },
  ];
  header(d, 1);
  for (const l of lines) {
    const r = d.addRow({
      div: l.division, divname: divisionName(l.division), code: l.csiCode, desc: l.description, scope: l.scope,
      qty: l.qty, unit: l.unit, hpu: l.laborHoursPerUnit, rate: l.laborRate, mat: l.materialUnit, sub: l.subUnit,
      allow: l.isAllowance ? "Yes" : "", trade: l.trade, note: l.note,
    });
    const n = r.number;
    const p2 = lineParts(l);
    r.getCell("hrs").value = { formula: `F${n}*H${n}`, result: p2.laborHours };
    r.getCell("labor").value = { formula: `L${n}*I${n}`, result: p2.labor };
    r.getCell("material").value = { formula: `F${n}*J${n}`, result: p2.material };
    r.getCell("subt").value = { formula: `F${n}*K${n}`, result: p2.sub };
    r.getCell("total").value = { formula: `M${n}+N${n}+O${n}`, result: p2.total };
    for (const k of ["rate", "mat", "sub"]) r.getCell(k).numFmt = MONEY2;
    for (const k of ["labor", "material", "subt", "total"]) r.getCell(k).numFmt = MONEY;
    r.getCell("hrs").numFmt = "#,##0.0";
    r.alignment = { vertical: "top", wrapText: false };
    r.getCell("scope").alignment = { wrapText: true, vertical: "top" };
  }
  const last = Math.max(2, d.rowCount);
  d.autoFilter = { from: "A1", to: `S${last}` };

  // ---- Summary ----
  sum.columns = [{ width: 6 }, { width: 32 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 15 }, { width: 10 }, { width: 11 }];
  sum.addRow([s.company.name.toUpperCase()]).font = { bold: true, name: "Arial", size: 12 };
  sum.addRow([`${p.name} · Rough order of magnitude · Rev ${p.revision}`]).font = { name: "Arial", size: 11 };
  sum.addRow([[p.client, p.architect, p.city, p.totalSf ? `${p.totalSf} SF` : ""].filter(Boolean).join(" · ")]).font = { name: "Arial", color: { argb: "FF6A6A64" } };
  sum.addRow([]);
  sum.addRow(["Div", "Division", "Labor", "Material", "Sub", "Total", "% direct", "$/SF"]);
  header(sum, 5);
  const first = 6;
  DIVISIONS.forEach((dv, i) => {
    const row = first + i;
    const f = (col: string) => ({ formula: `SUMIF(Detail!$A:$A,"${dv.code}",Detail!${col}:${col})`, result: t.divisions[i][col === "M" ? "labor" : col === "N" ? "material" : col === "O" ? "sub" : "total"] });
    const r = sum.addRow([dv.code, dv.name, f("M"), f("N"), f("O"), f("P")]);
    r.getCell(7).value = { formula: `IF($F$${first + 16}=0,0,F${row}/$F$${first + 16})`, result: t.direct ? t.divisions[i].total / t.direct : 0 };
    r.getCell(8).value = { formula: `IF(Rates!$B$7=0,0,F${row}/Rates!$B$7)`, result: p.totalSf ? t.divisions[i].total / p.totalSf : 0 };
    [3, 4, 5, 6, 8].forEach((c) => (r.getCell(c).numFmt = MONEY));
    r.getCell(7).numFmt = "0.0%";
  });
  const dr = first + 16;
  const lastDiv = first + 15;
  const directRow = sum.addRow(["", "Direct cost", { formula: `SUM(C${first}:C${lastDiv})` }, { formula: `SUM(D${first}:D${lastDiv})` }, { formula: `SUM(E${first}:E${lastDiv})` }, { formula: `SUM(F${first}:F${lastDiv})`, result: t.direct }]);
  directRow.font = { bold: true };
  [3, 4, 5, 6].forEach((c) => (directRow.getCell(c).numFmt = MONEY));
  const chain: [string, string, number][] = [
    ["Contingency", `F${dr}*Rates!B2`, t.contingency],
    ["Insurance & WA B&O", `(F${dr}+F${dr + 1})*Rates!B3`, t.insurance],
    ["Overhead", `(F${dr}+F${dr + 1}+F${dr + 2})*Rates!B4`, t.overhead],
    ["Contractor fee", `(F${dr}+F${dr + 1}+F${dr + 2}+F${dr + 3})*Rates!B5`, t.fee],
    ["Subtotal", `SUM(F${dr}:F${dr + 4})`, t.subtotal],
    ["WA sales tax", `F${dr + 5}*Rates!B6`, t.tax],
    ["Contract total", `F${dr + 5}+F${dr + 6}`, t.total],
  ];
  for (const [label, formula, result] of chain) {
    const r = sum.addRow(["", label, "", "", "", { formula, result }]);
    r.getCell(6).numFmt = MONEY;
    if (label === "Contract total") r.font = { bold: true, size: 12 };
  }
  sum.addRow([]);
  sum.addRow(["", "Self-performed labor hours", "", "", "", { formula: "SUM(Detail!L:L)", result: t.laborHours }]).getCell(6).numFmt = "#,##0";
  sum.addRow(["", "Contract $/SF incl. tax", "", "", "", { formula: `IF(Rates!B7=0,0,F${dr + 7}/Rates!B7)`, result: p.totalSf ? t.total / p.totalSf : 0 }]).getCell(6).numFmt = MONEY;

  // ---- Trade packages ----
  tp.columns = [{ header: "Trade", width: 24 }, { header: "Item", width: 44 }, { header: "Spec", width: 40 }, { header: "Qty", width: 10 }, { header: "Unit", width: 8 }, { header: "Notes", width: 40 }];
  header(tp, 1);
  for (const x of packages) {
    tp.addRow([x.trade, `ROM carried: $${Math.round(x.estimatedPrice).toLocaleString()}`, x.bidAmount ? `Bid: $${x.bidAmount.toLocaleString()} ${x.bidVendor}` : "", "", "", x.sheetRefs]).font = { bold: true };
    for (const mt of x.materials) tp.addRow([x.trade, mt.item, mt.spec, mt.qty, mt.unit, mt.notes]);
  }

  // ---- Import: flat cost items for production platforms (JobTread, Buildertrend, etc.) ----
  imp.columns = [
    { header: "Cost Code", width: 12 }, { header: "Cost Group", width: 28 }, { header: "Name", width: 44 }, { header: "Description", width: 60 },
    { header: "Cost Type", width: 14 }, { header: "Quantity", width: 10 }, { header: "Unit", width: 8 }, { header: "Unit Cost", width: 12 },
    { header: "Extended Cost", width: 14 }, { header: "Markup %", width: 10 }, { header: "Unit Price", width: 12 }, { header: "Allowance", width: 10 },
  ];
  header(imp, 1);
  const markupFactor = t.direct ? (t.subtotal / t.direct) : 1;
  for (const l of lines) {
    const code = l.csiCode || `${l.division} 00 00`;
    const group = `${l.division} ${divisionName(l.division)}`;
    const parts: [string, number, number, string][] = [];
    const p2 = lineParts(l);
    if (p2.labor) parts.push(["Labor", l.qty * l.laborHoursPerUnit, l.laborRate, "HR"]);
    if (p2.material) parts.push(["Materials", l.qty, l.materialUnit, l.unit]);
    if (p2.sub) parts.push(["Subcontractor", l.qty, l.subUnit, l.unit]);
    if (!parts.length) parts.push(["Other", l.qty, 0, l.unit]);
    for (const [type, qty, unitCost, unit] of parts) {
      const r = imp.addRow([code, group, l.description, l.scope, type, Math.round(qty * 100) / 100, unit, unitCost, qty * unitCost, Math.round((markupFactor - 1) * 10000) / 100, unitCost * markupFactor, l.isAllowance ? "Yes" : ""]);
      [8, 9, 11].forEach((c) => (r.getCell(c).numFmt = MONEY2));
    }
  }

  wb.eachSheet((ws) => ws.eachRow((r) => r.eachCell((c) => { c.font = { ...(c.font ?? {}), name: "Arial" }; })));
  return wb;
}

export async function buildMaterialsWorkbook(p: Project, x: TradePackage, s: Settings) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(x.trade.slice(0, 30).replace(/[\\/?*[\]:]/g, "-"));
  ws.columns = [{ width: 6 }, { width: 44 }, { width: 40 }, { width: 10 }, { width: 8 }, { width: 13 }, { width: 14 }, { width: 36 }];
  ws.addRow([`${s.company.name} · Request for bid`]).font = { bold: true, size: 12 };
  ws.addRow([`${p.name} · ${x.trade}`]);
  ws.addRow([[p.address, p.city, p.architect].filter(Boolean).join(" · ")]);
  ws.addRow([]);
  ws.addRow(["#", "Item", "Spec", "Qty", "Unit", "Unit price", "Total", "Notes"]);
  header(ws, 5);
  x.materials.forEach((m, i) => {
    const r = ws.addRow([i + 1, m.item, m.spec, m.qty, m.unit, null, null, m.notes]);
    r.getCell(6).fill = INPUT_FILL;
    r.getCell(6).numFmt = MONEY2;
    r.getCell(7).value = { formula: `IF(F${r.number}="","",D${r.number}*F${r.number})` };
    r.getCell(7).numFmt = MONEY;
  });
  const end = ws.rowCount;
  ws.addRow([]);
  const tot = ws.addRow(["", "Material total", "", "", "", "", { formula: `SUM(G6:G${end})` }]);
  tot.font = { bold: true };
  tot.getCell(7).numFmt = MONEY;
  const lab = ws.addRow(["", "Labor / install", "", "", "", "", null]);
  lab.getCell(7).fill = INPUT_FILL;
  lab.getCell(7).numFmt = MONEY;
  const base = ws.addRow(["", "Base bid (excl. WA sales tax)", "", "", "", "", { formula: `G${tot.number}+G${lab.number}` }]);
  base.font = { bold: true };
  base.getCell(7).numFmt = MONEY;
  return wb;
}
