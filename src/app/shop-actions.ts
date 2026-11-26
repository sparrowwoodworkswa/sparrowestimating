"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { and, eq, inArray, notInArray } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { putFile, deleteFile, createPlanUploadUrl } from "@/lib/storage";
import { divisionOfCode, isCostCode, costCodeLabel } from "@/lib/costcodes";
import { CURRENT_YEAR } from "@/lib/escalation";
import { getShopJob, jobTotals } from "@/lib/shop/data";
import { matchTask, PIECE_TASKS, type PieceRow, type ExtraRow, type MaterialRow } from "@/lib/shop/model";
import { runShopTakeoff, marketCheck, type MarketResult } from "@/lib/shop/ai";

const s = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const num = (f: FormData, k: string) => {
  const v = s(f, k).replace(/[$,%\s]/g, "");
  return v === "" || isNaN(Number(v)) ? null : Number(v);
};

async function touch(jobId: number) {
  const db = await getDb();
  await db.update(schema.shopJobs).set({ updatedAt: new Date() }).where(eq(schema.shopJobs.id, jobId));
}

// ---------------- jobs ----------------

export async function createShopJob(form: FormData) {
  const db = await getDb();
  const name = s(form, "name");
  if (!name) throw new Error("Give the job a name.");
  const [j] = await db
    .insert(schema.shopJobs)
    .values({
      name,
      client: s(form, "client"),
      architect: s(form, "architect"),
      location: s(form, "location"),
      costYear: num(form, "costYear") ?? CURRENT_YEAR,
      shopRate: num(form, "shopRate") ?? 105,
      bufferPct: (num(form, "bufferPct") ?? 30) / 100,
      taxPct: (num(form, "taxPct") ?? 0) / 100,
      notes: s(form, "notes"),
    })
    .returning();
  redirect(`/shop/${j.id}`);
}

export async function updateShopJob(jobId: number, form: FormData) {
  const db = await getDb();
  const gc = num(form, "gcProjectId");
  await db
    .update(schema.shopJobs)
    .set({
      name: s(form, "name") || "Untitled",
      client: s(form, "client"),
      architect: s(form, "architect"),
      location: s(form, "location"),
      status: s(form, "status") || "estimating",
      costYear: num(form, "costYear"),
      shopRate: num(form, "shopRate") ?? 105,
      bufferPct: (num(form, "bufferPct") ?? 30) / 100,
      taxPct: (num(form, "taxPct") ?? 0) / 100,
      crews: { install: num(form, "crewInstall") ?? 2, packaging: num(form, "crewPackaging") ?? 2, transport: num(form, "crewTransport") ?? 2 },
      basis: s(form, "basis") || "Sparrow estimate",
      gcProjectId: gc && gc > 0 ? gc : null,
      notes: s(form, "notes"),
      updatedAt: new Date(),
    })
    .where(eq(schema.shopJobs.id, jobId));
  revalidatePath(`/shop/${jobId}`);
  revalidatePath("/shop");
}

export async function deleteShopJob(jobId: number) {
  const db = await getDb();
  const files = await db.select().from(schema.shopFiles).where(eq(schema.shopFiles.jobId, jobId));
  for (const f of files) await deleteFile(f.storageKey).catch(() => {});
  for (const t of [schema.shopPieces, schema.shopExtras, schema.shopMaterials, schema.shopActuals, schema.shopFiles])
    await db.delete(t).where(eq(t.jobId, jobId));
  await db.delete(schema.shopJobs).where(eq(schema.shopJobs.id, jobId));
  redirect("/shop");
}

