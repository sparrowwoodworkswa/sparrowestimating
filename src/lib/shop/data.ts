import "server-only";
import { asc, desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { ShopJob, ShopPiece, ShopExtra, ShopMaterial, ShopActual } from "@/db/schema";
import { escalationFactor } from "@/lib/escalation";
import {
  computeShopTotals,
  PIECE_TASKS,
  ALL_TASKS,
  crewOf,
  type PieceRow,
  type ExtraRow,
  type MaterialRow,
  type JobRates,
  type ShopTotals,
} from "./model";

export const ratesOf = (j: ShopJob): JobRates => ({ shopRate: j.shopRate, bufferPct: j.bufferPct, taxPct: j.taxPct, crews: j.crews ?? {} });

export const toPiece = (p: ShopPiece): PieceRow => ({
  id: p.id, section: p.section, grp: p.grp, description: p.description, pieceType: p.pieceType, qty: p.qty, unit: p.unit,
  hours: p.hours ?? {}, include: p.include, source: p.source, note: p.note, sort: p.sort,
});
export const toExtra = (e: ShopExtra): ExtraRow => ({
  id: e.id, section: e.section, task: e.task, label: e.label, who: e.who, hours: e.hours, crew: e.crew, rate: e.rate, lump: e.lump,
  include: e.include, source: e.source, note: e.note, sort: e.sort,
});
export const toMaterial = (m: ShopMaterial): MaterialRow => ({
  id: m.id, section: m.section, item: m.item, qty: m.qty, unit: m.unit, unitPrice: m.unitPrice, vendor: m.vendor,
  include: m.include, source: m.source, note: m.note, sort: m.sort,
});

export async function getShopJob(id: number) {
  const db = await getDb();
  const [job] = await db.select().from(schema.shopJobs).where(eq(schema.shopJobs.id, id));
  if (!job) return null;
  const [pieces, extras, materials, actuals, files] = await Promise.all([
    db.select().from(schema.shopPieces).where(eq(schema.shopPieces.jobId, id)).orderBy(asc(schema.shopPieces.sort), asc(schema.shopPieces.id)),
    db.select().from(schema.shopExtras).where(eq(schema.shopExtras.jobId, id)).orderBy(asc(schema.shopExtras.sort), asc(schema.shopExtras.id)),
    db.select().from(schema.shopMaterials).where(eq(schema.shopMaterials.jobId, id)).orderBy(asc(schema.shopMaterials.sort), asc(schema.shopMaterials.id)),
    db.select().from(schema.shopActuals).where(eq(schema.shopActuals.jobId, id)).orderBy(desc(schema.shopActuals.workDate), desc(schema.shopActuals.id)),
    db.select().from(schema.shopFiles).where(eq(schema.shopFiles.jobId, id)).orderBy(asc(schema.shopFiles.id)),
  ]);
  return {
    job,
    pieces: pieces.map(toPiece),
    extras: extras.map(toExtra),
    materials: materials.map(toMaterial),
    actuals,
    files,
  };
}
export type FullShopJob = NonNullable<Awaited<ReturnType<typeof getShopJob>>>;

export function jobTotals(j: Pick<FullShopJob, "job" | "pieces" | "extras" | "materials">, basis = j.job.basis): ShopTotals {
  return computeShopTotals(j.pieces, j.extras, j.materials, ratesOf(j.job), basis);
}

/** Totals for every source present in the job, so a Claude takeoff can be compared to Sparrow's estimate. */
export function totalsBySource(j: FullShopJob) {
  const sources = new Set<string>([...j.pieces, ...j.extras, ...j.materials].map((r) => r.source));
  return [...sources].map((s) => ({ source: s, totals: jobTotals(j, s) }));
}

export async function listShopJobs() {
  const db = await getDb();
  const jobs = await db.select().from(schema.shopJobs).orderBy(desc(schema.shopJobs.updatedAt));
  const [pieces, extras, materials, actuals] = await Promise.all([
    db.select().from(schema.shopPieces),
    db.select().from(schema.shopExtras),
    db.select().from(schema.shopMaterials),
    db.select().from(schema.shopActuals),
  ]);
  return jobs.map((job) => {
    const full = {
      job,
      pieces: pieces.filter((p) => p.jobId === job.id).map(toPiece),
      extras: extras.filter((e) => e.jobId === job.id).map(toExtra),
      materials: materials.filter((m) => m.jobId === job.id).map(toMaterial),
      actuals: actuals.filter((a) => a.jobId === job.id),
    };
    const totals = jobTotals(full);
    const act = actualSummary(job, full.actuals);
    return { job, totals, actual: act };
  });
}

// ---------------- actuals ----------------

export function actualSummary(job: ShopJob, actuals: ShopActual[]) {
  const labor = actuals.filter((a) => a.kind === "labor");
  const mats = actuals.filter((a) => a.kind === "material");
  const byTask: Record<string, number> = {};
  for (const a of labor) byTask[a.task || "other"] = (byTask[a.task || "other"] ?? 0) + a.hours;
  const hours = labor.reduce((s, a) => s + a.hours, 0);
  const laborCost = hours * job.shopRate;
  const materials = mats.reduce((s, a) => s + a.amount, 0);
  return { hours, laborCost, materials, total: laborCost + materials, byTask, count: actuals.length };
}

/** Estimate vs actual by task (person-hours) for one job. Buffer used = actual over the un-buffered estimate. */
export function compareJob(j: FullShopJob) {
  const t = jobTotals(j);
  const a = actualSummary(j.job, j.actuals);
  const rows = ALL_TASKS.map((task) => {
    const est = t.byTask[task.key]?.personHours ?? 0;
    const act = a.byTask[task.key] ?? 0;
    return { task: task.key, label: task.label, est, act, diff: act - est, ratio: est > 0 ? act / est : null };
  }).filter((r) => r.est || r.act);
  const unmatched = a.byTask["other"] && !t.byTask["other"] ? a.byTask["other"] : 0;
  const spent = t.base > 0 && a.count ? a.total / t.base : null; // share of the un-buffered estimate spent so far
  const complete = j.job.status === "complete";
  const bufferUsed = complete && spent != null ? spent - 1 : null;
  return { totals: t, actual: a, rows, unmatched, spent, complete, bufferUsed };
}

// ---------------- production library ----------------

export type LibraryEntry = {
  pieceType: string;
  unit: string;
  samples: {
    jobId: number;
    jobName: string;
    year: number | null;
    source: string;
    qty: number;
    perUnit: Record<string, number>; // crew-hours per unit by task
    total: number; // crew-hours per unit
    personPerUnit: number;
    actualFactor: number | null; // job-level actual / estimate person-hours, when the job has timecards
  }[];
};

/**
 * Hours per unit for every piece type across all jobs, newest first.
 * Priority when quoting a rate: Actual > Sparrow estimate > Claude takeoff.
 * When a job has timecards, the job-level actual/estimate factor is shown next to its sample.
 */
export async function getLibrary(): Promise<LibraryEntry[]> {
  const db = await getDb();
  const [jobs, pieces, extras, materials, actuals] = await Promise.all([
    db.select().from(schema.shopJobs),
    db.select().from(schema.shopPieces),
    db.select().from(schema.shopExtras),
    db.select().from(schema.shopMaterials),
    db.select().from(schema.shopActuals),
  ]);
  const factor = new Map<number, number | null>();
  for (const job of jobs) {
    const full = {
      job,
      pieces: pieces.filter((p) => p.jobId === job.id).map(toPiece),
      extras: extras.filter((e) => e.jobId === job.id).map(toExtra),
      materials: materials.filter((m) => m.jobId === job.id).map(toMaterial),
      actuals: actuals.filter((a) => a.jobId === job.id),
      files: [],
    };
    // Only finished jobs teach the library; a half-built job would read as a huge underrun.
    if (job.status !== "complete") { factor.set(job.id, null); continue; }
    const c = compareJob(full);
    const est = c.totals.personHours;
    factor.set(job.id, c.actual.hours > 0 && est > 0 ? c.actual.hours / est : null);
  }
  const byType = new Map<string, LibraryEntry>();
  for (const p of pieces) {
    if (!p.pieceType || !p.qty) continue;
    const job = jobs.find((j) => j.id === p.jobId);
    if (!job) continue;
    const key = `${p.pieceType.toLowerCase()}|${p.unit}`;
    let e = byType.get(key);
    if (!e) {
      e = { pieceType: p.pieceType, unit: p.unit, samples: [] };
      byType.set(key, e);
    }
    const perUnit: Record<string, number> = {};
    let total = 0;
    let person = 0;
    for (const t of PIECE_TASKS) {
      const h = Number(p.hours?.[t.key]) || 0;
      if (!h) continue;
      perUnit[t.key] = h / p.qty;
      total += h / p.qty;
      person += (h / p.qty) * crewOf({ shopRate: 0, bufferPct: 0, taxPct: 0, crews: job.crews ?? {} }, t.key);
    }
    e.samples.push({
      jobId: job.id, jobName: job.name, year: job.costYear, source: p.source, qty: p.qty, perUnit, total, personPerUnit: person,
      actualFactor: factor.get(job.id) ?? null,
    });
  }
  const order: Record<string, number> = { Actual: 0, "Sparrow estimate": 1, "Reference rate": 2, "Claude takeoff": 3 };
  for (const e of byType.values()) e.samples.sort((a, b) => (order[a.source] ?? 9) - (order[b.source] ?? 9) || (b.year ?? 0) - (a.year ?? 0));
  return [...byType.values()].sort((a, b) => a.pieceType.localeCompare(b.pieceType));
}

/** Job-level actual vs estimate factors by task, from completed jobs that have timecards. */
export async function getTaskFactors() {
  const db = await getDb();
  const jobs = (await db.select().from(schema.shopJobs)).filter((j) => j.status === "complete");
  const out: { jobId: number; jobName: string; year: number | null; byTask: Record<string, number>; overall: number | null; bufferUsed: number | null }[] = [];
  for (const job of jobs) {
    const full = await getShopJob(job.id);
    if (!full || !full.actuals.some((a) => a.kind === "labor")) continue;
    const c = compareJob(full);
    const byTask: Record<string, number> = {};
    for (const r of c.rows) if (r.ratio != null) byTask[r.task] = r.ratio;
    out.push({
      jobId: job.id, jobName: job.name, year: job.costYear, byTask,
      overall: c.totals.personHours > 0 ? c.actual.hours / c.totals.personHours : null, bufferUsed: c.bufferUsed,
    });
  }
  return out;
}

export async function getPriceBook() {
  const db = await getDb();
  const rows = await db.select().from(schema.shopPrices).orderBy(asc(schema.shopPrices.item), desc(schema.shopPrices.quoteDate), desc(schema.shopPrices.id));
  return rows.map((r) => {
    const year = Number(r.quoteDate.slice(0, 4)) || null;
    return { ...r, year, current: r.unitPrice * escalationFactor(year) };
  });
}
export type PriceRow = Awaited<ReturnType<typeof getPriceBook>>[number];

export async function listGcProjects() {
  const db = await getDb();
  return db.select({ id: schema.projects.id, name: schema.projects.name, status: schema.projects.status }).from(schema.projects).orderBy(desc(schema.projects.updatedAt));
}
