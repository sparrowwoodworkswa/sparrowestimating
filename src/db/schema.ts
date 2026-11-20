import {
  pgTable,
  text,
  integer,
  doublePrecision,
  boolean,
  timestamp,
  jsonb,
  serial,
} from "drizzle-orm/pg-core";

export type Markups = {
  insurancePct: number; // insurance & WA B&O, on direct cost (+ contingency)
  overheadPct: number; // company overhead, on direct + insurance
  feePct: number; // contractor fee / profit, on direct + insurance + overhead
  contingencyPct: number; // on direct cost
  taxPct: number; // WA sales tax on the full contract price
};

export type FeePreset = { key: string; label: string; description: string; markups: Omit<Markups, "taxPct"> & { taxPct: number | null } };

export type LaborRates = Record<string, number>; // role -> burdened $/hr

export type TeamMember = { name: string; role: string; bio: string; photo: string; core?: boolean; superintendent?: boolean };

export type Company = {
  name: string;
  tagline: string;
  location: string;
  phone: string;
  email: string;
  website: string;
  logoUrl: string; // bird mark, used in the app bar and proposal header
  logoFullUrl?: string;
  about?: string; // who Sparrow is, for the estimator prompt
  feePresets?: FeePreset[];
  address?: string;
  brandVersion?: number;
  filmUrl?: string; // optional YouTube link shown in the proposal's film section
  filmHeading?: string;
  filmBody?: string;
  benefits?: { title: string; body: string }[]; // "How you benefit from our approach"
  closing?: string;
  colors: { ink: string; mid: string; rule: string; tint: string; accent: string; accentDark: string; band?: string };
  team: TeamMember[];
  shopPhoto: string;
  shopCaption: string;
  recognition: string;
  differentiators: { title: string; body: string }[];
  preconDeliverables: { title: string; body: string }[];
  defaultExclusions: string[];
};

export type Analysis = {
  summary: string;
  buildingType: string;
  stories: number | null;
  totalSf: number | null;
  conditionedSf: number | null;
  scheduleWeeks: number | null;
  sheets: { number: string; title: string }[];
  quantities: { name: string; value: number; unit: string; basis: string }[];
  systems: { system: string; description: string }[];
  conflicts: { issue: string; impact: string; assumption: string }[];
  missingInfo: string[];
};

export type Milestone = { week: number; title: string; detail?: string };
export type ValueOption = { title: string; description: string; directDelta: number };

export type ProposalContent = {
  lede: string;
  notePara1: string;
  projectDescription: string;
  signatureElement: string;
  shopItems: string;
  pricingNotes: string[];
  valueOptions: ValueOption[];
  milestones: Milestone[];
  scheduleNote: string;
  heroImage: string;
  heroCaption: string;
  elevationImage: string;
  elevationCaption: string;
  exclusions: string[];
  // Added for the Fellow-style experience. All optional so older proposals keep working.
  salutation?: string; // "Dear Mike and Megan,"
  notePara2?: string;
  gallery?: { src: string; caption: string }[];
  filmUrl?: string; // overrides the company film; "" hides it
  benefits?: { title: string; body: string }[];
  preconIntro?: string;
  preconDeliverables?: { title: string; body: string }[];
  agreementUrl?: string;
  agreementLabel?: string;
  retainer?: string; // e.g. "$5,000"; blank = no retainer shown
  closing?: string;
  hidden?: string[]; // section keys hidden on the client page
  team?: string[]; // names of team members shown; default is the core team plus the project superintendent
};

export const PROPOSAL_SECTIONS: { key: string; label: string }[] = [
  { key: "letter", label: "Welcome letter" },
  { key: "project", label: "The project (gallery)" },
  { key: "film", label: "Film" },
  { key: "about", label: "Who we are" },
  { key: "benefits", label: "Owner benefits" },
  { key: "caught", label: "What we caught" },
  { key: "cost", label: "Cost summary" },
  { key: "value", label: "Value options" },
  { key: "schedule", label: "Schedule" },
  { key: "precon", label: "Pre-construction" },
  { key: "team", label: "Team" },
  { key: "estimate", label: "Detailed estimate" },
];

export type Material = { item: string; spec: string; qty: number; unit: string; notes: string };

export const settings = pgTable("settings", {
  id: integer("id").primaryKey(),
  company: jsonb("company").$type<Company>().notNull(),
  markups: jsonb("markups").$type<Markups>().notNull(),
  laborRates: jsonb("labor_rates").$type<LaborRates>().notNull(),
  estimatingStandards: text("estimating_standards").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  client: text("client").notNull().default(""),
  architect: text("architect").notNull().default(""),
  structural: text("structural").notNull().default(""),
  address: text("address").notNull().default(""),
  city: text("city").notNull().default(""),
  designStage: text("design_stage").notNull().default(""),
  finishLevel: text("finish_level").notNull().default("mid-high"),
  totalSf: doublePrecision("total_sf"),
  conditionedSf: doublePrecision("conditioned_sf"),
  // draft | estimating | proposal_sent | won | lost | in_construction | complete | historical
  status: text("status").notNull().default("draft"),
  outcomeNotes: text("outcome_notes").notNull().default(""),
  competitorPrice: doublePrecision("competitor_price"),
  actualCost: doublePrecision("actual_cost"),
  directCostOverride: doublePrecision("direct_cost_override"),
  contractTotalOverride: doublePrecision("contract_total_override"),
  ownerNotes: text("owner_notes").notNull().default(""),
  markups: jsonb("markups").$type<Markups>().notNull(),
  analysis: jsonb("analysis").$type<Analysis>(),
  proposal: jsonb("proposal").$type<ProposalContent>(),
  revision: text("revision").notNull().default("0"),
  superintendent: text("superintendent").notNull().default(""),
  costYear: integer("cost_year"), // year built or estimated, for escalation
  alias: text("alias").notNull().default(""),
  shareToken: text("share_token").notNull(),
  proposalSentAt: timestamp("proposal_sent_at", { withTimezone: true }),
  decidedAt: timestamp("decided_at", { withTimezone: true }),
  learnedAt: timestamp("learned_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const planFiles = pgTable("plan_files", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  filename: text("filename").notNull(),
  storageKey: text("storage_key").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  anthropicFileId: text("anthropic_file_id"),
  kind: text("kind").notNull().default("plans"), // plans | specs | image | other
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }).defaultNow().notNull(),
});