/** Saves the whole estimate grid: updates rows that have ids, inserts new ones, removes rows that were deleted. */
export async function saveShopLines(jobId: number, data: { pieces: PieceRow[]; extras: ExtraRow[]; materials: MaterialRow[] }) {
  const db = await getDb();
  const clean = <T extends { id?: number }>(rows: T[]) => rows.map(({ id, ...r }) => ({ id: id && id > 0 ? id : undefined, ...r }));
  const pieces = clean(data.pieces).map((p, i) => ({
    ...p, jobId, sort: i, qty: Number(p.qty) || 0, section: p.section || "Main",
    hours: Object.fromEntries(PIECE_TASKS.map((t) => [t.key, Number(p.hours?.[t.key]) || 0]).filter(([, v]) => v)),
  }));
  const extras = clean(data.extras).map((e, i) => ({
    ...e, jobId, sort: 5000 + i, section: e.section || "Main", hours: Number(e.hours) || 0, crew: Number(e.crew) || 1,
    rate: e.rate == null || (e.rate as unknown) === "" ? null : Number(e.rate), lump: e.lump == null || (e.lump as unknown) === "" ? null : Number(e.lump),
  }));
  const materials = clean(data.materials).map((m, i) => ({
    ...m, jobId, sort: 8000 + i, section: m.section || "Main", qty: Number(m.qty) || 0, unitPrice: Number(m.unitPrice) || 0,
  }));

  const sync = async <T extends { id?: number }>(
    table: typeof schema.shopPieces | typeof schema.shopExtras | typeof schema.shopMaterials,
    rows: T[],
  ) => {
    const keep = rows.map((r) => r.id).filter((x): x is number => !!x);
    if (keep.length) await db.delete(table).where(and(eq(table.jobId, jobId), notInArray(table.id, keep)));
    else await db.delete(table).where(eq(table.jobId, jobId));
    for (const r of rows) {
      const { id, ...vals } = r;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (id) await db.update(table).set(vals as any).where(and(eq(table.id, id), eq(table.jobId, jobId)));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      else await db.insert(table).values(vals as any);
    }
  };
  await sync(schema.shopPieces, pieces);
  await sync(schema.shopExtras, extras);
  await sync(schema.shopMaterials, materials);
  await touch(jobId);
  revalidatePath(`/shop/${jobId}`);
}

export async function setSectionCode(jobId: number, section: string, code: string) {
  const db = await getDb();
  const [j] = await db.select().from(schema.shopJobs).where(eq(schema.shopJobs.id, jobId));
  await db.update(schema.shopJobs).set({ sectionCodes: { ...(j.sectionCodes ?? {}), [section]: code.trim() } }).where(eq(schema.shopJobs.id, jobId));
  revalidatePath(`/shop/${jobId}`);
}

/**
 * Puts the shop number into a GC estimate: one line per section at cost (labor + materials + buffer, no tax),
 * under the section's Sparrow cost code. The GC fee and sales tax are applied by the GC estimate.
 */
export async function pushToGcEstimate(jobId: number): Promise<string> {
  const db = await getDb();
  const full = await getShopJob(jobId);
  if (!full) return "Job not found.";
  const { job } = full;
  if (!job.gcProjectId) return "Pick a GC project first (Job settings).";
  const t = jobTotals(full);
  const tag = `shop:${job.id}`;
  const old = await db.select().from(schema.estimateLines).where(and(eq(schema.estimateLines.projectId, job.gcProjectId), eq(schema.estimateLines.source, "shop")));
  const mine = old.filter((l) => l.note.startsWith(tag)).map((l) => l.id);
  if (mine.length) await db.delete(schema.estimateLines).where(inArray(schema.estimateLines.id, mine));
  const rows = t.sections.map((sec, i) => {
    const code = isCostCode(job.sectionCodes?.[sec.section] ?? "") ? job.sectionCodes[sec.section] : "1200.6";
    return {
      projectId: job.gcProjectId!,
      division: divisionOfCode(code) ?? "12",
      csiCode: code,
      description: `Shop: ${sec.section} (${job.name})`,
      scope: `${costCodeLabel(code)}. Sparrow shop, ${Math.round(sec.personHours)} shop hours, materials ${Math.round(sec.materials)}, ${Math.round(job.bufferPct * 100)}% shop buffer included. At cost; GC fee and tax applied in this estimate.`,
      qty: 1,
      unit: "LS",
      subUnit: Math.round(sec.base + sec.buffer),
      trade: "Sparrow shop",
      note: `${tag} pushed ${new Date().toISOString().slice(0, 10)}`,
      source: "shop",
      sort: 900 + i,
    };
  });
  if (rows.length) await db.insert(schema.estimateLines).values(rows);
  await db.update(schema.projects).set({ updatedAt: new Date() }).where(eq(schema.projects.id, job.gcProjectId));
  revalidatePath(`/projects/${job.gcProjectId}/estimate`);
  return `Added ${rows.length} line${rows.length === 1 ? "" : "s"} to the GC estimate.`;
}

// ---------------- plans + takeoff ----------------

export async function startShopUpload(filename: string) {
  return createPlanUploadUrl(filename);
}

export async function registerShopFiles(jobId: number, files: { filename: string; url: string; size: number }[]) {
  const db = await getDb();
  if (files.length) await db.insert(schema.shopFiles).values(files.map((f) => ({ jobId, filename: f.filename, storageKey: f.url, sizeBytes: f.size })));
  await touch(jobId);
  revalidatePath(`/shop/${jobId}/plans`);
}

