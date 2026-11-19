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

export type LaborRates = Record<string, number>; // role -> burdened $/hr

export type TeamMember = { name: string; role: string; bio: string; photo: string };

export type Company = {
  name: string;
  tagline: string;
  location: string;
  phone: string;
  email: string;
  website: string;
  logoUrl: string;
  colors: { ink: string; mid: string; rule: string; tint: string; accent: string; accentDark: string };
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

export type Milestone = { week: number; title: string };
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
};

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
