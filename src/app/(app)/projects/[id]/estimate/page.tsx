import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { getLines, getProject, getSettings } from "@/lib/data";
import { EstimateEditor } from "@/components/EstimateEditor";

export default async function EstimatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = (await getProject(Number(id)))!;
  const [lines, settings, db] = await Promise.all([getLines(p.id), getSettings(), getDb()]);
  const catalog = await db.select().from(schema.catalog).where(eq(schema.catalog.active, true));
  return (
    <EstimateEditor
      project={{ id: p.id, totalSf: p.totalSf, markups: p.markups, name: p.name, contractTotalOverride: p.contractTotalOverride }}
      initialLines={lines}
      laborRates={settings.laborRates}
      catalog={catalog.map((c) => ({ id: c.id, trade: c.trade, item: c.item, unit: c.unit, unitPrice: c.unitPrice, vendor: c.vendor }))}
      defaultMarkups={settings.markups}
      feePresets={settings.company.feePresets ?? []}
    />
  );
}
