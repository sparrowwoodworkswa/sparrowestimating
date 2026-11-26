// Shop (cabinetry + woodworking) estimating model. Shared by server and client code.
// Mirrors how the shop ROM sheets work: each piece gets crew-hours per production step,
// hours x crew x shop rate = labor, plus a materials list, then a % buffer, then (optionally) tax.

export const PIECE_TASKS = [
  { key: "milling", label: "Milling", hint: "Cutting out carcasses, rough cutting doors, drawers, finished ends" },
  { key: "glueup", label: "Glue-up / assembly", hint: "Assembling carcasses, glue-up pieces" },
  { key: "sizing", label: "Sizing", hint: "Cutting doors, drawers, finished ends, fillers to size" },
  { key: "boring", label: "Boring", hint: "Hinge, shelf-pin and hardware boring" },
  { key: "shelves", label: "Shelves", hint: "Shelf making" },
  { key: "banding", label: "Banding", hint: "Applying and trimming edge banding, breaking edges" },
  { key: "sanding", label: "Sanding", hint: "Final sanding of doors, drawers, finished ends, fillers, open cabinets" },
  { key: "hardware", label: "Hardware", hint: "Hinges, slides, brackets, pulls" },
  { key: "finish", label: "Finish", hint: "Stain and clear coats" },
  { key: "install", label: "Install", hint: "Installing in place, scribing, cutting in" },
] as const;

export const JOB_TASKS = [
  { key: "estimating", label: "Estimating and ordering" },
  { key: "drawings", label: "Drawings" },
  { key: "mockup", label: "Mockups and samples" },
  { key: "handling", label: "Material handling" },
  { key: "packaging", label: "Packaging" },
  { key: "transport", label: "Transport" },
  { key: "other", label: "Other" },
] as const;

export type PieceTaskKey = (typeof PIECE_TASKS)[number]["key"];
export type JobTaskKey = (typeof JOB_TASKS)[number]["key"];
export type TaskKey = PieceTaskKey | JobTaskKey;
export const ALL_TASKS: { key: TaskKey; label: string }[] = [...PIECE_TASKS, ...JOB_TASKS];
export const taskLabel = (k: string) => ALL_TASKS.find((t) => t.key === k)?.label ?? k;

export type TaskHours = Partial<Record<PieceTaskKey, number>>;

/** People per crew-hour, by task. The sheets price install and packaging at 2 x $105. */
export const DEFAULT_CREWS: Partial<Record<TaskKey, number>> = { install: 2, packaging: 2, transport: 2 };

export const SOURCES = ["Sparrow estimate", "Claude takeoff", "Actual", "Reference rate"] as const;
export const JOB_STATUSES = [
  { key: "estimating", label: "Estimating" },
  { key: "bid", label: "Bid sent" },
  { key: "won", label: "Won" },
  { key: "lost", label: "Lost" },
  { key: "production", label: "In production" },
  { key: "complete", label: "Complete" },
] as const;
export const statusLabel = (k: string) => JOB_STATUSES.find((s) => s.key === k)?.label ?? k;

export const UNITS = ["EA", "LF", "SF", "LS", "SET"] as const;
export const MAT_UNITS = ["BF", "SHT", "LF", "SF", "EA", "LS", "GAL"] as const;

// Plain shapes used by the editor (rows from the db map onto these).
export type PieceRow = {
  id?: number;
  section: string;
  grp: string;
  description: string;
  pieceType: string;
  qty: number;
  unit: string;
  hours: TaskHours;
  include: boolean;
  source: string;
  note: string;
  sort: number;
};
export type ExtraRow = {
  id?: number;
  section: string;
  task: string; // JobTaskKey or a piece task (e.g. a lump finish)
  label: string;
  who: string;
  hours: number;
  crew: number;
  rate: number | null; // null = job shop rate
  lump: number | null; // a fixed amount instead of hours (sub finish, drawings)
  include: boolean;
  source: string;
  note: string;
  sort: number;
};
export type MaterialRow = {
  id?: number;
  section: string;
  item: string;
  qty: number;
  unit: string;
  unitPrice: number;
  vendor: string;
  include: boolean;
  source: string;
  note: string;
  sort: number;
};
export type JobRates = { shopRate: number; bufferPct: number; taxPct: number; crews: Partial<Record<TaskKey, number>> };

export const pieceHours = (p: PieceRow) => PIECE_TASKS.reduce((a, t) => a + (Number(p.hours[t.key]) || 0), 0);
export const crewOf = (rates: JobRates, task: string) => rates.crews[task as TaskKey] ?? DEFAULT_CREWS[task as TaskKey] ?? 1;

/** Labor dollars for one piece row. */
export function pieceLabor(p: PieceRow, rates: JobRates) {
  return PIECE_TASKS.reduce((a, t) => a + (Number(p.hours[t.key]) || 0) * crewOf(rates, t.key) * rates.shopRate, 0);
}
export function extraCost(e: ExtraRow, rates: JobRates) {
  if (e.lump != null) return e.lump;
  return (e.hours || 0) * (e.crew || 1) * (e.rate ?? rates.shopRate);
}
export const materialCost = (m: MaterialRow) => (m.qty || 0) * (m.unitPrice || 0);

