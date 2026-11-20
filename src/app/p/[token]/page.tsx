import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getDb, schema } from "@/db";
import { getLines, getProjectByToken, getSettings } from "@/lib/data";
import { computeTotals, lineParts, usd, num } from "@/lib/totals";
import { DIVISIONS } from "@/lib/csi";
import { resolveProposal, youtubeId, fileUrl } from "@/lib/proposal";
import { ValueOptions, ProposalNav, RespondBox, PrintLink, Film, PageBehavior } from "@/components/ProposalClient";
import "./proposal.css";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  const p = await getProjectByToken(token);
  return { title: p ? `${p.name} · Sparrow Woodworks proposal` : "Proposal", robots: { index: false, follow: false } };
}

export default async function PublicProposal({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const p = await getProjectByToken(token);
  if (!p || !p.proposal) notFound();
  const [lines, s, db] = await Promise.all([getLines(p.id), getSettings(), getDb()]);
  await db.insert(schema.proposalEvents).values({ projectId: p.id, kind: "viewed" });

  const c = s.company;
  const pr = resolveProposal(p, p.proposal, c);
  const show = (k: string) => !pr.hidden.includes(k);
  const t = computeTotals(lines, p.markups);
  const total = lines.length ? t.total : p.contractTotalOverride ?? 0;
  const sf = p.totalSf;
  const nonZero = t.divisions.filter((d) => d.total > 0);
  const empty = t.divisions.filter((d) => d.total === 0).map((d) => d.code);
  const maxDiv = Math.max(1, ...nonZero.map((d) => d.total));
  const step = maxDiv > 2e6 ? 5e5 : maxDiv > 8e5 ? 2.5e5 : maxDiv > 2e5 ? 5e4 : 2.5e4;
  const ticks = Array.from({ length: Math.floor(maxDiv / step) + 1 }, (_, i) => i * step);
  const weeks = Math.max(1, ...pr.milestones.map((m) => m.week));
  const conflicts = p.analysis?.conflicts ?? [];
  const date = new Date(p.updatedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const m = p.markups;
  const film = youtubeId(pr.filmUrl);
  const gallery = [
    ...(pr.elevationImage ? [{ src: pr.elevationImage, caption: pr.elevationCaption }] : []),
    ...pr.gallery,
  ];

  // Numbered sections, in page order, skipping any that are hidden or empty.
  const numbered = [
    ["benefits", "Owner benefits", show("benefits")],
    ["cost", "Your preliminary cost summary", show("cost")],
    ["value", "Value options", show("value") && pr.valueOptions.length > 0],
    ["schedule", "Projected schedule", show("schedule") && pr.milestones.length > 0],
    ["precon", "Next step: Pre-construction", show("precon")],
    ["team", "Meet the team", show("team")],
    ["estimate", "Appendix: Detailed estimate", show("estimate") && lines.length > 0],
    ["agreement", `Appendix: ${pr.agreementLabel}`, show("precon") && !!pr.agreementUrl],
  ].filter((x) => x[2]) as [string, string, boolean][];
  const n = (k: string) => String(numbered.findIndex((x) => x[0] === k) + 1).padStart(2, "0");

  const style = { "--acc": c.colors.accent, "--ink": c.colors.ink, "--band": c.colors.band ?? "#E6E4D8" } as React.CSSProperties;

  return (
    <div className="prop" style={style}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;1,400;1,500&family=Jost:wght@400;500&display=swap" precedence="default" />
      <PageBehavior />
      <ProposalNav companyName={c.name} logoUrl={c.logoUrl} projectName={p.name} sections={numbered.map(([k, label]) => [k, label])} />

      <header className="cover band" id="top">
        <div className="wrap">
          <div className="cover-top">
            <span className="tag">Rough order of magnitude proposal</span>
            {c.logoUrl && <img className="cover-mark" src={c.logoUrl} alt="" />}
          </div>
          <h1>{p.name}</h1>
          <p className="lede">{pr.lede}</p>
          <div className="fields">
            <div><span>Prepared for</span>{p.client || <Fill />}</div>
            <div><span>Architect</span>{p.architect || <Fill />}</div>
            <div><span>Design stage</span>{p.designStage || <Fill />}</div>
            <div><span>Location</span>{[p.address, p.city].filter(Boolean).join(", ") || <Fill />}</div>
            <div><span>Date</span>{date} · Rev {p.revision}</div>
          </div>
        </div>
      </header>
      {pr.heroImage && (
        <figure className="hero">
          <img src={fileUrl(pr.heroImage)} alt={pr.heroCaption || p.name} />
          {pr.heroCaption && <figcaption>{pr.heroCaption}</figcaption>}
        </figure>
      )}

      <main>
        {show("letter") && (
          <section className="s welcome">
            <div className="wrap letter-grid">
              <div className="letter">
                <span className="tag">Welcome</span>
                <h2 className="salute">{pr.salutation}</h2>
                <p>{pr.notePara1}</p>
                <p>{pr.notePara2}</p>
                <div className="sig">
                  <b>Mike Stuntz</b>
                  <span>Owner, {c.name}</span>
                </div>
              </div>
              <nav className="toc">
                <h3>In this proposal</h3>
                <ol>
                  {numbered.map(([k, label]) => (
                    <li key={k}><a href={`#${k}`}><span>{n(k)}</span>{label}</a></li>
                  ))}
                </ol>
              </nav>
            </div>
          </section>
        )}

        {show("project") && (
          <section className="s" id="project">
            <div className="wrap">
              <span className="tag">The project</span>
              <h2>{p.name}, as drawn</h2>
              <p className="intro">{pr.projectDescription}</p>
              {gallery.length > 0 && (
                <div className={`gallery g${Math.min(gallery.length, 4)}`}>
                  {gallery.map((g, i) => (
                    <figure key={i}>
                      <div className="img"><img src={fileUrl(g.src)} alt={g.caption || p.name} /></div>
                      {g.caption && <figcaption>{g.caption}</figcaption>}
                    </figure>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {show("film") && film && (
          <section className="s" id="film">
            <div className="wrap">
              <span className="tag">{c.name}</span>
              <h2>{c.filmHeading || "Built by hand."}</h2>
              {c.filmBody && <p className="intro">{c.filmBody}</p>}
              <Film id={film} poster={c.shopPhoto} logo={c.logoUrl} label={c.name} />
            </div>
          </section>
        )}

        {show("about") && (
          <section className="s" id="about">
            <div className="wrap">
              <span className="tag">Who we are</span>
              <h2>Hands-on where it matters most</h2>
              <div className="grid2">
                <p className="intro">
                  At Sparrow, our own people handle the parts of a build that matter most. Our carpenters frame and set the structure. Our wood shop
                  builds the pieces you&apos;ll see and touch every day. On {p.name}, that starts with {pr.signatureElement || "the structure"}. We take pride in the
                  craft and the attention we bring to every project.
                </p>
                {c.shopPhoto && (
                  <figure>
                    <div className="img"><img src={c.shopPhoto} alt={c.shopCaption} /></div>
                    <figcaption>{c.shopCaption}</figcaption>
                  </figure>
                )}
              </div>
              <div className="three">
                {c.differentiators.map((d) => (
                  <div key={d.title}><h3>{d.title}</h3><p>{d.body}</p></div>
                ))}
              </div>
              {c.recognition && <p className="awards"><span className="mono">Recognition</span>{c.recognition}</p>}
            </div>
          </section>
        )}

        {show("benefits") && (
          <section className="s" id="benefits">
            <div className="wrap">
              <span className="tag">{n("benefits")} · Owner benefits</span>
              <h2>How you benefit from our approach</h2>
              <div className="benefits">
                {pr.benefits.map((b) => (
                  <div key={b.title}><h3>{b.title}</h3><p>{b.body}</p></div>
                ))}
              </div>
              {show("caught") && conflicts.length > 0 && (
                <div className="caught">
                  <h3>What we caught in the drawings</h3>
                  <p className="sub">A few things to sort out with {p.architect || "the architect"} before this becomes a budget.</p>
                  <ol>{conflicts.slice(0, 6).map((x, i) => <li key={i}>{x.issue} {x.assumption && <span className="muted">{x.assumption}</span>}</li>)}</ol>
                </div>
              )}
            </div>
          </section>
        )}

        {show("cost") && (
          <section className="s band" id="cost">
            <div className="wrap">
              <span className="tag">{n("cost")} · Cost info</span>
              <h2>Projected cost summary</h2>
              <p className="stage">Current stage: {p.designStage || "preliminary drawings"}</p>
              <div className="cost-grid">
                <div>
                  <span className="mono">Anticipated construction cost</span>
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
                  <span className="mono dark">Pricing notes</span>
                  <ul className="notes">{pr.pricingNotes.filter(Boolean).map((x) => <li key={x}>{x}</li>)}</ul>
                  {lines.length > 0 && show("estimate") && <p className="small muted">Your detailed estimate is in the appendix (see <a href="#estimate">{n("estimate")}. Detailed estimate</a>).</p>}
                </div>
              </div>
              {nonZero.length > 0 && (
                <div className="breakdown">
                  <span className="mono dark">Cost breakdown</span>
                  <p className="small muted">Builder cost by CSI division, from the estimate.</p>
                  <div className="chart">
                    {nonZero.map((d) => (
                      <a key={d.code} className="bar" href={`#div-${d.code}`}>
                        <span>{d.name}</span>
                        <div className="track"><div className="fill" style={{ width: `${(d.total / maxDiv) * 100}%` }} /><b>{usd(d.total)}</b></div>
                      </a>
                    ))}
                    <div className="axis"><span /><div>{ticks.map((v) => <i key={v} style={{ left: `${(v / maxDiv) * 100}%` }}>{v === 0 ? "0" : v >= 1e6 ? `$${v / 1e6}M` : `$${v / 1e3}k`}</i>)}</div></div>
                    <div className="chart-foot"><span>CSI division</span><span>Total builder cost <b>{usd(t.direct)}</b></span></div>
                  </div>
                  {empty.length > 0 && <p className="small muted">Divisions {empty.join(", ")} carry no scope.</p>}
                </div>
              )}
            </div>
          </section>
        )}

        {show("value") && pr.valueOptions.length > 0 && (
          <section className="s" id="value">
            <div className="wrap">
              <span className="tag">{n("value")} · Value options</span>
              <h2>Ways to bring the number down</h2>
              <p className="intro">Each option is a design choice with its cost attached, priced with markups and tax. Tap any of them to see your new total. None of them change {pr.signatureElement || "the heart of the design"}.</p>
              <ValueOptions options={pr.valueOptions} total={total} factor={lines.length ? t.factor : 1} />
            </div>
          </section>
        )}

        {show("schedule") && pr.milestones.length > 0 && (
          <section className="s" id="schedule">
            <div className="wrap">
              <span className="tag">{n("schedule")} · Schedule</span>
              <h2>Projected schedule</h2>
              <p className="intro">About {weeks} weeks of construction. Time before ground breaks depends on permit review{p.city ? ` with ${p.city}` : ""}.</p>
              <div className="timeline">
                <div className="axis-line">
                  {pr.milestones.map((ms, i) => <span key={i} className={`dot${i === pr.milestones.length - 1 ? " end" : ""}`} style={{ left: `${(ms.week / weeks) * 100}%` }} />)}
                </div>
                <div className="tl-ticks">
                  {Array.from({ length: Math.floor(weeks / Math.max(1, Math.ceil(weeks / 10))) + 1 }, (_, i) => i * Math.max(1, Math.ceil(weeks / 10))).map((w) => (
                    <i key={w} style={{ left: `${(w / weeks) * 100}%` }}>{String(w).padStart(2, "0")}</i>
                  ))}
                </div>
              </div>
              <div className="miles" style={{ gridTemplateColumns: `repeat(${Math.min(pr.milestones.length, 6)}, minmax(0, 1fr))` }}>
                {pr.milestones.map((ms, i) => (
                  <div key={i}>
                    <span className="mono">Week {String(ms.week).padStart(2, "0")}</span>
                    <h3>{ms.title}</h3>
                    {ms.detail && <p>{ms.detail}</p>}
                  </div>
                ))}
              </div>
              {pr.scheduleNote && <p className="small muted">{pr.scheduleNote}</p>}
            </div>
          </section>
        )}

        {show("precon") && (
          <section className="s" id="precon">
            <div className="wrap">
              <span className="tag">{n("precon")} · Next step</span>
              <h2>Pre-construction</h2>
              <p className="intro">{pr.preconIntro}</p>
              <div className="precon-grid">
                <div>
                  <span className="mono dark">What you get</span>
                  <ol className="deliv">
                    {pr.preconDeliverables.map((d, i) => (
                      <li key={d.title}><span>{String(i + 1).padStart(2, "0")}</span><div><b>{d.title}</b><p>{d.body.charAt(0).toUpperCase() + d.body.slice(1)}</p></div></li>
                    ))}
                  </ol>
                </div>
                <aside className="side band">
                  {pr.retainer && (
                    <>
                      <span className="mono">Retainer</span>
                      <div className="big small-big">{pr.retainer}</div>
                    </>
                  )}
                  <RespondBox token={token} projectName={p.name} email={c.email} agreementUrl={pr.agreementUrl ? fileUrl(pr.agreementUrl) : ""} agreementLabel={pr.agreementLabel} />
                </aside>
              </div>
            </div>
          </section>
        )}

        {show("team") && (
          <section className="s" id="team">
            <div className="wrap">
              <span className="tag">{n("team")} · Your team</span>
              <h2>The people building {p.name}</h2>
              <div className="team">
                {c.team.map((tm) => (
                  <div key={tm.name} className="person">
                    {tm.photo ? <img src={tm.photo} alt={tm.name} /> : <div className="ph">Photo</div>}
                    <h3>{tm.name}</h3>
                    <span className="mono">{tm.role}</span>
                    <p>{tm.name.startsWith("Derek") && pr.shopItems ? `Former lead cabinet maker at McGraw Zecha. Builds ${pr.shopItems} in our shop.` : tm.bio}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {show("estimate") && lines.length > 0 && (
          <section className="s" id="estimate">
            <div className="wrap">
              <span className="tag">{n("estimate")} · Appendix</span>
              <h2>Detailed estimate</h2>
              <div className="appx">
                <div><span className="mono">Line items</span><b>{lines.length}</b></div>
                <div><span className="mono">Builder cost</span><b>{usd(t.direct)}</b></div>
                {t.laborHours > 0 && <div><span className="mono">Self-performed hours</span><b>{num(Math.round(t.laborHours))}</b></div>}
              </div>
              <h3 className="mono dark">Not included</h3>
              <ul className="excl">{pr.exclusions.filter(Boolean).map((x) => <li key={x}>{x}</li>)}</ul>
              <h3 className="mono dark">Browse every line</h3>
              <div className="divlist">
                {DIVISIONS.map((d) => {
                  const dl = lines.filter((l) => l.division === d.code);
                  const dt = t.divisions.find((x) => x.code === d.code)!;
                  if (!dl.length) return <div key={d.code} className="emptydiv"><h3><em>{d.code}</em>{d.name}<span className="ct">No scope</span></h3><b>–</b></div>;
                  return (
                    <details key={d.code} id={`div-${d.code}`} className="cat">
                      <summary><h3><em>{d.code}</em>{d.name}<span className="ct">{dl.length} lines</span></h3><b>{usd(dt.total)}</b><span className="pm">+</span></summary>
                      <div className="tblwrap">
                        <table className="items">
                          <thead><tr><th>Item</th><th>Scope we priced</th><th>Quantity</th><th className="n">Total</th></tr></thead>
                          <tbody>
                            {dl.map((l) => {
                              const lp = lineParts(l);
                              const unit = l.qty ? lp.total / l.qty : 0;
                              return (
                                <tr key={l.id}>
                                  <td className="item"><b>{l.description}</b>{l.isAllowance && <span className="atag">Allowance</span>}<span className="code">{l.csiCode}</span></td>
                                  <td>{l.scope}</td>
                                  <td className="q">{num(l.qty, 2)} {l.unit} @ {usd(unit, unit < 100 ? 2 : 0)}</td>
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
            </div>
          </section>
        )}

        {show("precon") && pr.agreementUrl && (
          <section className="s" id="agreement">
            <div className="wrap">
              <span className="tag">{n("agreement")} · Appendix</span>
              <h2>{pr.agreementLabel}</h2>
              <div className="agree">
                <div className="doc-thumb">{c.logoUrl ? <img src={c.logoUrl} alt="" /> : null}<i>Agreement</i><span /><span /><span className="short" /></div>
                <div>
                  <span className="mono">{pr.agreementLabel} · PDF</span>
                  <p className="agree-title">Review and sign your {pr.agreementLabel.toLowerCase()}</p>
                  <a className="btn-dark" href={fileUrl(pr.agreementUrl)} target="_blank" rel="noreferrer">Open the agreement →</a>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      <footer className="foot band">
        <div className="wrap">
          <p className="thanks">Thank you.</p>
          <p className="closing">{pr.closing}</p>
          <div className="foot-row">
            {c.logoFullUrl ? <img className="foot-logo" src={c.logoFullUrl} alt={c.name} /> : <b>{c.name}</b>}
            <div className="mono addr">
              {c.address && <div>{c.address}</div>}
              {c.phone && <div>{c.phone}</div>}
              {c.email && <div><a href={`mailto:${c.email}`}>{c.email}</a></div>}
              {c.website && <div>{c.website}</div>}
              <PrintLink />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Fill() {
  return <span className="fill">fill in</span>;
}
