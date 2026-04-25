create extension if not exists pgcrypto;

create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_user_id uuid references auth.users,
  stripe_customer_id text,
  subscription_tier text default 'trial',
  subscription_status text default 'trialing',
  pours_this_period int default 0,
  logo_url text,
  created_at timestamptz default now()
);

create table users_profile (
  id uuid primary key references auth.users on delete cascade,
  org_id uuid references organizations on delete cascade,
  email text not null,
  full_name text,
  phone text,
  role text check (role in ('owner','pm','foreman','crew')) default 'crew',
  created_at timestamptz default now()
);

create table suppliers (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations on delete cascade,
  name text not null,
  contact_name text,
  contact_phone text,
  notes text,
  created_at timestamptz default now()
);

create table mix_designs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations on delete cascade,
  supplier_id uuid references suppliers on delete set null,
  name text not null,
  cement_type text check (cement_type in ('Type_I','Type_II','Type_IL','Type_III','Type_V','blended')) not null,
  design_strength_psi int not null default 4000,
  wc_ratio numeric(3,2) not null,
  aggregate_top_size_in numeric(3,2) default 1.0,
  target_air_pct_min numeric(3,1),
  target_air_pct_max numeric(3,1),
  target_slump_in_min numeric(3,1) default 3.0,
  target_slump_in_max numeric(3,1) default 5.0,
  admixtures jsonb default '[]',
  notes text,
  created_at timestamptz default now()
);

create table jobs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations on delete cascade,
  client_name text not null,
  client_phone text,
  address text not null,
  latitude numeric,
  longitude numeric,
  job_type text check (job_type in ('driveway','patio','sidewalk','slab','commercial_floor','other')) not null,
  exposure_class text check (exposure_class in ('F0','F1','F2','F3')) default 'F1',
  sqft numeric,
  thickness_in numeric(4,2),
  status text default 'active',
  created_at timestamptz default now()
);

create table pours (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references jobs on delete cascade,
  org_id uuid references organizations on delete cascade,
  scheduled_at timestamptz not null,
  mix_design_id uuid references mix_designs,
  supplier_id uuid references suppliers,
  status text check (status in ('planned','approved','in_progress','placed','curing','complete','failed')) default 'planned',
  pre_pour_risk_level text check (pre_pour_risk_level in ('green','yellow','red')),
  override_reason text,
  override_user_id uuid references auth.users,
  pdf_url text,
  created_at timestamptz default now()
);

create table weather_snapshots (
  id uuid primary key default gen_random_uuid(),
  pour_id uuid references pours on delete cascade,
  org_id uuid references organizations on delete cascade,
  timestamp timestamptz not null,
  source text check (source in ('forecast','actual','manual')) not null,
  temp_f numeric(4,1),
  humidity_pct numeric(4,1),
  wind_mph numeric(4,1),
  concrete_temp_f numeric(4,1),
  evaporation_rate_lbft2hr numeric(4,3),
  created_at timestamptz default now()
);

create table pour_logs (
  id uuid primary key default gen_random_uuid(),
  pour_id uuid references pours on delete cascade,
  org_id uuid references organizations on delete cascade,
  event_type text check (event_type in (
    'batch_arrival','slump_test','air_test','concrete_temp_test',
    'placement_start','placement_end','bleed_observed','initial_set',
    'final_trowel','cure_started','cure_ended','issue_flagged','note'
  )) not null,
  timestamp timestamptz default now(),
  payload jsonb,
  logged_by uuid references auth.users,
  photo_urls text[],
  created_at timestamptz default now()
);

create table quality_tests (
  id uuid primary key default gen_random_uuid(),
  pour_id uuid references pours on delete cascade,
  org_id uuid references organizations on delete cascade,
  test_type text check (test_type in (
    'slump','air_content','concrete_temp','ambient_temp',
    'cylinder_7day','cylinder_28day'
  )) not null,
  value numeric not null,
  unit text not null,
  result_status text check (result_status in ('pass','marginal','fail')),
  logged_at timestamptz default now(),
  logged_by uuid references auth.users,
  notes text,
  created_at timestamptz default now()
);

create table rule_evaluations (
  id uuid primary key default gen_random_uuid(),
  pour_id uuid references pours on delete cascade,
  org_id uuid references organizations on delete cascade,
  rule_id text not null,
  rule_version text not null,
  evaluated_at timestamptz default now(),
  triggered boolean not null,
  severity text check (severity in ('green','yellow','red')),
  inputs jsonb not null,
  output_message text,
  citation text,
  mitigation text,
  created_at timestamptz default now()
);

create table batch_tickets (
  id uuid primary key default gen_random_uuid(),
  pour_id uuid references pours on delete cascade,
  org_id uuid references organizations on delete cascade,
  ticket_number text,
  batched_at timestamptz,
  delivered_at timestamptz,
  cement_lbs numeric,
  water_added_gal numeric,
  admixtures jsonb,
  truck_number text,
  photo_url text,
  created_at timestamptz default now()
);

create or replace function current_org_id() returns uuid language sql stable as $$
  select org_id from users_profile where id = auth.uid()
$$;

alter table organizations enable row level security;
alter table users_profile enable row level security;
alter table suppliers enable row level security;
alter table mix_designs enable row level security;
alter table jobs enable row level security;
alter table pours enable row level security;
alter table weather_snapshots enable row level security;
alter table pour_logs enable row level security;
alter table quality_tests enable row level security;
alter table rule_evaluations enable row level security;
alter table batch_tickets enable row level security;

create policy org_rw_organizations on organizations for all using (id = current_org_id()) with check (id = current_org_id());
create policy org_rw_users_profile on users_profile for all using (org_id = current_org_id()) with check (org_id = current_org_id());
create policy org_rw_suppliers on suppliers for all using (org_id = current_org_id()) with check (org_id = current_org_id());
create policy org_rw_mix_designs on mix_designs for all using (org_id = current_org_id()) with check (org_id = current_org_id());
create policy org_rw_jobs on jobs for all using (org_id = current_org_id()) with check (org_id = current_org_id());
create policy org_rw_pours on pours for all using (org_id = current_org_id()) with check (org_id = current_org_id());
create policy org_rw_weather on weather_snapshots for all using (org_id = current_org_id()) with check (org_id = current_org_id());
create policy org_rw_pour_logs on pour_logs for all using (org_id = current_org_id()) with check (org_id = current_org_id());
create policy org_rw_quality_tests on quality_tests for all using (org_id = current_org_id()) with check (org_id = current_org_id());
create policy org_rw_rule_evaluations on rule_evaluations for all using (org_id = current_org_id()) with check (org_id = current_org_id());
create policy org_rw_batch_tickets on batch_tickets for all using (org_id = current_org_id()) with check (org_id = current_org_id());
