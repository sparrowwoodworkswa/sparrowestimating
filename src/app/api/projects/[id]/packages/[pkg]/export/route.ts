import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { getProject, getSettings } from "@/lib/data";
import { buildMaterialsWorkbook } from "@/lib/xlsx";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string; pkg: string }> }) {
  const { id, pkg } = await params;
  const db = await getDb();
  const [x] = await db.select().from(schema.tradePackages).where(eq(schema.tradePackages.id, Number(pkg)));
  const p = await getProject(Number(id));
  if (!x || !p || x.projectId !== p.id) return new Response("Not found", { status: 404 });
  const wb = await buildMaterialsWorkbook(p, x, await getSettings());
  const buf = await wb.xlsx.writeBuffer();
  const name = `${p.name}_${x.trade}_bid`.replace(/[^a-zA-Z0-9]+/g, "_");
  return new Response(buf, {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename="${name}.xlsx"`,
    },
  });
}
