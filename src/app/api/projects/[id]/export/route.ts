import { getLines, getPackages, getProject, getSettings } from "@/lib/data";
import { buildRomWorkbook } from "@/lib/xlsx";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await getProject(Number(id));
  if (!p) return new Response("Not found", { status: 404 });
  const [lines, pkgs, s] = await Promise.all([getLines(p.id), getPackages(p.id), getSettings()]);
  const wb = await buildRomWorkbook(p, lines, pkgs, s);
  const buf = await wb.xlsx.writeBuffer();
  const name = `${p.name.replace(/[^a-zA-Z0-9]+/g, "_")}_ROM_Rev${p.revision}.xlsx`;
  return new Response(buf, {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename="${name}"`,
    },
  });
}
