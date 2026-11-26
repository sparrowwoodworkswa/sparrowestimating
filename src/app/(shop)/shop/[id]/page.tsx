import { notFound } from "next/navigation";
import { getShopJob, getLibrary, getPriceBook, jobTotals, ratesOf, totalsBySource, listGcProjects } from "@/lib/shop/data";
import { COST_CODES } from "@/lib/costcodes";
import { hrs, usd, pct } from "@/lib/shop/model";
import { ShopEditor, type LibHint, type PriceHint } from "@/components/shop/ShopEditor";
import { SectionCode } from "@/components/shop/SectionCode";
import { PushToGc } from "@/components/shop/PushToGc";

// Shop work lands in these divisions of the Sparrow cost code list.
const SHOP_CODES = COST_CODES.filter((c) => /^(60[1-7]|120[0-3])\./.test(c.code));

export default async function ShopEstimatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const full = await getShopJob(Number(id));
  if (!full) notFound();
  const { job } = full;
  const [lib, book, gc] = await Promise.all([getLibrary(), getPriceBook(), listGcProjects()]);
  const t = jobTotals(full);
  const bySource = totalsBySource(full);
  const gcName = gc.find((g) => g.id === job.gcProjectId)?.name ?? null;

  // Best library sample per piece type: Actual first, then Sparrow estimate, newest first (already sorted).
  const library: LibHint[] = lib
    .filter((e) => e.samples.some((s) => s.total > 0))
    .map((e) => {
      const s = e.samples.find((x) => x.total > 0)!;
      return { pieceType: e.pieceType, unit: e.unit, perUnit: s.perUnit, from: `${s.jobName} ${s.year ?? ""} (${s.source})` };
    });
  const seen = new Set<string>();
  const prices: PriceHint[] = book
    .filter((p) => (seen.has(p.item.toLowerCase()) ? false : (seen.add(p.item.toLowerCase()), true)))
    .map((p) => ({ item: p.item, unit: p.unit, price: p.current, from: `${p.source} ${p.quoteDate}${p.vendor ? `, ${p.vendor}` : ""}` }));

  return (
    <>
      <div className="sw-facts">
        <div><div className="label">Shop hours</div><div className="v">{hrs(t.personHours)}</div><div className="s">person-hours</div></div>
        <div><div className="label">Labor</div><div className="v">{usd(t.labor)}</div><div className="s">at {usd(job.shopRate)} per hour</div></div>
        <div><div className="label">Materials</div><div className="v">{usd(t.materials)}</div></div>
        <div><div className="label">Buffer</div><div className="v">{usd(t.buffer)}</div><div className="s">{pct(job.bufferPct)} of labor and materials</div></div>
        <div><div className="label">Shop total</div><div className="v">{usd(t.total)}</div><div className="s">{job.taxPct ? `includes ${(job.taxPct * 100).toFixed(1)}% tax` : "before GC fee and tax"}</div></div>
      </div>

      <div className="two" style={{ marginTop: 40 }}>
        <div>
          <h2 className="section">Sections</h2>
          <div className="sw-scroll">
            <table>
              <thead>
                <tr><th>Section</th><th>Cost code (for the GC estimate)</th><th className="num">Hours</th><th className="num">Total</th></tr>
              </thead>
              <tbody>
                {t.sections.map((s) => (
                  <tr key={s.section}>
                    <td>{s.section}</td>
                    <td><SectionCode jobId={job.id} section={s.section} code={job.sectionCodes?.[s.section] ?? ""} options={SHOP_CODES} /></td>
                    <td className="num">{hrs(s.personHours)}</td>
                    <td className="num">{usd(s.total)}</td>
                  </tr>
                ))}
                <tr className="total"><td colSpan={2}>Total</td><td className="num">{hrs(t.personHours)}</td><td className="num">{usd(t.total)}</td></tr>
              </tbody>
            </table>
          </div>
          <div className="row" style={{ marginTop: 16 }}>
            <a className="btn line" href={`/api/shop/${job.id}/xlsx`}>Download spreadsheet</a>
            <PushToGc jobId={job.id} gcName={gcName} />
          </div>
        </div>
        <div>
          {bySource.length > 1 ? (
            <>
              <h2 className="section">Your estimate vs Claude takeoff</h2>
              <div className="sw-scroll">
                <table>
                  <thead>
                    <tr><th>Source</th><th className="num">Hours</th><th className="num">Labor</th><th className="num">Materials</th><th className="num">Total</th></tr>
                  </thead>
                  <tbody>
                    {bySource.map(({ source, totals }) => (
                      <tr key={source} className={source === job.basis ? "sub" : ""}>
                        <td>{source}{source === job.basis ? " (job total)" : ""}</td>
                        <td className="num">{hrs(totals.personHours)}</td>
                        <td className="num">{usd(totals.labor)}</td>
                        <td className="num">{usd(totals.materials)}</td>
                        <td className="num">{usd(totals.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="caption" style={{ marginTop: 8 }}>Neither one is changed by the other. Switch which one counts in Job settings.</p>
            </>
          ) : (
            <>
              <h2 className="section">Notes</h2>
              <p className="lede">{job.notes || "No notes yet."}</p>
            </>
          )}
        </div>
      </div>

      <h2 className="section">Estimate</h2>
      <p className="caption" style={{ marginBottom: 16 }}>
        Hours are crew-hours for the whole row. Install, packaging and transport run as a crew of {job.crews?.install ?? 2}, so each crew-hour is billed at {job.crews?.install ?? 2} x {usd(job.shopRate)}.
        Grayed rows don&apos;t count toward the total.
      </p>
      <ShopEditor
        jobId={job.id}
        rates={ratesOf(job)}
        basis={job.basis}
        pieces={full.pieces}
        extras={full.extras}
        materials={full.materials}
        library={library}
        prices={prices}
      />
    </>
  );
}
