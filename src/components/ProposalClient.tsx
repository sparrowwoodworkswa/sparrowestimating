"use client";
import { useEffect, useState, useTransition } from "react";
import type { ValueOption } from "@/db/schema";
import { recordProposalEvent } from "@/app/actions";
import { usd } from "@/lib/totals";

/** Opens at the cover, keeps in-page links out of the address bar, and expands every estimate line for printing. */
export function PageBehavior() {
  useEffect(() => {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    if (location.hash) history.replaceState(null, "", location.pathname + location.search);
    window.scrollTo(0, 0);
    const onClick = (ev: MouseEvent) => {
      const a = (ev.target as HTMLElement).closest('a[href^="#"]') as HTMLAnchorElement | null;
      if (!a || ev.defaultPrevented || ev.metaKey || ev.ctrlKey || ev.shiftKey) return;
      const el = document.getElementById(a.getAttribute("href")!.slice(1));
      if (!el) return;
      ev.preventDefault();
      if (el.tagName === "DETAILS") (el as HTMLDetailsElement).open = true;
      el.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    };
    const beforePrint = () => document.querySelectorAll<HTMLDetailsElement>(".prop details.cat").forEach((d) => (d.open = true));
    document.addEventListener("click", onClick);
    window.addEventListener("beforeprint", beforePrint);
    return () => {
      document.removeEventListener("click", onClick);
      window.removeEventListener("beforeprint", beforePrint);
    };
  }, []);
  return null;
}

export function ProposalNav({ companyName, logoUrl, projectName }: { companyName: string; logoUrl: string; projectName: string; sections: string[][] }) {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      setProgress(h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <div className="top">
      <div className="wrap bar-row">
        <a href="#top" className="brand">
          {logoUrl && <img src={logoUrl} alt="" />}
          <span>{companyName}</span>
        </a>
        <span className="proj">{projectName} · ROM proposal</span>
        <a className="btn-dark" href="#precon">Next step: Pre-construction</a>
      </div>
      <div className="prog" style={{ transform: `scaleX(${progress})` }} />
    </div>
  );
}

export function Film({ id, poster, logo, label }: { id: string; poster: string; logo: string; label: string }) {
  const [play, setPlay] = useState(false);
  return (
    <div className="film">
      {play ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
          title={label}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
        />
      ) : (
        <button type="button" onClick={() => setPlay(true)} aria-label="Play the film" style={{ backgroundImage: `url(${poster || `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`})` }}>
          {logo && <img className="film-mark" src={logo} alt="" />}
          <span className="play" />
          <span className="film-title">Watch the film</span>
          <span className="film-label">{label}</span>
        </button>
      )}
    </div>
  );
}

export function ValueOptions({ options, total, factor }: { options: ValueOption[]; total: number; factor: number }) {
  const [on, setOn] = useState<boolean[]>(options.map(() => false));
  const priced = options.map((o) => Math.round((o.directDelta * factor) / 100) * 100);
  const delta = priced.reduce((a, d, i) => a + (on[i] ? d : 0), 0);
  const all = priced.reduce((a, d) => a + d, 0);
  return (
    <div className="ve">
      {options.map((o, i) => (
        <button key={i} type="button" className={`ve-row${on[i] ? " on" : ""}`} onClick={() => setOn(on.map((x, j) => (j === i ? !x : x)))} aria-pressed={on[i]}>
          <span className="switch" aria-hidden />
          <span className="ve-text">
            <b>{o.title}</b>
            <span>{o.description}</span>
          </span>
          <span className="ve-amt">{priced[i] < 0 ? "Deduct ~" : "Add ~"}{usd(Math.abs(priced[i]))}</span>
        </button>
      ))}
      <div className="ve-sum">
        <div><span className="mono">Current estimate</span><b>{usd(total)}</b></div>
        <div><span className="mono">Options you picked</span><b>{delta ? `${delta < 0 ? "−" : "+"}${usd(Math.abs(delta))}` : "–"}</b></div>
        <div className="hl"><span className="mono">Your total</span><b>{usd(total + delta)}</b></div>
        <div><span className="mono">With every option</span><b>{usd(total + all)}</b></div>
      </div>
    </div>
  );
}

export function RespondBox({ token, projectName, email, agreementUrl, agreementLabel }: { token: string; projectName: string; email: string; agreementUrl: string; agreementLabel: string }) {
  const [sent, setSent] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [asking, setAsking] = useState(false);
  const [pending, start] = useTransition();
  return (
    <div className="respond">
      <span className="mono">Ready when you are</span>
      <p className="respond-title">Start pre-construction on {projectName}</p>
      {sent ? (
        <p className="done">{sent}</p>
      ) : (
        <>
          <button className="btn-dark wide" disabled={pending} onClick={() => start(async () => { await recordProposalEvent(token, "accepted", "Client is ready to start pre-construction"); setSent("Thank you. We'll be in touch within one business day to set up pre-construction."); })}>
            I&apos;m ready to move forward →
          </button>
          {agreementUrl && (
            <a className="btn-line wide" href={agreementUrl} target="_blank" rel="noreferrer">Review the {agreementLabel.toLowerCase()}</a>
          )}
          {asking ? (
            <div className="ask">
              <textarea autoFocus placeholder="Ask about any line or assumption" value={q} onChange={(e) => setQ(e.target.value)} />
              <button className="btn-line" disabled={!q.trim() || pending} onClick={() => start(async () => { await recordProposalEvent(token, "question", q); setSent("Got it. We'll answer your question soon."); })}>Send question</button>
            </div>
          ) : (
            <button className="linkish" onClick={() => setAsking(true)}>Ask a question first</button>
          )}
          {email && <a className="mail" href={`mailto:${email}?subject=${encodeURIComponent(projectName + " proposal")}`}>{email}</a>}
        </>
      )}
    </div>
  );
}

export function PrintLink() {
  return (
    <button className="printlink" onClick={() => window.print()}>
      Save as PDF
    </button>
  );
}
