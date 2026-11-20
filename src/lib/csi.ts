import { SPARROW_DIVISIONS } from "./costcodes";

// Sparrow's own 16 divisions (Master Primary Control Estimate), not CSI MasterFormat.
export const DIVISIONS: { code: string; name: string }[] = SPARROW_DIVISIONS;

export const divisionName = (code: string) => DIVISIONS.find((d) => d.code === code)?.name ?? code;

export const STATUSES: { value: string; label: string; tone: string }[] = [
  { value: "draft", label: "Draft", tone: "neutral" },
  { value: "estimating", label: "Estimating", tone: "info" },
  { value: "proposal_sent", label: "Proposal sent", tone: "warn" },
  { value: "won", label: "Won", tone: "good" },
  { value: "lost", label: "Lost", tone: "bad" },
  { value: "in_construction", label: "In construction", tone: "good" },
  { value: "complete", label: "Complete", tone: "neutral" },
];
export const statusInfo = (s: string) => STATUSES.find((x) => x.value === s) ?? STATUSES[0];

export const FINISH_LEVELS = ["builder", "mid", "mid-high", "high"];

export const TRADES = [
  "Sparrow",
  "Site / Grading",
  "Concrete",
  "Masonry",
  "Steel / Metals",
  "Envelope",
  "Roofing",
  "Doors / Windows",
  "Insulation",
  "Finishes",
  "Drywall / Paint",
  "Flooring / Tile",
  "Cabinets / Millwork",
  "Specialties",
  "Plumbing",
  "Mechanical",
  "Electrical",
  "Low Voltage",
  "Fire Protection",
  "Landscape",
];