export async function uploadShopFiles(jobId: number, form: FormData) {
  const files = form.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  const done: { filename: string; url: string; size: number }[] = [];
  for (const f of files) done.push({ filename: f.name, url: await putFile(f.name, Buffer.from(await f.arrayBuffer()), f.type || "application/pdf"), size: f.size });
  await registerShopFiles(jobId, done);
}

export async function deleteShopFile(jobId: number, fileId: number) {
  const db = await getDb();
  const [f] = await db.select().from(schema.shopFiles).where(and(eq(schema.shopFiles.id, fileId), eq(schema.shopFiles.jobId, jobId)));
  if (f) {
    await deleteFile(f.storageKey).catch(() => {});
    await db.delete(schema.shopFiles).where(eq(schema.shopFiles.id, f.id));
  }
  revalidatePath(`/shop/${jobId}/plans`);
}

export async function startShopTakeoff(jobId: number) {
  const db = await getDb();
  const [j] = await db.select().from(schema.shopJobs).where(eq(schema.shopJobs.id, jobId));
  const fresh = j.takeoffStartedAt && Date.now() - new Date(j.takeoffStartedAt).getTime() < 30 * 60 * 1000;
  if (j.takeoffStatus === "running" && fresh) return;
  await db
    .update(schema.shopJobs)
    .set({ takeoffStatus: "running", takeoffStep: "Starting", takeoffError: null, takeoffStartedAt: new Date() })
    .where(eq(schema.shopJobs.id, jobId));
  after(() => runShopTakeoff(jobId));
  revalidatePath(`/shop/${jobId}/plans`);
}

// ---------------- actuals ----------------

export async function addActual(jobId: number, form: FormData) {
  const db = await getDb();
  const kind = s(form, "kind") === "material" ? "material" : "labor";
  await db.insert(schema.shopActuals).values({
    jobId,
    kind,
    workDate: s(form, "workDate"),
    task: kind === "labor" ? s(form, "task") || "other" : "",
    section: s(form, "section"),
    who: s(form, "who"),
    hours: kind === "labor" ? num(form, "hours") ?? 0 : 0,
    amount: kind === "material" ? num(form, "amount") ?? 0 : 0,
    vendor: s(form, "vendor"),
    note: s(form, "note"),
    source: "Manual",
  });
  await touch(jobId);
  revalidatePath(`/shop/${jobId}/actuals`);
}

export async function deleteActual(jobId: number, id: number) {
  const db = await getDb();
  await db.delete(schema.shopActuals).where(and(eq(schema.shopActuals.id, id), eq(schema.shopActuals.jobId, jobId)));
  revalidatePath(`/shop/${jobId}/actuals`);
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((x) => x.trim()));
}

async function readTable(file: File): Promise<string[][]> {
  const buf = Buffer.from(await file.arrayBuffer());
  if (/\.xlsx$/i.test(file.name)) {
    const ExcelJS = (await import("exceljs")).default;
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf as unknown as ArrayBuffer);
    const ws = wb.worksheets[0];
    const out: string[][] = [];
    ws.eachRow((r) => {
      const vals: string[] = [];
      r.eachCell({ includeEmpty: true }, (c, col) => {
        const v = c.value as unknown;
        let str = "";
        if (v instanceof Date) str = v.toISOString().slice(0, 10);
        else if (v && typeof v === "object" && "result" in (v as object)) str = String((v as { result: unknown }).result ?? "");
        else if (v && typeof v === "object" && "text" in (v as object)) str = String((v as { text: unknown }).text ?? "");
        else str = v == null ? "" : String(v);
        vals[col - 1] = str;
      });
      out.push(Array.from(vals, (x) => x ?? ""));
    });
    return out.filter((r) => r.some((x) => x.trim()));
  }
  return parseCsv(buf.toString("utf8"));
}

function toIsoDate(v: string) {
  const t = v.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) return t.slice(0, 10);
  const m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (m) {
    const y = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${y}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
  }
  return t;
}

export type ImportResult = { imported: number; skipped: number; unmatched: string[]; error?: string };

/**
 * Imports a timecard or invoice export (CSV or .xlsx). Columns are found by header name:
 * date, employee/name, task/activity/cost code, hours, job, section/area, notes, amount/cost, vendor.
 * Rows with hours are labor; rows with only an amount are material. Rows for other jobs are skipped.
 */
