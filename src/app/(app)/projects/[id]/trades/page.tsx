import Link from "next/link";
import { getPackages, getProject } from "@/lib/data";
import { createPackage } from "@/app/actions";
import { usd } from "@/lib/totals";

const BID: Record<string, { label: string; tone: string }> = {
  not_sent: { label: "Not sent", tone: "neutral" },
  sent: { label: "Out to bid", tone: "info" },
  received: { label: "Bid received", tone: "warn" },
  awarded: { label: "Awarded", tone: "good" },
};

export default async function TradesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = (await getProject(Number(id)))!;
  const pkgs = await getPackages(p.id);
  const romSum = pkgs.reduce((a, x) => a + x.estimatedPrice, 0);
  const bids = pkgs.filter((x) => x.bidAmount != null);
  const bidVsRom = bids.reduce((a, x) => a + (x.bidAmount! - x.estimatedPrice), 0);

  return (
    <div className="stack">
      <div className="grid cols-3">
        <div className="card kpi"><div className="label">Trade packages</div><div className="value">{pkgs.length}</div><div className="sub">scopes of work with material lists</div></div>
        <div className="card kpi"><div className="label">ROM carried for these trades</div><div className="value">{usd(romSum)}</div><div className="sub">direct cost, before markup</div></div>
        <div className="card kpi"><div className="label">Bids vs ROM</div><div className="value">{bids.length ? `${bidVsRom >= 0 ? "+" : ""}${usd(bidVsRom)}` : "–"}</div><div className="sub">{bids.length} of {pkgs.length} bids in</div></div>
      </div>

      {pkgs.length === 0 ? (
        <div className="card empty">
          <span className="material-symbols-outlined">handyman</span>
          <p>Trade packages are written when the ROM is built from plans. Each one has a scope of work and full material list to send to subs with the plans.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr><th>Trade</th><th>Divisions</th><th className="n">Materials</th><th className="n">ROM</th><th>Bid</th><th className="n">Bid amount</th><th className="n">Variance</th><th></th></tr>
            </thead>
            <tbody>
              {pkgs.map((x) => {
                const b = BID[x.bidStatus] ?? BID.not_sent;
                const v = x.bidAmount != null ? x.bidAmount - x.estimatedPrice : null;
                return (
                  <tr key={x.id}>
                    <td><Link className="rowlink" href={`/projects/${p.id}/trades/${x.id}`}>{x.trade}</Link>{x.bidVendor && <div className="small muted">{x.bidVendor}</div>}</td>
                    <td className="muted">{x.divisions}</td>
                    <td className="n">{x.materials.length}</td>
                    <td className="n">{usd(x.estimatedPrice)}</td>
                    <td><span className={`chip ${b.tone}`}>{b.label}</span></td>
                    <td className="n">{usd(x.bidAmount)}</td>
                    <td className="n" style={{ color: v == null ? undefined : v > 0 ? "var(--md-error)" : "var(--md-good)" }}>
                      {v == null ? "–" : `${v > 0 ? "+" : ""}${usd(v)} (${x.estimatedPrice ? Math.round((v / x.estimatedPrice) * 100) : 0}%)`}
                    </td>
                    <td className="n">
                      <Link className="btn text small" href={`/bid/${x.id}`} target="_blank">
                        <span className="material-symbols-outlined">print</span> Bid package
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <form action={createPackage.bind(null, p.id)} className="row">
        <input className="input" name="trade" placeholder="Add a trade package (e.g. Fire sprinklers)" style={{ maxWidth: 360 }} />
        <button className="btn tonal"><span className="material-symbols-outlined">add</span> Add</button>
      </form>
    </div>
  );
}
