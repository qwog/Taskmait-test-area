-- PlateKarma initial schema (Step 14.1)
create extension if not exists pgcrypto;

create table if not exists plates (
  id uuid primary key default gen_random_uuid(),
  plate_number text not null,
  state_code text not null check (char_length(state_code) = 2),
  country_code text not null default 'US',
  normalized_key text generated always as
    (upper(regexp_replace(plate_number, '[^A-Z0-9]', '', 'g')) || '|' || upper(state_code)) stored,
  city text,
  created_at timestamptz default now(),
  unique (normalized_key)
);

create table if not exists reasons (
  id text primary key,
  direction text not null check (direction in ('up', 'down')),
  label text not null,
  badge_emoji text not null,
  badge_name_playful text,
  badge_name_snarky text,
  badge_name_wholesome text,
  badge_threshold int not null default 10
);

create table if not exists tags (
  id uuid primary key default gen_random_uuid(),
  plate_id uuid not null references plates(id) on delete cascade,
  tagger_user_id uuid references auth.users(id),
  tagger_device_hash text,
  reason_id text not null references reasons(id),
  direction text not null check (direction in ('up', 'down')),
  zip_prefix text,
  created_at timestamptz default now()
);

create table if not exists plate_claims (
  id uuid primary key default gen_random_uuid(),
  plate_id uuid not null references plates(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id),
  status text not null default 'pending',
  created_at timestamptz default now(),
  unique (plate_id, owner_user_id)
);

create table if not exists takedowns (
  id uuid primary key default gen_random_uuid(),
  plate_id uuid references plates(id),
  requester_email text not null,
  reason text not null,
  status text not null default 'pending',
  resolved_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists banned_users (
  user_id uuid primary key references auth.users(id),
  reason text,
  banned_at timestamptz default now()
);

drop materialized view if exists plate_scores;
create materialized view plate_scores as
select
  p.id as plate_id,
  p.normalized_key,
  p.city,
  greatest(
    0,
    least(
      100,
      50 + coalesce(sum(
        case when t.direction = 'up' then 2 else -2 end
        * exp(-extract(epoch from (now() - t.created_at)) / (60.0 * 86400))
      ), 0)
    )
  ) as score,
  count(t.id) as total_tags,
  count(t.id) filter (where t.direction = 'up') as up_count,
  count(t.id) filter (where t.direction = 'down') as down_count,
  max(t.created_at) as last_tagged_at
from plates p
left join tags t
  on t.plate_id = p.id
  and t.created_at > now() - interval '180 days'
group by p.id, p.normalized_key, p.city;

create unique index if not exists idx_plate_scores_plate_id on plate_scores (plate_id);
create index if not exists idx_plate_scores_city_score on plate_scores (city, score);

drop materialized view if exists plate_badges;
create materialized view plate_badges as
select
  t.plate_id,
  t.reason_id,
  r.direction,
  r.badge_emoji,
  r.badge_name_playful,
  r.badge_name_snarky,
  r.badge_name_wholesome,
  count(*) as tag_count
from tags t
join reasons r on r.id = t.reason_id
where t.created_at > now() - interval '180 days'
group by t.plate_id, t.reason_id, r.direction, r.badge_emoji,
         r.badge_name_playful, r.badge_name_snarky, r.badge_name_wholesome
having count(*) >= 10;

create index if not exists idx_plate_badges_plate_id on plate_badges (plate_id);

-- RLS and read policies
alter table plates enable row level security;
alter table reasons enable row level security;
alter table tags enable row level security;
alter table plate_claims enable row level security;
alter table takedowns enable row level security;
alter table banned_users enable row level security;

create policy if not exists "public_read_plates" on plates for select using (true);
create policy if not exists "public_read_reasons" on reasons for select using (true);

create policy if not exists "tagger_read_own_tags" on tags
  for select using (auth.uid() = tagger_user_id);

create policy if not exists "owner_read_write_claims" on plate_claims
  for all using (auth.uid() = owner_user_id)
  with check (auth.uid() = owner_user_id);

create policy if not exists "owner_read_write_takedowns" on takedowns
  for all using (auth.email() = requester_email)
  with check (auth.email() = requester_email);

-- Views are exposed through PostgREST grants/RPC in production.