export async function importActuals(jobId: number, form: FormData): Promise<ImportResult> {
  const file = form.get("file");
  if (!(file instanceof File) || !file.size) return { imported: 0, skipped: 0, unmatched: [], error: "Choose a CSV or .xlsx file." };
  const db = await getDb();
  const [job] = await db.select().from(schema.shopJobs).where(eq(schema.shopJobs.id, jobId));
  const table = await readTable(file);
  if (table.length < 2) return { imported: 0, skipped: 0, unmatched: [], error: "The file has no rows." };
  const head = table[0].map((h) => h.toLowerCase().trim());
  const col = (...names: RegExp[]) => head.findIndex((h) => names.some((n) => n.test(h)));
  const c = {
    date: col(/date/, /^day$/),
    who: col(/employee/, /worker/, /^name$/, /^who$/, /person/),
    task: col(/task/, /activity/, /cost ?code/, /phase/, /operation/),
    hours: col(/hour/, /^hrs$/, /duration/),
    job: col(/^job/, /project/),
    section: col(/section/, /area/, /room/),
    note: col(/note/, /memo/, /description/, /comment/),
    amount: col(/amount/, /^cost$/, /total/, /price/),
    vendor: col(/vendor/, /supplier/),
  };
  if (c.hours < 0 && c.amount < 0) return { imported: 0, skipped: 0, unmatched: [], error: "Could not find an Hours or Amount column in the header row." };
  const get = (r: string[], i: number) => (i >= 0 ? (r[i] ?? "").trim() : "");
  const jobKey = job.name.toLowerCase();
  const rows: (typeof schema.shopActuals.$inferInsert)[] = [];
  const unmatched = new Set<string>();
  let skipped = 0;
  for (const r of table.slice(1)) {
    const jobCell = get(r, c.job).toLowerCase();
    if (jobCell && !jobCell.includes(jobKey) && !jobKey.includes(jobCell)) { skipped++; continue; }
    const hours = Number(get(r, c.hours).replace(/[^0-9.\-]/g, "")) || 0;
    const amount = Number(get(r, c.amount).replace(/[^0-9.\-]/g, "")) || 0;
    if (!hours && !amount) { skipped++; continue; }
    const rawTask = get(r, c.task);
    const task = matchTask(rawTask) ?? "other";
    if (hours && task === "other" && rawTask) unmatched.add(rawTask);
    rows.push({
      jobId,
      kind: hours ? "labor" : "material",
      workDate: toIsoDate(get(r, c.date)),
      task: hours ? task : "",
      section: get(r, c.section),
      who: get(r, c.who),
      hours,
      amount: hours ? 0 : amount,
      vendor: get(r, c.vendor),
      note: [rawTask && task === "other" ? rawTask : "", get(r, c.note)].filter(Boolean).join(" · "),
      source: hours ? "Timecard" : "Invoice",
    });
  }
  for (let i = 0; i < rows.length; i += 200) await db.insert(schema.shopActuals).values(rows.slice(i, i + 200));
  await touch(jobId);
  revalidatePath(`/shop/${jobId}/actuals`);
  return { imported: rows.length, skipped, unmatched: [...unmatched].slice(0, 20) };
}

// ---------------- price book ----------------

export async function savePrice(form: FormData) {
  const db = await getDb();
  const unitPrice = num(form, "unitPrice");
  if (!s(form, "item") || unitPrice == null) throw new Error("Item and price are required.");
  await db.insert(schema.shopPrices).values({
    item: s(form, "item"),
    category: s(form, "category") || "Other",
    unit: s(form, "unit") || "EA",
    unitPrice,
    vendor: s(form, "vendor"),
    quoteDate: s(form, "quoteDate") || new Date().toISOString().slice(0, 10),
    source: s(form, "source") || "Quote",
    notes: s(form, "notes"),
  });
  revalidatePath("/shop/prices");
}

export async function deletePrice(id: number) {
  const db = await getDb();
  await db.delete(schema.shopPrices).where(eq(schema.shopPrices.id, id));
  revalidatePath("/shop/prices");
}

export async function runMarketCheck(form: FormData): Promise<{ ok: true; result: MarketResult } | { ok: false; error: string }> {
  const item = s(form, "item");
  const unit = s(form, "unit") || "BF";
  if (!item) return { ok: false, error: "Type the item to look up." };
  try {
    const result = await marketCheck(item, unit);
    const db = await getDb();
    await db.insert(schema.shopPrices).values({
      item: result.item || item,
      category: s(form, "category") || "Other",
      unit,
      unitPrice: result.typical,
      low: result.low,
      high: result.high,
      quoteDate: new Date().toISOString().slice(0, 10),
      source: "Market (web)",
      url: result.sources[0]?.url ?? "",
      notes: [result.note, ...result.sources.map((x) => `${x.title}: ${x.price} (${x.date}) ${x.url}`)].join("\n"),
    });
    revalidatePath("/shop/prices");
    return { ok: true, result };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