export const estimateLines = pgTable("estimate_lines", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  division: text("division").notNull(), // "01".."16"
  csiCode: text("csi_code").notNull().default(""),
  description: text("description").notNull(),
  scope: text("scope").notNull().default(""),
  qty: doublePrecision("qty").notNull().default(0),
  unit: text("unit").notNull().default("LS"),
  laborHoursPerUnit: doublePrecision("labor_hours_per_unit").notNull().default(0),
  laborRate: doublePrecision("labor_rate").notNull().default(0),
  materialUnit: doublePrecision("material_unit").notNull().default(0),
  subUnit: doublePrecision("sub_unit").notNull().default(0),
  isAllowance: boolean("is_allowance").notNull().default(false),
  trade: text("trade").notNull().default("Sparrow"),
  note: text("note").notNull().default(""),
  source: text("source").notNull().default("ai"), // ai | manual | catalog | bid | import
  aiOriginal: jsonb("ai_original").$type<Record<string, unknown>>(),
  sort: integer("sort").notNull().default(0),
});

export const tradePackages = pgTable("trade_packages", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  trade: text("trade").notNull(),
  divisions: text("divisions").notNull().default(""),
  scopeOfWork: text("scope_of_work").notNull().default(""),
  inclusions: jsonb("inclusions").$type<string[]>().notNull().default([]),
  exclusions: jsonb("exclusions").$type<string[]>().notNull().default([]),
  materials: jsonb("materials").$type<Material[]>().notNull().default([]),
  questions: jsonb("questions").$type<string[]>().notNull().default([]),
  sheetRefs: text("sheet_refs").notNull().default(""),
  estimatedPrice: doublePrecision("estimated_price").notNull().default(0),
  bidStatus: text("bid_status").notNull().default("not_sent"), // not_sent | sent | received | awarded
  bidVendor: text("bid_vendor").notNull().default(""),
  bidAmount: doublePrecision("bid_amount"),
  bidNotes: text("bid_notes").notNull().default(""),
});

export const catalog = pgTable("catalog", {
  id: serial("id").primaryKey(),
  trade: text("trade").notNull(),
  item: text("item").notNull(),
  unit: text("unit").notNull(),
  unitPrice: doublePrecision("unit_price").notNull(),
  priceType: text("price_type").notNull().default("installed"), // installed | material | labor
  vendor: text("vendor").notNull().default(""),
  source: text("source").notNull().default("sub_quote"), // sub_quote | bid | actual | estimate | learned
  region: text("region").notNull().default("Kitsap / Puget Sound"),
  quoteDate: text("quote_date").notNull().default(""),
  notes: text("notes").notNull().default(""),
  projectId: integer("project_id"),
  costCode: text("cost_code").notNull().default(""), // Sparrow cost code, e.g. 300.1
  finishLevel: text("finish_level").notNull().default(""),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const lessons = pgTable("lessons", {
  id: serial("id").primaryKey(),
  scope: text("scope").notNull().default("General"), // trade or division name, or General
  text: text("text").notNull(),
  status: text("status").notNull().default("active"), // active | proposed | retired
  source: text("source").notNull().default("manual"),
  projectId: integer("project_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const aiRuns = pgTable("ai_runs", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  kind: text("kind").notNull(), // estimate | learn | proposal
  status: text("status").notNull().default("running"), // running | done | error
  step: text("step").notNull().default(""),
  log: jsonb("log").$type<string[]>().notNull().default([]),
  error: text("error"),
  inputTokens: integer("input_tokens").notNull().default(0),
  outputTokens: integer("output_tokens").notNull().default(0),
  cacheReadTokens: integer("cache_read_tokens").notNull().default(0),
  pending: jsonb("pending").$type<string[]>().notNull().default([]), // work packages still pricing
  secret: text("secret").notNull().default(""), // authorizes the run's own step requests
  origin: text("origin").notNull().default(""), // where step requests are sent
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
});

export const proposalEvents = pgTable("proposal_events", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  kind: text("kind").notNull(), // viewed | accepted | question
  detail: text("detail").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Project = typeof projects.$inferSelect;
export type EstimateLine = typeof estimateLines.$inferSelect;
export type TradePackage = typeof tradePackages.$inferSelect;
export type CatalogItem = typeof catalog.$inferSelect;
export type Lesson = typeof lessons.$inferSelect;
export type AiRun = typeof aiRuns.$inferSelect;
export type Settings = typeof settings.$inferSelect;
export type PlanFile = typeof planFiles.$inferSelect;
