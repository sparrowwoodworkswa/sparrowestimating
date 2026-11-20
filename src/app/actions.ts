"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb, schema } from "@/db";
import type { Company, Markups, ProposalContent, Material } from "@/db/schema";
import { getSettings, getProject } from "@/lib/data";
import { putFile, deleteFile } from "@/lib/storage";
import { startRun, runEstimate, runProposalOnly } from "@/lib/ai/pipeline";
import { runLearn } from "@/lib/ai/learn";

const s = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const n = (f: FormData, k: string) => {
  const v = s(f, k).replace(/[$,%\s]/g, "");
  return v === "" ? null : Number(v);
};

async function touch(projectId: number) {
  const db = await getDb();
  await db.update(schema.projects).set({ updatedAt: new Date() }).where(eq(schema.projects.id, projectId));
}

// ---------------- projects ----------------

export async function createProject(form: FormData) {
  const db = await getDb();
  const settings = await getSettings();
  const markups: Markups = { ...settings.markups };
  const tax = n(form, "taxPct");
  if (tax != null) markups.taxPct = tax;
  const [p] = await db
    .insert(schema.projects)
    .values({
      name: s(form, "name") || "Untitled project",
      client: s(form, "client"),
      architect: s(form, "architect"),
      address: s(form, "address"),
      city: s(form, "city"),
      finishLevel: s(form, "finishLevel") || "mid-high",
      totalSf: n(form, "totalSf"),
      ownerNotes: s(form, "ownerNotes"),
      markups,
      shareToken: nanoid(16),
    })
    .returning();
  await saveUploads(p.id, form.getAll("files") as File[]);
  if (s(form, "start") === "1" && process.env.ANTHROPIC_API_KEY) {
    const runId = await startRun(p.id, "estimate");
    after(() => runEstimate(p.id, runId));
  }
  redirect(`/projects/${p.id}`);
}

async function saveUploads(projectId: number, files: File[]) {
  const db = await getDb();
  for (const file of files) {
    if (!file || typeof file === "string" || !file.size) continue;
    const buf = Buffer.from(await file.arrayBuffer());
    const key = await putFile(file.name, buf, file.type || "application/pdf");
    const kind = /\.(png|jpe?g|webp)$/i.test(file.name) ? "image" : /spec/i.test(file.name) ? "specs" : "plans";
    await db.insert(schema.planFiles).values({ projectId, filename: file.name, storageKey: key, sizeBytes: buf.length, kind });
  }
}

export async function uploadFiles(projectId: number, form: FormData) {
  await saveUploads(projectId, form.getAll("files") as File[]);
  await touch(projectId);
  revalidatePath(`/projects/${projectId}`);
}

export async function deletePlanFile(projectId: number, fileId: number) {
  const db = await getDb();
  const [f] = await db.select().from(schema.planFiles).where(eq(schema.planFiles.id, fileId));
  if (f) {
    await deleteFile(f.storageKey).catch(() => {});
    await db.delete(schema.planFiles).where(eq(schema.planFiles.id, fileId));
  }
  revalidatePath(`/projects/${projectId}`);
}

export async function updateProject(projectId: number, form: FormData) {
  const db = await getDb();
  const fields: Record<string, unknown> = {};
  for (const k of ["name", "client", "architect", "structural", "address", "city", "designStage", "finishLevel", "ownerNotes", "outcomeNotes", "revision"]) {
    if (form.has(k)) fields[k] = s(form, k);
  }
  for (const k of ["totalSf", "conditionedSf", "competitorPrice", "actualCost", "contractTotalOverride", "directCostOverride"]) {
    if (form.has(k)) fields[k] = n(form, k);
  }
  if (form.has("status")) {
    const st = s(form, "status");
    fields.status = st;
    if (st === "won" || st === "lost") fields.decidedAt = new Date();
    if (st === "proposal_sent") fields.proposalSentAt = new Date();
  }
  fields.updatedAt = new Date();
  await db.update(schema.projects).set(fields).where(eq(schema.projects.id, projectId));
  revalidatePath(`/projects/${projectId}`, "layout");
  revalidatePath("/");
}

