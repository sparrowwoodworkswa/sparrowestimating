import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getDb, schema } from "@/db";
import { getLines, getProjectByToken, getSettings } from "@/lib/data";
import { computeTotals, lineParts, usd, num } from "@/lib/totals";
import { DIVISIONS } from "@/lib/csi";
import { ValueOptions, ProposalNav, RespondBox, PrintLink } from "@/components/ProposalClient";
import "./proposal.css";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  const p = await getProjectByToken(token);
  return { title: p ? `${p.name} · Sparrow Woodworks proposal` : "Proposal", robots: { index: false, follow: false } };
}

const img = (k: string) => (k.startsWith("local:") ? `/api/files/${encodeURIComponent(k)}` : k);

export default async function PublicProposal({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const p = await getProjectByToken(token);
  if (!p || !p.proposal) notFound();
  const [lines, s, db] = await Promise.all([getLines(p.id), getSettings(), getDb()]);
  await db.insert(schema.proposalEvents).values({ projectId: p.id, kind: "viewed" });

  const c = s.company;
  const pr = p.proposal;
  const t = computeTotals(lines, p.markups);
  const total = lines.length ? t.total : p.contractTotalOverride ?? 0;
  const sf = p.totalSf;
  const nonZero = t.divisions.filter((d) => d.total > 0);
  const empty = t.divisions.filter((d) => d.total === 0).map((d) => d.code);
  const maxDiv = Math.max(1, ...nonZero.map((d) => d.total));
  const weeks = Math.max(1, ...pr.milestones.map((m) => m.week));
  const conflicts = p.analysis?.conflicts ?? [];
  const selfHours = Math.round(t.laborHours);
  const date = new Date(p.updatedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const m = p.markups;
  const sections = [
    ["project", "The project"],
    ["about", "Who we are"],
    ["cost", "Cost"],
    ["value", "Options"],
    ["schedule", "Schedule"],
    ["precon", "Next step"],
    ["team", "Team"],
    ["estimate", "Estimate"],
  ];

  const style = { "--acc": c.colors.accent, "--ink": c.colors.ink } as React.CSSProperties;

  return (
    <div className="prop" style={style}>
      <ProposalNav companyName={c.name} logoUrl={c.logoUrl} projectName={p.name} sections={sections} />
      <main className="wrap">
        <section className="cover" id="top">
          <div className="lab">Proposal · Preliminary estimate</div>
          <h1>{p.name}</h1>
          <p className="lede">{pr.lede}</p>
          <div className="fields">
            <div><span>Prepared for</span>{p.client || <Fill />}</div>
            <div><span>Architect</span>{p.architect || <Fill />}</div>
            <div><span>Structural</span>{p.structural || "To be engaged"}</div>
            <div><span>Design stage</span>{p.designStage || <Fill />}</div>
            <div><span>Location</span>{[p.address, p.city].filter(Boolean).join(", ") || <Fill />}</div>
            <div><span>Date</span>{date} · Rev {p.revision}</div>
          </div>
          {pr.heroImage && (
            <figure className="sheet">
              <img src={img(pr.heroImage)} alt={pr.heroCaption || p.name} />
              {pr.heroCaption && <figcaption>{pr.heroCaption}</figcaption>}
            </figure>
          )}
          <div className="headline-total">
            <div>
              <span className="lab">Anticipated construction cost</span>
              <div className="big">{usd(total)}</div>
              <div className="sub">{sf ? `${usd(total / sf)} per SF on ${num(sf)} SF · ` : ""}includes WA sales tax</div>
            </div>
            <a href="#cost" className="pill">See the numbers</a>
          </div>
        </section>

        <section className="letter">
          <span className="lab">A note from Sparrow</span>
          <div>
            <p>{pr.notePara1}</p>
            <p>We work cost-plus and open book. This estimate is our first pass from the {p.designStage ? p.designStage.toLowerCase() : "drawings"}. Pre-construction is where we turn it into a real budget together.</p>
            <div className="sig"><b>Mike Stuntz</b><span>Owner, {c.name}</span></div>
          </div>
        </section>

        <section className="sec" id="project">
          <div className="num"><span>01</span> The project</div>
          <h2>The {p.analysis?.buildingType?.toLowerCase().includes("addition") ? "addition" : "building"}, as drawn</h2>
          <div className="grid2">
            <p>{pr.projectDescription}</p>
            {pr.elevationImage ? (
              <figure className="sheet">
                <img src={img(pr.elevationImage)} alt={pr.elevationCaption || "Elevation"} />
                {pr.elevationCaption && <figcaption>{pr.elevationCaption}</figcaption>}
              </figure>
            ) : null}
          </div>
        </section>

        <section className="sec" id="about">
          <div className="num"><span>02</span> Who we are</div>
          <h2>Hands-on where it matters most</h2>
          <div className="grid2">
            <p className="big-p">
              At Sparrow, our own people handle the parts of a build that matter most. Our carpenters frame and set the structure. Our wood
              shop builds the pieces you&apos;ll see and touch every day. On {p.name}, that starts with {pr.signatureElement || "the structure"}. We take
              pride in the craft and the attention we bring to every project.
            </p>
            {c.shopPhoto && (
              <figure>
                <img className="photo" src={c.shopPhoto} alt={c.shopCaption} />
                <figcaption>{c.shopCaption}</figcaption>
              </figure>
            )}
          </div>
          <div className="three">
            {c.differentiators.map((d) => (
              <div key={d.title}><h3>{d.title}</h3><p>{d.body}</p></div>
            ))}
          </div>
          {c.recognition && <p className="awards"><span className="lab">Recognition</span>{c.recognition}</p>}
          {conflicts.length > 0 && (
            <div className="caught">
              <h3>What we caught in the drawings</h3>
              <p className="sub">A few things to sort out with {p.architect || "the architect"} before this becomes a budget.</p>
              <ol>{conflicts.slice(0, 5).map((x, i) => <li key={i}>{x.issue} {x.assumption && <span className="muted">{x.assumption}</span>}</li>)}</ol>
            </div>
          )}
        </section>

        <section className="sec" id="cost">
          <div className="num"><span>03</span> Cost summary</div>
          <h2>Anticipated construction cost</h2>
          <div className="grid2">
            <div>
              <div className="big">{usd(total)}</div>
              <div className="sub">{sf ? `${usd(total / sf)} per SF on ${num(sf)} SF · ` : ""}includes WA sales tax</div>
              {lines.length > 0 && (
                <table className="sum">
                  <tbody>
                    <tr><td>Total builder cost</td><td>{usd(t.direct)}</td></tr>
                    {t.contingency > 0 && <tr><td>Contingency ({m.contingencyPct}%)</td><td>{usd(t.contingency)}</td></tr>}
                    <tr><td>Insurance & WA B&O ({m.insurancePct}%)</td><td>{usd(t.insurance)}</td></tr>
                    {t.overhead > 0 && <tr><td>Overhead ({m.overheadPct}%)</td><td>{usd(t.overhead)}</td></tr>}
                    <tr><td>Contractor fee ({m.feePct}%)</td><td>{usd(t.fee)}</td></tr>
                    <tr><td>WA sales tax, {p.city || "site"} ({m.taxPct}%)</td><td>{usd(t.tax)}</td></tr>
                    <tr className="tot"><td>Total</td><td>{usd(t.total)}</td></tr>
                  </tbody>
                </table>
              )}
            </div>
            <div>
              <span className="lab">Pricing notes</span>
              <ul className="notes">{pr.pricingNotes.filter(Boolean).map((n) => <li key={n}>{n}</li>)}</ul>
            </div>
          </div>
          {nonZero.length > 0 && (
            <div className="bars">
              <span className="lab">Builder cost by CSI division</span>
              {nonZero.map((d) => (
                <a key={d.code} className="bar" href={`#div-${d.code}`}>
                  <span><em>{d.code}</em>{d.name}</span>
                  <div className="track"><div className="fill" style={{ width: `${(d.total / maxDiv) * 100}%` }} /></div>
                  <b>{usd(d.total)}</b>
                </a>
              ))}
              {empty.length > 0 && <p className="sub">Divisions {empty.join(", ")} carry no scope.</p>}
            </div>
          )}
        </section>

        {pr.valueOptions.length > 0 && (
          <section className="sec" id="value">
            <div className="num"><span>04</span> Value options</div>
            <h2>Ways to bring the number down</h2>
            <p>Tap an option to see what it does to the total. Each is priced with markups and tax, and none of them change {pr.signatureElement || "the heart of the design"}.</p>
            <ValueOptions options={pr.valueOptions} total={total} factor={lines.length ? t.factor : 1} />
          </section>
        )}

        {pr.milestones.length > 0 && (
          <section className="sec" id="schedule">
            <div className="num"><span>05</span> Schedule</div>
            <h2>About {weeks} weeks of construction</h2>
            <p>Time before ground breaks depends on permit review{p.city ? ` with ${p.city}` : ""}.</p>
            <div className="chips"><span>Design completion</span><span>Pre-construction</span><span>Permit</span><span>Break ground, week 0</span></div>
            <div className="timeline">
              <div className="axis">
                {pr.milestones.map((ms, i) => (
                  <div key={i} className="dot" style={{ left: `${(ms.week / weeks) * 100}%` }}><i>{i + 1}</i></div>
                ))}
              </div>
            </div>
            <div className="miles">
              {pr.milestones.map((ms, i) => (
                <div key={i}><span className="wk">{i + 1} · Week {String(ms.week).padStart(2, "0")}</span><h3>{ms.title}</h3></div>
              ))}
            </div>
            {pr.scheduleNote && <p className="sub">{pr.scheduleNote}</p>}
          </section>
        )}

        <section className="sec" id="precon">
          <div className="num"><span>06</span> Pre-construction</div>
          <h2>What happens next</h2>
          <p>Pre-construction is where this estimate becomes a budget you can build to.</p>
          <ol className="deliv">
            {c.preconDeliverables.map((d) => <li key={d.title}><b>{d.title}</b> <span>{d.body}</span></li>)}
          </ol>
          <RespondBox token={token} projectName={p.name} email={c.email} />
        </section>

        <section className="sec" id="team">
          <div className="num"><span>07</span> Your team</div>
          <h2>The people building it</h2>
          <p>Small company, no layers. Here&apos;s everyone you&apos;ll work with.</p>
          <div className="team">
            {c.team.map((tm) => (
              <div key={tm.name} className="person">
                {tm.photo ? <img src={tm.photo} alt={tm.name} /> : <div className="ph">Photo</div>}
                <h3>{tm.name}</h3>
                <span className="lab">{tm.role}</span>
                <p>{tm.name.startsWith("Derek") && pr.shopItems ? `Former lead cabinet maker at McGraw Zecha. Builds ${pr.shopItems} in our shop.` : tm.bio}</p>
              </div>
            ))}
          </div>
        </section>

        {lines.length > 0 && (
          <section className="sec" id="estimate">
            <div className="num"><span>08</span> Appendix</div>
            <h2>Detailed estimate</h2>
            <div className="appx">
              <div><span className="lab">Line items</span><b>{lines.length}</b></div>
              <div><span className="lab">Builder cost</span><b>{usd(t.direct)}</b></div>
              <div><span className="lab">Self-performed hours</span><b>{num(selfHours)}</b></div>
            </div>
            <span className="lab">Not included</span>
            <ul className="excl">{pr.exclusions.filter(Boolean).map((x) => <li key={x}>{x}</li>)}</ul>
            <span className="lab">Open a CSI division to see every line</span>
            <div className="divlist">
              {DIVISIONS.map((d) => {
                const dl = lines.filter((l) => l.division === d.code);
                const dt = t.divisions.find((x) => x.code === d.code)!;
                if (!dl.length)
                  return (
                    <div key={d.code} className="emptydiv"><h3><em>{d.code}</em>{d.name}<span className="ct">No scope</span></h3><b>–</b></div>
                  );
                return (
                  <details key={d.code} id={`div-${d.code}`}>
                    <summary><h3><em>{d.code}</em>{d.name}<span className="ct">{dl.length} lines</span></h3><b>{usd(dt.total)}</b><span className="pm">+</span></summary>
                    <div className="tblwrap">
                      <table className="items">
                        <thead><tr><th>Item</th><th>Scope we priced</th><th>Quantity</th><th className="n">Total</th></tr></thead>
                        <tbody>
                          {dl.map((l) => {
                            const lp = lineParts(l);
                            return (
                              <tr key={l.id}>
                                <td className="item"><b>{l.description}</b>{l.isAllowance && <span className="tag">Allowance</span>}<span className="code">{l.csiCode}</span></td>
                                <td>{l.scope}</td>
                                <td className="q">{num(l.qty, 2)} {l.unit} @ {usd(l.qty ? lp.total / l.qty : 0, l.qty && lp.total / l.qty < 100 ? 2 : 0)}</td>
                                <td className="n">{usd(lp.total)}</td>
                              </tr>
                            );
                          })}
                          <tr className="st"><td>Subtotal</td><td></td><td></td><td className="n">{usd(dt.total)}</td></tr>
                        </tbody>
                      </table>
                    </div>
                  </details>
                );
              })}
            </div>
          </section>
        )}
      </main>
      <footer className="foot">
        <div className="wrap">
          <p className="thanks">Thank you.</p>
          <div>
            <b>{c.name}</b>
            <div className="muted">{c.location}{c.website ? ` · ${c.website}` : ""}</div>
            <PrintLink />
          </div>
        </div>
      </footer>
    </div>
  );
}

function Fill() {
  return <span className="fill">fill in</span>;
}
