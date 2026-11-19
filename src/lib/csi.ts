export const DIVISIONS: { code: string; name: string }[] = [
  { code: "01", name: "General Requirements" },
  { code: "02", name: "Site Construction" },
  { code: "03", name: "Concrete" },
  { code: "04", name: "Masonry" },
  { code: "05", name: "Metals" },
  { code: "06", name: "Wood & Plastics" },
  { code: "07", name: "Thermal & Moisture Protection" },
  { code: "08", name: "Doors & Windows" },
  { code: "09", name: "Finishes" },
  { code: "10", name: "Specialties" },
  { code: "11", name: "Equipment" },
  { code: "12", name: "Furnishings" },
  { code: "13", name: "Special Construction" },
  { code: "14", name: "Conveying Systems" },
  { code: "15", name: "Mechanical (Plumbing & HVAC)" },
  { code: "16", name: "Electrical" },
];

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
