import type { Company, Project, ProposalContent } from "@/db/schema";

export type ResolvedProposal = Required<ProposalContent>;

/** Fills every optional proposal field from company defaults so the page and editor always have something to show. */
export function resolveProposal(p: Project, pr: ProposalContent, c: Company): ResolvedProposal {
  const stage = p.designStage ? p.designStage.charAt(0).toLowerCase() + p.designStage.slice(1) : "drawings";
  return {
    ...pr,
    salutation: pr.salutation ?? (p.client ? `Dear ${p.client},` : "Hello,"),
    notePara2:
      pr.notePara2 ??
      `We work cost-plus and open book. This estimate is our first pass from the ${stage}. Pre-construction is where we turn it into a real budget together.`,
    gallery: pr.gallery ?? [],
    filmUrl: pr.filmUrl ?? c.filmUrl ?? "",
    benefits: pr.benefits?.length ? pr.benefits : c.benefits ?? c.differentiators,
    preconIntro: pr.preconIntro ?? "Pre-construction is where this estimate becomes a budget you can build to.",
    preconDeliverables: pr.preconDeliverables?.length ? pr.preconDeliverables : c.preconDeliverables,
    agreementUrl: pr.agreementUrl ?? "",
    agreementLabel: pr.agreementLabel ?? "Pre-construction agreement",
    retainer: pr.retainer ?? "",
    closing: pr.closing ?? c.closing ?? "We look forward to building with you.",
    hidden: pr.hidden ?? [],
    milestones: pr.milestones.map((m) => ({ ...m, detail: m.detail ?? "" })),
  };
}

/** Accepts a YouTube watch, share or embed link and returns the video id. */
export function youtubeId(url: string): string | null {
  if (!url) return null;
  const m = url.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([A-Za-z0-9_-]{6,})/);
  return m ? m[1] : null;
}

export const fileUrl = (k: string) => (k.startsWith("local:") ? `/api/files/${encodeURIComponent(k)}` : k);