export type SectionTotals = {
  section: string;
  hours: number; // crew-hours as written
  personHours: number;
  labor: number;
  materials: number;
  base: number; // labor + materials
  buffer: number;
  tax: number;
  total: number;
  byTask: Record<string, { hours: number; personHours: number; cost: number }>;
};

/** Totals per section and overall, for the lines that count (include = true and source = basis). */
export function computeShopTotals(
  pieces: PieceRow[],
  extras: ExtraRow[],
  materials: MaterialRow[],
  rates: JobRates,
  basis: string,
) {
  const sections = new Map<string, SectionTotals>();
  const sec = (name: string) => {
    let s = sections.get(name);
    if (!s) {
      s = { section: name, hours: 0, personHours: 0, labor: 0, materials: 0, base: 0, buffer: 0, tax: 0, total: 0, byTask: {} };
      sections.set(name, s);
    }
    return s;
  };
  const addTask = (s: SectionTotals, task: string, hours: number, personHours: number, cost: number) => {
    const t = (s.byTask[task] ??= { hours: 0, personHours: 0, cost: 0 });
    t.hours += hours;
    t.personHours += personHours;
    t.cost += cost;
  };
  const counts = (r: { include: boolean; source: string }) => r.include && r.source === basis;
  for (const p of pieces.filter(counts)) {
    const s = sec(p.section);
    for (const t of PIECE_TASKS) {
      const h = Number(p.hours[t.key]) || 0;
      if (!h) continue;
      const crew = crewOf(rates, t.key);
      const cost = h * crew * rates.shopRate;
      s.hours += h;
      s.personHours += h * crew;
      s.labor += cost;
      addTask(s, t.key, h, h * crew, cost);
    }
  }
  for (const e of extras.filter(counts)) {
    const s = sec(e.section);
    const cost = extraCost(e, rates);
    const h = e.lump != null ? 0 : e.hours || 0;
    s.hours += h;
    s.personHours += h * (e.crew || 1);
    s.labor += cost;
    addTask(s, e.task, h, h * (e.crew || 1), cost);
  }
  for (const m of materials.filter(counts)) sec(m.section).materials += materialCost(m);
  const list = [...sections.values()];
  for (const s of list) {
    s.base = s.labor + s.materials;
    s.buffer = s.base * rates.bufferPct;
    s.tax = (s.base + s.buffer) * rates.taxPct;
    s.total = s.base + s.buffer + s.tax;
  }
  const sum = (k: keyof Omit<SectionTotals, "section" | "byTask">) => list.reduce((a, s) => a + s[k], 0);
  const byTask: SectionTotals["byTask"] = {};
  for (const s of list)
    for (const [k, v] of Object.entries(s.byTask)) {
      const t = (byTask[k] ??= { hours: 0, personHours: 0, cost: 0 });
      t.hours += v.hours;
      t.personHours += v.personHours;
      t.cost += v.cost;
    }
  return {
    sections: list,
    hours: sum("hours"),
    personHours: sum("personHours"),
    labor: sum("labor"),
    materials: sum("materials"),
    base: sum("base"),
    buffer: sum("buffer"),
    tax: sum("tax"),
    total: sum("total"),
    byTask,
  };
}
export type ShopTotals = ReturnType<typeof computeShopTotals>;

/** Map a timecard task name ("Glue-Up/Assembly", "edge banding", "Material Handeling") to a task key. */
export function matchTask(raw: string): TaskKey | null {
  const s = raw.toLowerCase().replace(/[^a-z]/g, "");
  if (!s) return null;
  const rules: [RegExp, TaskKey][] = [
    [/estimat|order|takeoff/, "estimating"],
    [/drawing|cad|shopdraw/, "drawings"],
    [/mock|sample/, "mockup"],
    [/hand(l|e)|receiv|stor/, "handling"],
    [/packag|pack|wrap|load/, "packaging"],
    [/transport|deliver|truck|haul|uhaul/, "transport"],
    [/mill|rough|cnc|cutout|breakdown/, "milling"],
    [/glue|assembl|clamp/, "glueup"],
    [/siz/, "sizing"],
    [/bor|drill/, "boring"],
    [/shelf|shelv/, "shelves"],
    [/band|edg/, "banding"],
    [/sand/, "sanding"],
    [/hardware|hinge|slide|bracket/, "hardware"],
    [/finish|stain|spray|coat|paint|lacquer/, "finish"],
    [/install|scrib|site|field/, "install"],
  ];
  for (const [re, k] of rules) if (re.test(s)) return k;
  return null;
}

/** "14 @ Single Table Booth Bench" -> { qty: 14, text: "Single Table Booth Bench" } */
export function splitQty(s: string): { qty: number | null; text: string } {
  const m = s.match(/^\s*~?\s*(\d+(?:\.\d+)?)\s*@\s*(.+)$/);
  return m ? { qty: Number(m[1]), text: m[2].trim() } : { qty: null, text: s.trim() };
}

export const usd = (n: number, digits = 0) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: digits, minimumFractionDigits: digits });
export const hrs = (n: number) => (Math.round(n * 100) / 100).toLocaleString("en-US", { maximumFractionDigits: 2 });
export const pct = (n: number, digits = 0) => `${(n * 100).toFixed(digits)}%`;
