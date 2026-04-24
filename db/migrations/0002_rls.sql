-- Row-level security: everything is scoped to users_profile.org_id
-- rule_evaluations is append-only (no UPDATE/DELETE policies).

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

-- Helper: current user's org
create or replace function auth_org_id() returns uuid
language sql stable security definer as $$
  select org_id from public.users_profile where id = auth.uid()
$$;

-- organizations: user can see their own org
create policy org_read on organizations for select
  using (id = auth_org_id());
create policy org_update on organizations for update
  using (id = auth_org_id() and
         exists (select 1 from users_profile
                 where id = auth.uid() and role in ('owner','pm')));

-- users_profile: can read self and org members; only owner/pm can manage
create policy users_profile_read on users_profile for select
  using (org_id = auth_org_id());
create policy users_profile_insert on users_profile for insert
  with check (org_id = auth_org_id());
create policy users_profile_update on users_profile for update
  using (id = auth.uid() or
         (org_id = auth_org_id() and
          exists (select 1 from users_profile p
                  where p.id = auth.uid() and p.role in ('owner','pm'))));

-- Generic org-scoped policies
create policy suppliers_all on suppliers for all
  using (org_id = auth_org_id()) with check (org_id = auth_org_id());
create policy mix_designs_all on mix_designs for all
  using (org_id = auth_org_id()) with check (org_id = auth_org_id());
create policy jobs_all on jobs for all
  using (org_id = auth_org_id()) with check (org_id = auth_org_id());
create policy pours_all on pours for all
  using (org_id = auth_org_id()) with check (org_id = auth_org_id());

-- Child tables scoped via parent pour
create policy weather_snapshots_all on weather_snapshots for all
  using (exists (select 1 from pours p
                 where p.id = weather_snapshots.pour_id
                   and p.org_id = auth_org_id()));
create policy pour_logs_all on pour_logs for all
  using (exists (select 1 from pours p
                 where p.id = pour_logs.pour_id
                   and p.org_id = auth_org_id()));
create policy quality_tests_all on quality_tests for all
  using (exists (select 1 from pours p
                 where p.id = quality_tests.pour_id
                   and p.org_id = auth_org_id()));
create policy batch_tickets_all on batch_tickets for all
  using (exists (select 1 from pours p
                 where p.id = batch_tickets.pour_id
                   and p.org_id = auth_org_id()));

-- rule_evaluations: append-only. Readable within org; INSERT-only from client.
create policy rule_evaluations_read on rule_evaluations for select
  using (exists (select 1 from pours p
                 where p.id = rule_evaluations.pour_id
                   and p.org_id = auth_org_id()));
create policy rule_evaluations_insert on rule_evaluations for insert
  with check (exists (select 1 from pours p
                      where p.id = rule_evaluations.pour_id
                        and p.org_id = auth_org_id()));
-- No UPDATE or DELETE policies on rule_evaluations — this is the audit trail.
