import "server-only";
import ExcelJS from "exceljs";
import { PIECE_TASKS, crewOf, taskLabel } from "./model";
import { jobTotals, ratesOf, type FullShopJob } from "./data";

const MONEY = '"$"#,##0';
const MONEY2 = '"$"#,##0.00';
const FONT = { name: "Inter", size: 10 } as const;
const INK = { argb: "FF1A1A1A" };
const MUTED = { argb: "FF6B6B67" };
const RULE = { argb: "FFDADAD6" };

const colL = (n: number) => {
  let s = "";
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
};

function head(row: ExcelJS.Row) {
  row.eachCell((c) => {
    c.font = { ...FONT, size: 8, bold: true, color: MUTED };
    c.border = { bottom: { style: "thin", color: INK } };
  });
}
const ruleBelow = (row: ExcelJS.Row) => row.eachCell((c) => { c.border = { bottom: { style: "hair", color: RULE } }; });

/**
 * Shop ROM workbook in the layout the shop already uses: a Summary sheet, then one sheet per section with
 * the labor-by-task table and materials up top, the subtotal / markup / tax / total block, and the
 * piece-by-step hours grid below. Everything is live formulas.
 */
export async function buildShopWorkbook(full: FullShopJob) {
  const { job } = full;
  const rates = ratesOf(job);
  const basis = job.basis;
  const t = jobTotals(full);
  const wb = new ExcelJS.Workbook();
  wb.creator = "Sparrow Woodworks";
  wb.created = new Date();

  const sum = wb.addWorksheet(`${job.name} Summary`.slice(0, 31));
  sum.columns = [{ width: 34 }, { width: 16 }, { width: 60 }];
  sum.getCell("A1").value = `${job.name} ROM Summary`;
  sum.getCell("A1").font = { ...FONT, size: 18 };
  sum.getCell("A2").value = [job.architect, job.location, job.costYear, `Priced from: ${basis}`].filter(Boolean).join(" · ");
  sum.getCell("A2").font = { ...FONT, color: MUTED };
  const sumHead = sum.getRow(4);
  sumHead.values = ["Section", "Total", "Notes"];
  head(sumHead);

  let sumRow = 5;
  const usedNames = new Set<string>();
  for (const sec of t.sections) {
    let name = `${sec.section} ROM`.replace(/[\\/?*[\]:]/g, " ").slice(0, 31);
    while (usedNames.has(name)) name = `${name.slice(0, 28)} ${usedNames.size}`;
    usedNames.add(name);
    const ws = wb.addWorksheet(name);
    ws.columns = [{ width: 44 }, { width: 16 }, { width: 10 }, { width: 10 }, { width: 12 }, { width: 26 }, { width: 4 }, { width: 4 }, { width: 4 }, { width: 46 }, { width: 18 }, { width: 16 }, { width: 34 }];
    ws.getCell("B2").value = `${sec.section} ROM`;
    ws.getCell("B2").font = { ...FONT, size: 16 };

    const pieces = full.pieces.filter((p) => p.section === sec.section && p.source === basis && p.include);
    const extras = full.extras.filter((e) => e.section === sec.section && e.source === basis && e.include);
    const mats = full.materials.filter((m) => m.section === sec.section && m.source === basis && m.include);

    // Piece grid sits below the summary block; place it after the longer of labor rows / material rows.
    const laborRows = PIECE_TASKS.length + extras.length;
    const topRows = Math.max(laborRows, mats.length);
    const subRow = 5 + topRows + 1;
    const gridHead = subRow + 9;
    const gridFirst = gridHead + 1;
    const gridLast = gridFirst + Math.max(pieces.length, 1) - 1;
    const gridTotal = gridLast + 1;
    // Grid columns: A description, B..K task hours, L total
    const taskCol = (i: number) => colL(2 + i);

    const h = ws.getRow(4);
    h.values = ["Labor / task", "Who", "Hours", "cost/hr", "costs", "Notes", "", "", "", "Material", "Who", "costs or allowances", "Notes"];
    head(h);

    let r = 5;
    PIECE_TASKS.forEach((task, i) => {
      const row = ws.getRow(r);
      row.getCell(1).value = task.label;
      row.getCell(3).value = { formula: `${taskCol(i)}${gridTotal}` };
      row.getCell(4).value = rates.shopRate * crewOf(rates, task.key);
      row.getCell(5).value = { formula: `C${r}*D${r}` };
      if (crewOf(rates, task.key) > 1) row.getCell(6).value = `Crew of ${crewOf(rates, task.key)}`;
      r++;
    });
    for (const e of extras) {
      const row = ws.getRow(r);
      row.getCell(1).value = e.label || taskLabel(e.task);
      row.getCell(2).value = e.who;
      if (e.lump != null) {
        row.getCell(5).value = e.lump;
        row.getCell(6).value = e.note || "Lump sum";
      } else {
        row.getCell(3).value = e.hours;
        row.getCell(4).value = (e.rate ?? rates.shopRate) * (e.crew || 1);
        row.getCell(5).value = { formula: `C${r}*D${r}` };
        row.getCell(6).value = e.note;
      }
      r++;
    }
    mats.forEach((m, i) => {
      const row = ws.getRow(5 + i);
      row.getCell(10).value = `${m.item} (${m.qty} ${m.unit} @ $${m.unitPrice})`;
      row.getCell(11).value = m.vendor;
      row.getCell(12).value = { formula: `${m.qty}*${m.unitPrice}` };
      row.getCell(13).value = m.note;
    });
    for (let i = 5; i < subRow; i++) {
      ws.getRow(i).getCell(5).numFmt = MONEY2;
      ws.getRow(i).getCell(4).numFmt = MONEY;
      ws.getRow(i).getCell(12).numFmt = MONEY2;
      ruleBelow(ws.getRow(i));
    }

    const S = subRow;
    const put = (row: number, col: number, v: ExcelJS.CellValue, fmt?: string) => {
      const c = ws.getRow(row).getCell(col);
      c.value = v;
      if (fmt) c.numFmt = fmt;
      return c;
    };
    put(S, 1, "Sub Total").font = { ...FONT, bold: true };
    put(S, 5, { formula: `SUM(E5:E${S - 1})` }, MONEY2);
    put(S, 10, "Sub Total").font = { ...FONT, bold: true };
    put(S, 12, { formula: `SUM(L5:L${S - 1})` }, MONEY2);
    put(S + 1, 1, "Markup (buffer)");
    put(S + 1, 5, rates.bufferPct, "0%");
    put(S + 1, 10, "Markup (buffer)");
    put(S + 1, 12, rates.bufferPct, "0%");
    put(S + 2, 1, "Tax");
    put(S + 2, 5, rates.taxPct, "0.0%");
    put(S + 2, 10, "Tax");
    put(S + 2, 12, rates.taxPct, "0.0%");
    put(S + 3, 1, "Total").font = { ...FONT, bold: true };
    put(S + 3, 5, { formula: `E${S}*(1+E${S + 1})*(1+E${S + 2})` }, MONEY2);
    put(S + 3, 10, "Total").font = { ...FONT, bold: true };
    put(S + 3, 12, { formula: `L${S}*(1+L${S + 1})*(1+L${S + 2})` }, MONEY2);
    put(S + 5, 6, "Total:").font = { ...FONT, bold: true };
    const totalCell = put(S + 5, 9, { formula: `E${S + 3}+L${S + 3}` }, MONEY2);
    totalCell.font = { ...FONT, bold: true };
    ws.mergeCells(S + 5, 9, S + 5, 10);
    for (const c of [1, 5, 10, 12]) ws.getRow(S).getCell(c).border = { top: { style: "thin", color: INK } };
    for (const c of [1, 5, 10, 12]) ws.getRow(S + 3).getCell(c).border = { top: { style: "thin", color: INK } };

    // Piece grid
    const gh = ws.getRow(gridHead);
    gh.values = ["Piece", ...PIECE_TASKS.map((x) => `${x.label} (HR)`), "Total (HR)", "Qty", "Unit", "Piece type", "Note"];
    head(gh);
    pieces.forEach((p, i) => {
      const row = ws.getRow(gridFirst + i);
      row.getCell(1).value = `${p.qty} ${p.unit === "EA" ? "@" : p.unit + " @"} ${p.description}`;
      PIECE_TASKS.forEach((task, j) => (row.getCell(2 + j).value = Number(p.hours[task.key]) || 0));
      row.getCell(12).value = { formula: `SUM(B${gridFirst + i}:K${gridFirst + i})` };
      row.getCell(13).value = p.qty;
      row.getCell(14).value = p.unit;
      row.getCell(15).value = p.pieceType;
      row.getCell(16).value = p.note;
      ruleBelow(row);
    });
    const gt = ws.getRow(gridTotal);
    gt.getCell(1).value = "Total (HR)";
    for (let j = 0; j <= PIECE_TASKS.length; j++) gt.getCell(2 + j).value = { formula: `SUM(${colL(2 + j)}${gridFirst}:${colL(2 + j)}${gridLast})` };
    gt.eachCell((c) => { c.font = { ...FONT, bold: true }; c.border = { top: { style: "thin", color: INK } }; });

    ws.eachRow((row) => row.eachCell((c) => { c.font = { ...FONT, ...(c.font ?? {}), name: "Inter" }; }));

    // Summary link
    const sr = sum.getRow(sumRow++);
    sr.getCell(1).value = sec.section;
    sr.getCell(2).value = { formula: `'${name}'!I${S + 5}` };
    sr.getCell(2).numFmt = MONEY2;
    sr.getCell(3).value = job.sectionCodes?.[sec.section] ? `Cost code ${job.sectionCodes[sec.section]}` : "";
    ruleBelow(sr);
  }
  const tr = sum.getRow(sumRow + 1);
  tr.getCell(1).value = "Total:";
  tr.getCell(2).value = { formula: `SUM(B5:B${sumRow - 1})` };
  tr.getCell(2).numFmt = MONEY2;
  tr.eachCell((c) => { c.font = { ...FONT, bold: true }; c.border = { top: { style: "thin", color: INK } }; });
  sum.getRow(sumRow + 3).getCell(1).value = `Buffer ${Math.round(rates.bufferPct * 100)}% is carried on labor and materials. ${rates.taxPct ? `Tax ${(rates.taxPct * 100).toFixed(1)}%.` : "No tax; when this goes into a Sparrow GC estimate the GC fee and tax are added there."}`;
  sum.getRow(sumRow + 3).getCell(1).font = { ...FONT, color: MUTED };
  sum.eachRow((row) => row.eachCell((c) => { c.font = { ...FONT, ...(c.font ?? {}), name: "Inter" }; }));
  return wb;
}
