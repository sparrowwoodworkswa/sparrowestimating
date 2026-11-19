"use client";
import { useEffect, useState, useTransition } from "react";
import type { ValueOption } from "@/db/schema";
import { recordProposalEvent } from "@/app/actions";
import { usd } from "@/lib/totals";

export function ProposalNav({ companyName, logoUrl, projectName, sections }: { companyName: string; logoUrl: string; projectName: string; sections: string[][] }) {
  const [active, setActive] = useState("");
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      setProgress(h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight));
      let cur = "";
      for (const [id] of sections) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top < 140) cur = id;
      }
      setActive(cur);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [sections]);
  return (
    <header className="top">
      <div className="wrap bar-row">
        <a href="#top" className="brand">{logoUrl ? <img src={logoUrl} alt={companyName} /> : companyName}</a>
        <span className="proj">{projectName} · Preliminary estimate</span>
        <a className="next" href="#precon">Next step: Pre-construction</a>
      </div>
      <nav className="wrap secnav">
        {sections.map(([id, label]) => (
          <a key={id} href={`#${id}`} className={active === id ? "on" : ""}>{label}</a>
        ))}
      </nav>
      <div className="prog" style={{ transform: `scaleX(${progress})` }} />
    </header>
  );
}

export function ValueOptions({ options, total, factor }: { options: ValueOption[]; total: number; factor: number }) {
  const [on, setOn] = useState<boolean[]>(options.map(() => false));
  const priced = options.map((o) => Math.round((o.directDelta * factor) / 100) * 100);
  const delta = priced.reduce((a, d, i) => a + (on[i] ? d : 0), 0);
  const all = priced.reduce((a, d) => a + d, 0);
  return (
    <>
      <div className="ve">
        {options.map((o, i) => (
          <button key={i} type="button" className={`vecard${on[i] ? " on" : ""}`} onClick={() => setOn(on.map((x, j) => (j === i ? !x : x)))} aria-pressed={on[i]}>
            <span className="lab">Option {String.fromCharCode(65 + i)}</span>
            <h3>{o.title}</h3>
            <p>{o.description}</p>
            <div className="amt">{priced[i] < 0 ? "−" : "+"}{usd(Math.abs(priced[i]))}</div>
            <span className="tick">{on[i] ? "Included in total" : "Tap to include"}</span>
          </button>
        ))}
      </div>
      <div className="vetotal">
        <div><span className="lab">Current estimated total</span><b>{usd(total)}</b></div>
        <div><span className="lab">Options you picked</span><b>{delta ? `${delta < 0 ? "−" : "+"}${usd(Math.abs(delta))}` : "–"}</b></div>
        <div className="hl"><span className="lab">Your total</span><b>{usd(total + delta)}</b></div>
        <div><span className="lab">With every option</span><b>{usd(total + all)}</b></div>
      </div>
    </>
  );
}

export function RespondBox({ token, projectName, email }: { token: string; projectName: string; email: string }) {
  const [sent, setSent] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [pending, start] = useTransition();
  return (
    <div className="callout">
      <div>
        <span className="lab">Ready when you are</span>
        <h3>Start pre-construction on {projectName}</h3>
        <p className="sub">Tell us you&apos;re ready, or send a question about any line. It comes straight to our team.</p>
      </div>
      {sent ? (
        <p className="done">{sent}</p>
      ) : (
        <div className="respond">
          <button className="cta" disabled={pending} onClick={() => start(async () => { await recordProposalEvent(token, "accepted", "Client is ready to start pre-construction"); setSent("Thank you. We'll be in touch within one business day to set up pre-construction."); })}>
            I&apos;m ready to move forward
          </button>
          <div className="ask">
            <textarea placeholder="Ask a question about the estimate" value={q} onChange={(e) => setQ(e.target.value)} />
            <button disabled={!q.trim() || pending} onClick={() => start(async () => { await recordProposalEvent(token, "question", q); setSent("Got it. We'll answer your question soon."); })}>Send question</button>
          </div>
          {email && <a className="mail" href={`mailto:${email}?subject=${encodeURIComponent(projectName + " proposal")}`}>or email {email}</a>}
        </div>
      )}
    </div>
  );
}

export function PrintLink() {
  return (
    <button className="printlink" onClick={() => { document.querySelectorAll(".prop details").forEach((d) => d.setAttribute("open", "")); window.print(); }}>
      Save as PDF
    </button>
  );
}