export async function deleteProject(projectId: number) {
  const db = await getDb();
  const files = await db.select().from(schema.planFiles).where(eq(schema.planFiles.projectId, projectId));
  for (const f of files) await deleteFile(f.storageKey).catch(() => {});
  for (const t of [schema.planFiles, schema.estimateLines, schema.tradePackages, schema.aiRuns, schema.proposalEvents] as const) {
    await db.delete(t).where(eq(t.projectId, projectId));
  }
  await db.delete(schema.projects).where(eq(schema.projects.id, projectId));
  redirect("/");
}

export async function updateMarkups(projectId: number, m: Markups) {
  const db = await getDb();
  await db.update(schema.projects).set({ markups: m, updatedAt: new Date() }).where(eq(schema.projects.id, projectId));
  revalidatePath(`/projects/${projectId}`, "layout");
}

// ---------------- AI runs ----------------

export async function startEstimate(projectId: number) {
  if (!process.env.ANTHROPIC_API_KEY) return { error: "Add ANTHROPIC_API_KEY to the environment to read plans." };
  try {
    const runId = await startRun(projectId, "estimate");
    after(() => runEstimate(projectId, runId));
    revalidatePath(`/projects/${projectId}`, "layout");
    return { runId };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function startProposalRewrite(projectId: number) {
  if (!process.env.ANTHROPIC_API_KEY) return { error: "Add ANTHROPIC_API_KEY to the environment." };
  try {
    const runId = await startRun(projectId, "proposal");
    after(() => runProposalOnly(projectId, runId));
    return { runId };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function startLearn(projectId: number) {
  if (!process.env.ANTHROPIC_API_KEY) return { error: "Add ANTHROPIC_API_KEY to the environment." };
  try {
    const runId = await startRun(projectId, "learn");
    after(() => runLearn(projectId, runId));
    return { runId };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

// ---------------- estimate lines ----------------

export type LinePatch = Partial<{
  division: string;
  csiCode: string;
  description: string;
  scope: string;
  qty: number;
  unit: string;
  laborHoursPerUnit: number;
  laborRate: number;
  materialUnit: number;
  subUnit: number;
  isAllowance: boolean;
  trade: string;
  note: string;
}>;

export async function updateLine(lineId: number, patch: LinePatch) {
  const db = await getDb();
  const [l] = await db.update(schema.estimateLines).set(patch).where(eq(schema.estimateLines.id, lineId)).returning();
  if (l) await touch(l.projectId);
  return l;
}

export async function addLine(projectId: number, division: string) {
  const db = await getDb();
  const settings = await getSettings();
  const [l] = await db
    .insert(schema.estimateLines)
    .values({ projectId, division, description: "New line", qty: 1, unit: "LS", laborRate: settings.laborRates.Carpenter ?? 105, source: "manual", sort: 9999 })
    .returning();
  await touch(projectId);
  return l;
}

export async function deleteLine(lineId: number) {
  const db = await getDb();
  await db.delete(schema.estimateLines).where(eq(schema.estimateLines.id, lineId));
}

export async function addLineFromCatalog(projectId: number, catalogId: number, division: string, qty: number) {
  const db = await getDb();
  const [c] = await db.select().from(schema.catalog).where(eq(schema.catalog.id, catalogId));
  if (!c) return null;
  const [l] = await db
    .insert(schema.estimateLines)
    .values({
      projectId,
      division,
      description: c.item,
      qty,
      unit: c.unit,
      subUnit: c.priceType === "material" ? 0 : c.unitPrice,
      materialUnit: c.priceType === "material" ? c.unitPrice : 0,
      trade: c.trade,
      note: `Catalog: ${c.vendor || c.source} ${c.quoteDate}`.trim(),
      source: "manual",
      sort: 9999,
    })
    .returning();
  await touch(projectId);
  return l;
}

// ---------------- trade packages ----------------

export async function updatePackage(pkgId: number, form: FormData) {
  const db = await getDb();
  const lines = (k: string) => s(form, k).split("\n").map((x) => x.trim()).filter(Boolean);
  const fields: Record<string, unknown> = {};
  if (form.has("scopeOfWork")) fields.scopeOfWork = s(form, "scopeOfWork");
  if (form.has("inclusions")) fields.inclusions = lines("inclusions");
  if (form.has("exclusions")) fields.exclusions = lines("exclusions");
  if (form.has("questions")) fields.questions = lines("questions");
  if (form.has("sheetRefs")) fields.sheetRefs = s(form, "sheetRefs");
  if (form.has("bidStatus")) fields.bidStatus = s(form, "bidStatus");
  if (form.has("bidVendor")) fields.bidVendor = s(form, "bidVendor");
  if (form.has("bidAmount")) fields.bidAmount = n(form, "bidAmount");
  if (form.has("bidNotes")) fields.bidNotes = s(form, "bidNotes");
  if (form.has("estimatedPrice")) fields.estimatedPrice = n(form, "estimatedPrice") ?? 0;
  const [p] = await db.update(schema.tradePackages).set(fields).where(eq(schema.tradePackages.id, pkgId)).returning();
  // A received bid goes straight into the price catalog so the next ROM knows it.
  if (p && p.bidAmount && s(form, "addToCatalog") === "1") {
    const project = await getProject(p.projectId);
    const sf = project?.totalSf;
    await db.insert(schema.catalog).values({
      trade: p.trade,
      item: `${p.trade} full scope, ${project?.name ?? "project"}${sf ? ` (${sf} SF)` : ""}`,
      unit: sf ? "SF" : "LS",
      unitPrice: sf ? Math.round((p.bidAmount / sf) * 100) / 100 : p.bidAmount,
      priceType: "installed",
      vendor: p.bidVendor,
      source: "bid",
      quoteDate: new Date().toISOString().slice(0, 7),
      notes: `Bid ${p.bidAmount.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })}. ${p.bidNotes}`.trim(),
      projectId: p.projectId,
    });
  }
  if (p) revalidatePath(`/projects/${p.projectId}/trades`);
}

export async function updateMaterials(pkgId: number, materials: Material[]) {
  const db = await getDb();
  await db.update(schema.tradePackages).set({ materials }).where(eq(schema.tradePackages.id, pkgId));
}

export async function createPackage(projectId: number, form: FormData) {
  const db = await getDb();
  await db.insert(schema.tradePackages).values({ projectId, trade: s(form, "trade") || "New trade" });
  revalidatePath(`/projects/${projectId}/trades`);
}

export async function deletePackage(projectId: number, pkgId: number) {
  const db = await getDb();
  await db.delete(schema.tradePackages).where(eq(schema.tradePackages.id, pkgId));
  revalidatePath(`/projects/${projectId}/trades`);
  redirect(`/projects/${projectId}/trades`);
}

// ---------------- proposal ----------------

export async function saveProposal(projectId: number, proposal: ProposalContent) {
  const db = await getDb();
  await db.update(schema.projects).set({ proposal, updatedAt: new Date() }).where(eq(schema.projects.id, projectId));
  revalidatePath(`/projects/${projectId}/proposal`);
}

export async function uploadProposalImage(projectId: number, slot: "heroImage" | "elevationImage", form: FormData) {
  const file = form.get("file") as File | null;
  if (!file || !file.size) return;
  const project = await getProject(projectId);
  if (!project?.proposal) return;
  const key = await putFile(file.name, Buffer.from(await file.arrayBuffer()), file.type);
  const db = await getDb();
  await db
    .update(schema.projects)
    .set({ proposal: { ...project.proposal, [slot]: key }, updatedAt: new Date() })
    .where(eq(schema.projects.id, projectId));
  revalidatePath(`/projects/${projectId}/proposal`);
}

/** Stores an image or PDF for a proposal (gallery photo, hero, agreement) and returns its storage key. */
export async function uploadProposalAsset(form: FormData): Promise<string | null> {
  const file = form.get("file") as File | null;
  if (!file || !file.size) return null;
  return putFile(file.name, Buffer.from(await file.arrayBuffer()), file.type || "application/octet-stream");
}

export async function rotateShareLink(projectId: number) {
  const db = await getDb();
  await db.update(schema.projects).set({ shareToken: nanoid(16) }).where(eq(schema.projects.id, projectId));
  revalidatePath(`/projects/${projectId}/proposal`);
}

export async function recordProposalEvent(token: string, kind: string, detail = "") {
  const db = await getDb();
  const [p] = await db.select().from(schema.projects).where(eq(schema.projects.shareToken, token));
  if (!p) return;
  await db.insert(schema.proposalEvents).values({ projectId: p.id, kind, detail: detail.slice(0, 2000) });
}

// ---------------- catalog ----------------

export async function saveCatalogItem(form: FormData) {
  const db = await getDb();
  const id = n(form, "id");
  const values = {
    trade: s(form, "trade"),
    item: s(form, "item"),
    unit: s(form, "unit") || "EA",
    unitPrice: n(form, "unitPrice") ?? 0,
    priceType: s(form, "priceType") || "installed",
    vendor: s(form, "vendor"),
    source: s(form, "source") || "sub_quote",
    quoteDate: s(form, "quoteDate"),
    region: s(form, "region") || "Kitsap / Puget Sound",
    notes: s(form, "notes"),
    active: true,
  };
  if (!values.trade || !values.item) return;
  if (id) await db.update(schema.catalog).set(values).where(eq(schema.catalog.id, id));
  else await db.insert(schema.catalog).values(values);
  revalidatePath("/catalog");
}

export async function setCatalogActive(id: number, active: boolean) {
  const db = await getDb();
  await db.update(schema.catalog).set({ active }).where(eq(schema.catalog.id, id));
  revalidatePath("/catalog");
}

export async function deleteCatalogItem(id: number) {
  const db = await getDb();
  await db.delete(schema.catalog).where(eq(schema.catalog.id, id));
  revalidatePath("/catalog");
}

/** CSV import: trade,item,unit,unit_price,vendor,quote_date,notes (header row required) */
export async function importCatalogCsv(form: FormData) {
  const file = form.get("file") as File | null;
  if (!file) return;
  const text = await file.text();
  const rows = parseCsv(text);
  const [head, ...body] = rows;
  if (!head) return;
  const idx = (name: string) => head.findIndex((h) => h.trim().toLowerCase().replace(/[\s$]+/g, "_").includes(name));
  const ci = { trade: idx("trade"), item: idx("item"), unit: idx("unit"), price: Math.max(idx("unit_price"), idx("price")), vendor: idx("vendor"), date: idx("date"), notes: idx("note") };
  const db = await getDb();
  const values = body
    .filter((r) => r[ci.item] && r[ci.price])
    .map((r) => ({
      trade: r[ci.trade] || "General",
      item: r[ci.item],
      unit: r[ci.unit] === undefined || r[ci.unit] === "" ? "EA" : r[ci.unit],
      unitPrice: Number(String(r[ci.price]).replace(/[$,]/g, "")) || 0,
      vendor: ci.vendor >= 0 ? r[ci.vendor] ?? "" : "",
      quoteDate: ci.date >= 0 ? r[ci.date] ?? "" : "",
      notes: ci.notes >= 0 ? r[ci.notes] ?? "" : "",
      source: "sub_quote",
    }));
  if (values.length) await db.insert(schema.catalog).values(values);
  revalidatePath("/catalog");
}

function parseCsv(text: string): string[][] {
  const out: string[][] = [];
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
    else if (c === ",") { row.push(cell.trim()); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell.trim()); cell = "";
      if (row.some((x) => x)) out.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell.trim());
  if (row.some((x) => x)) out.push(row);
  return out;
}

// ---------------- lessons ----------------

export async function saveLesson(form: FormData) {
  const db = await getDb();
  const id = n(form, "id");
  const values = { scope: s(form, "scope") || "General", text: s(form, "text"), status: s(form, "status") || "active" };
  if (!values.text) return;
  if (id) await db.update(schema.lessons).set(values).where(eq(schema.lessons.id, id));
  else await db.insert(schema.lessons).values({ ...values, source: "manual" });
  revalidatePath("/lessons");
}

export async function setLessonStatus(id: number, status: string) {
  const db = await getDb();
  await db.update(schema.lessons).set({ status }).where(eq(schema.lessons.id, id));
  revalidatePath("/lessons");
}

export async function approveAllProposed() {
  const db = await getDb();
  await db.update(schema.lessons).set({ status: "active" }).where(eq(schema.lessons.status, "proposed"));
  await db.update(schema.catalog).set({ active: true }).where(and(eq(schema.catalog.source, "learned"), eq(schema.catalog.active, false)));
  revalidatePath("/lessons");
  revalidatePath("/catalog");
}

// ---------------- settings ----------------

export async function saveSettings(form: FormData) {
  const db = await getDb();
  const cur = await getSettings();
  const company: Company = {
    ...cur.company,
    name: s(form, "name") || cur.company.name,
    tagline: s(form, "tagline"),
    location: s(form, "location"),
    phone: s(form, "phone"),
    email: s(form, "email"),
    website: s(form, "website"),
    recognition: s(form, "recognition"),
    address: form.has("address") ? s(form, "address") : cur.company.address,
    filmUrl: form.has("filmUrl") ? s(form, "filmUrl") : cur.company.filmUrl,
    filmHeading: form.has("filmHeading") ? s(form, "filmHeading") : cur.company.filmHeading,
    filmBody: form.has("filmBody") ? s(form, "filmBody") : cur.company.filmBody,
    closing: form.has("closing") ? s(form, "closing") : cur.company.closing,
    benefits: form.has("benefits")
      ? s(form, "benefits").split("\n").map((l) => l.split("|")).filter((x) => x[0]?.trim()).map(([t, ...b]) => ({ title: t.trim(), body: b.join("|").trim() }))
      : cur.company.benefits,
    colors: {
      ...cur.company.colors,
      accent: s(form, "accent") || cur.company.colors.accent,
      ink: s(form, "ink") || cur.company.colors.ink,
      band: s(form, "band") || cur.company.colors.band,
    },
    defaultExclusions: s(form, "defaultExclusions").split("\n").map((x) => x.trim()).filter(Boolean),
  };
  const logo = form.get("logo") as File | null;
  if (logo && logo.size) {
    const key = await putFile(logo.name, Buffer.from(await logo.arrayBuffer()), logo.type);
    company.logoUrl = key.startsWith("local:") ? `/api/files/${encodeURIComponent(key)}` : key;
  }
  if (s(form, "removeLogo") === "1") company.logoUrl = "";
  const markups: Markups = {
    insurancePct: n(form, "insurancePct") ?? cur.markups.insurancePct,
    overheadPct: n(form, "overheadPct") ?? cur.markups.overheadPct,
    feePct: n(form, "feePct") ?? cur.markups.feePct,
    contingencyPct: n(form, "contingencyPct") ?? cur.markups.contingencyPct,
    taxPct: n(form, "taxPct") ?? cur.markups.taxPct,
  };
  const laborRates: Record<string, number> = {};
  for (const [k, v] of form.entries()) {
    if (k.startsWith("rate:") && String(v).trim()) laborRates[k.slice(5)] = Number(v);
  }
  const newRole = s(form, "newRole");
  if (newRole && n(form, "newRate")) laborRates[newRole] = n(form, "newRate")!;
  await db
    .update(schema.settings)
    .set({ company, markups, laborRates: Object.keys(laborRates).length ? laborRates : cur.laborRates, estimatingStandards: s(form, "estimatingStandards") || cur.estimatingStandards, updatedAt: new Date() })
    .where(eq(schema.settings.id, 1));
  revalidatePath("/", "layout");
}

export async function applyDefaultMarkupsToOpenProjects() {
  const db = await getDb();
  const st = await getSettings();
  await db
    .update(schema.projects)
    .set({ markups: st.markups })
    .where(inArray(schema.projects.status, ["draft", "estimating"]));
  revalidatePath("/", "layout");
}
