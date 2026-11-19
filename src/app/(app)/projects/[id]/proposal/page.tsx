import { headers } from "next/headers";
import { getLatestRun, getProject } from "@/lib/data";
import { startProposalRewrite, rotateShareLink, updateProject } from "@/app/actions";
import { ProposalEditor } from "@/components/ProposalEditor";
import { RunPanel } from "@/components/RunPanel";
import { CopyLink } from "@/components/CopyLink";
import { SubmitButton } from "@/components/SubmitButton";

export default async function ProposalTab({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = (await getProject(Number(id)))!;
  const run = await getLatestRun(p.id);
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const url = `${origin}/p/${p.shareToken}`;

  return (
    <div className="stack">
      <div className="card">
        <div className="card-head">
          <h3>Client proposal</h3>
          <span className="chip neutral">Rev {p.revision}</span>
        </div>
        <p className="muted" style={{ marginTop: 0 }}>
          A branded web page your client opens from a link: cost summary, interactive value options, schedule, team and the full
          open-book estimate. They can print it to PDF or tell you they&apos;re ready for pre-construction. You see each view on the Outcome tab.
        </p>
        <div className="row">
          <CopyLink url={url} />
          <a className="btn" href={`/p/${p.shareToken}`} target="_blank"><span className="material-symbols-outlined">open_in_new</span> Open proposal</a>
          <form action={updateProject.bind(null, p.id)}>
            <input type="hidden" name="status" value="proposal_sent" />
            <SubmitButton className="btn tonal" icon="send">Mark as sent</SubmitButton>
          </form>
          <form action={rotateShareLink.bind(null, p.id)}>
            <button className="btn text" title="Old link stops working"><span className="material-symbols-outlined">link_off</span> New link</button>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card-head"><h3>Rewrite the proposal copy from the current estimate</h3></div>
        <RunPanel projectId={p.id} initial={run} kind="proposal" start={startProposalRewrite} label="Rewrite with Claude" icon="edit_note" disabled={!process.env.ANTHROPIC_API_KEY} confirmText="This replaces the lede, note, description, value options and schedule. Continue?" />
      </div>

      {p.proposal ? (
        <ProposalEditor projectId={p.id} initial={p.proposal} revision={p.revision} />
      ) : (
        <div className="card empty">
          <span className="material-symbols-outlined">description</span>
          <p>Proposal content is written when the ROM is built. You can also write it from the current estimate with the button above.</p>
        </div>
      )}
    </div>
  );
}
