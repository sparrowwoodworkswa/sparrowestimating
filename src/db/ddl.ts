// Schema is created idempotently on startup. Add new columns with ALTER TABLE ... ADD COLUMN IF NOT EXISTS.
export const DDL = `
CREATE TABLE IF NOT EXISTS settings (
  id integer PRIMARY KEY,
  company jsonb NOT NULL,
  markups jsonb NOT NULL,
  labor_rates jsonb NOT NULL,
  estimating_standards text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS projects (
  id serial PRIMARY KEY,
  name text NOT NULL,
  client text NOT NULL DEFAULT '',
  architect text NOT NULL DEFAULT '',
  structural text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  design_stage text NOT NULL DEFAULT '',
  finish_level text NOT NULL DEFAULT 'mid-high',
  total_sf double precision,
  conditioned_sf double precision,
  status text NOT NULL DEFAULT 'draft',
  outcome_notes text NOT NULL DEFAULT '',
  competitor_price double precision,
  actual_cost double precision,
  direct_cost_override double precision,
  contract_total_override double precision,
  owner_notes text NOT NULL DEFAULT '',
  markups jsonb NOT NULL,
  analysis jsonb,
  proposal jsonb,
  revision text NOT NULL DEFAULT '0',
  share_token text NOT NULL,
  proposal_sent_at timestamptz,
  decided_at timestamptz,
  learned_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS projects_share_token ON projects(share_token);
CREATE TABLE IF NOT EXISTS plan_files (
  id serial PRIMARY KEY,
  project_id integer NOT NULL,
  filename text NOT NULL,
  storage_key text NOT NULL,
  size_bytes integer NOT NULL,
  anthropic_file_id text,
  kind text NOT NULL DEFAULT 'plans',
  uploaded_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS estimate_lines (
  id serial PRIMARY KEY,
  project_id integer NOT NULL,
  division text NOT NULL,
  csi_code text NOT NULL DEFAULT '',
  description text NOT NULL,
  scope text NOT NULL DEFAULT '',
  qty double precision NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'LS',
  labor_hours_per_unit double precision NOT NULL DEFAULT 0,
  labor_rate double precision NOT NULL DEFAULT 0,
  material_unit double precision NOT NULL DEFAULT 0,
  sub_unit double precision NOT NULL DEFAULT 0,
  is_allowance boolean NOT NULL DEFAULT false,
  trade text NOT NULL DEFAULT 'Sparrow',
  note text NOT NULL DEFAULT '',
  source text NOT NULL DEFAULT 'ai',
  ai_original jsonb,
  sort integer NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS estimate_lines_project ON estimate_lines(project_id);
CREATE TABLE IF NOT EXISTS trade_packages (
  id serial PRIMARY KEY,
  project_id integer NOT NULL,
  trade text NOT NULL,
  divisions text NOT NULL DEFAULT '',
  scope_of_work text NOT NULL DEFAULT '',
  inclusions jsonb NOT NULL DEFAULT '[]',
  exclusions jsonb NOT NULL DEFAULT '[]',
  materials jsonb NOT NULL DEFAULT '[]',
  questions jsonb NOT NULL DEFAULT '[]',
  sheet_refs text NOT NULL DEFAULT '',
  estimated_price double precision NOT NULL DEFAULT 0,
  bid_status text NOT NULL DEFAULT 'not_sent',
  bid_vendor text NOT NULL DEFAULT '',
  bid_amount double precision,
  bid_notes text NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS catalog (
  id serial PRIMARY KEY,
  trade text NOT NULL,
  item text NOT NULL,
  unit text NOT NULL,
  unit_price double precision NOT NULL,
  price_type text NOT NULL DEFAULT 'installed',
  vendor text NOT NULL DEFAULT '',
  source text NOT NULL DEFAULT 'sub_quote',
  region text NOT NULL DEFAULT 'Kitsap / Puget Sound',
  quote_date text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  project_id integer,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS lessons (
  id serial PRIMARY KEY,
  scope text NOT NULL DEFAULT 'General',
  text text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  source text NOT NULL DEFAULT 'manual',
  project_id integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS ai_runs (
  id serial PRIMARY KEY,
  project_id integer NOT NULL,
  kind text NOT NULL,
  status text NOT NULL DEFAULT 'running',
  step text NOT NULL DEFAULT '',
  log jsonb NOT NULL DEFAULT '[]',
  error text,
  input_tokens integer NOT NULL DEFAULT 0,
  output_tokens integer NOT NULL DEFAULT 0,
  cache_read_tokens integer NOT NULL DEFAULT 0,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);
CREATE TABLE IF NOT EXISTS proposal_events (
  id serial PRIMARY KEY,
  project_id integer NOT NULL,
  kind text NOT NULL,
  detail text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE ai_runs ADD COLUMN IF NOT EXISTS pending jsonb NOT NULL DEFAULT '[]';
ALTER TABLE ai_runs ADD COLUMN IF NOT EXISTS secret text NOT NULL DEFAULT '';
ALTER TABLE ai_runs ADD COLUMN IF NOT EXISTS origin text NOT NULL DEFAULT '';
ALTER TABLE catalog ADD COLUMN IF NOT EXISTS cost_code text NOT NULL DEFAULT '';
ALTER TABLE catalog ADD COLUMN IF NOT EXISTS finish_level text NOT NULL DEFAULT '';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS superintendent text NOT NULL DEFAULT '';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS cost_year integer;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS alias text NOT NULL DEFAULT '';
`;
