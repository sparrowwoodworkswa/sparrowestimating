import type { EstimateLine, Markups, Project } from "@/db/schema";
import { DIVISIONS } from "./csi";

export type LineLike = Pick<
  EstimateLine,
  "qty" | "laborHoursPerUnit" | "laborRate" | "materialUnit" | "subUnit" | "division" | "isAllowance" | "trade"
>;

export function lineParts(l: LineLike) {
  const laborHours = l.qty * l.laborHoursPerUnit;
  const labor = laborHours * l.laborRate;
  const material = l.qty * l.materialUnit;
  const sub = l.qty * l.subUnit;
  return { laborHours, labor, material, sub, total: labor + material + sub };
}

export function lineUnitCost(l: LineLike) {
  return l.laborHoursPerUnit * l.laborRate + l.materialUnit + l.subUnit;
}

export type Totals = ReturnType<typeof computeTotals>;

export function markupChain(direct: number, m: Markups) {
  const contingency = direct * (m.contingencyPct / 100);
  const base = direct + contingency;
  const insurance = base * (m.insurancePct / 100);
  const overhead = (base + insurance) * (m.overheadPct / 100);
  const fee = (base + insurance + overhead) * (m.feePct / 100);
  const subtotal = base + insurance + overhead + fee;
  const tax = subtotal * (m.taxPct / 100);
  const total = subtotal + tax;
  return { direct, contingency, insurance, overhead, fee, subtotal, tax, total, factor: direct ? total / direct : 1 };
}

export function computeTotals(lines: LineLike[], m: Markups) {
  const divisions = DIVISIONS.map((d) => ({ ...d, labor: 0, material: 0, sub: 0, total: 0, hours: 0, count: 0, allowance: 0 }));
  let laborHours = 0;
  let selfPerformed = 0;
  for (const l of lines) {
    const p = lineParts(l);
    const d = divisions.find((x) => x.code === l.division);
    if (d) {
      d.labor += p.labor;
      d.material += p.material;
      d.sub += p.sub;
      d.total += p.total;
      d.hours += p.laborHours;
      d.count += 1;
      if (l.isAllowance) d.allowance += p.total;
    }
    laborHours += p.laborHours;
    if (l.trade === "Sparrow") selfPerformed += p.total;
  }
  const direct = divisions.reduce((a, d) => a + d.total, 0);
  const chain = markupChain(direct, m);
  return { ...chain, divisions, laborHours, selfPerformed, lineCount: lines.length };
}

/** Totals for a project, falling back to typed overrides for historical jobs with no line items. */
export function projectHeadline(p: Project, lines: LineLike[]) {
  if (lines.length) {
    const t = computeTotals(lines, p.markups);
    return { direct: t.direct, total: t.total, fromLines: true };
  }
  return {
    direct: p.directCostOverride ?? null,
    total: p.contractTotalOverride ?? null,
    fromLines: false,
  };
}

export const usd = (n: number | null | undefined, digits = 0) =>
  n == null || Number.isNaN(n)
    ? "–"
    : n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: digits, minimumFractionDigits: digits });

export const num = (n: number | null | undefined, digits = 0) =>
  n == null ? "–" : n.toLocaleString("en-US", { maximumFractionDigits: digits, minimumFractionDigits: 0 });

export const pct = (n: number, digits = 1) => `${n.toFixed(digits)}%`;
