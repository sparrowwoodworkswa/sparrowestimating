import { getShopJob } from "@/lib/shop/data";
import { buildShopWorkbook } from "@/lib/shop/xlsx";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const full = await getShopJob(Number(id));
  if (!full) return new Response("Not found", { status: 404 });
  const wb = await buildShopWorkbook(full);
  const buf = await wb.xlsx.writeBuffer();
  const name = `${full.job.name.replace(/[^\w -]+/g, "").trim() || "Shop"} Shop ROM ${new Date().toISOString().slice(0, 10)}.xlsx`;
  return new Response(new Uint8Array(buf as ArrayBuffer), {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename="${name}"`,
    },
  });
}
