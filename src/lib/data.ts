import "server-only";
import { asc, desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { Project, EstimateLine } from "@/db/schema";
import { projectHeadline } from "./totals";

export async function getSettings() {
  const db = await getDb();
  const [s] = await db.select().from(schema.settings).where(eq(schema.settings.id, 1));
  return s;
}

export async function getProject(id: number) {
  const db = await getDb();
  const [p] = await db.select().from(schema.projects).where(eq(schema.projects.id, id));
  return p ?? null;
}

export async function getProjectByToken(token: string) {
  const db = await getDb();
  const [p] = await db.select().from(schema.projects).where(eq(schema.projects.shareToken, token));
  return p ?? null;
}

export async function getLines(projectId: number) {
  const db = await getDb();
  return db
    .select()
    .from(schema.estimateLines)
    .where(eq(schema.estimateLines.projectId, projectId))
    .orderBy(asc(schema.estimateLines.division), asc(schema.estimateLines.sort), asc(schema.estimateLines.id));
}

export async function getPackages(projectId: number) {
  const db = await getDb();
  return db.select().from(schema.tradePackages).where(eq(schema.tradePackages.projectId, projectId)).orderBy(asc(schema.tradePackages.id));
}

export async function getPlanFiles(projectId: number) {
  const db = await getDb();
  return db.select().from(schema.planFiles).where(eq(schema.planFiles.projectId, projectId)).orderBy(asc(schema.planFiles.id));
}

export async function getLatestRun(projectId: number) {
  const db = await getDb();
  const [r] = await db.select().from(schema.aiRuns).where(eq(schema.aiRuns.projectId, projectId)).orderBy(desc(schema.aiRuns.id)).limit(1);
  return r ?? null;
}

export type ProjectRow = Project & { direct: number | null; total: number | null; perSf: number | null; lineCount: number };

export async function listProjectsWithTotals(): Promise<ProjectRow[]> {
  const db = await getDb();
  const projects = await db.select().from(schema.projects).orderBy(desc(schema.projects.updatedAt));
  const lines = await db.select().from(schema.estimateLines);
  const byProject = new Map<number, EstimateLine[]>();
  for (const l of lines) {
    const arr = byProject.get(l.projectId) ?? [];
    arr.push(l);
    byProject.set(l.projectId, arr);
  }
  return projects.map((p) => {
    const ls = byProject.get(p.id) ?? [];
    const h = projectHeadline(p, ls);
    return { ...p, direct: h.direct, total: h.total, perSf: h.total && p.totalSf ? h.total / p.totalSf : null, lineCount: ls.length };
  });
}
