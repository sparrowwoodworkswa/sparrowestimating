import { NextResponse, after } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { runStage, type Stage } from "@/lib/ai/pipeline";

export const dynamic = "force-dynamic";
// Each step of a ROM run gets its own function invocation. 300s fits every Vercel plan with fluid compute.
export const maxDuration = 300;

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { runId?: number; secret?: string; stage?: Stage; key?: string } | null;
  if (!body?.runId || !body.secret || !body.stage) return NextResponse.json({ error: "bad request" }, { status: 400 });
  const db = await getDb();
  const [run] = await db.select().from(schema.aiRuns).where(eq(schema.aiRuns.id, body.runId));
  if (!run || run.secret !== body.secret) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (run.status !== "running") return NextResponse.json({ ok: false, status: run.status });
  after(() => runStage(body.runId!, body.stage!, body.key));
  return NextResponse.json({ ok: true }, { status: 202 });
}
