import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getDb();
  const [j] = await db.select().from(schema.shopJobs).where(eq(schema.shopJobs.id, Number(id)));
  if (!j) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ status: j.takeoffStatus, step: j.takeoffStep, error: j.takeoffError });
}
