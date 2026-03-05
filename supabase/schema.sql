-- CheckMate Database Schema
-- All tables use family_id as the RLS isolation unit

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Families table (top-level org unit)
create table public.families (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz default now() not null,
  name text not null,
  stripe_customer_id text,
  subscription_status text default 'none' check (subscription_status in ('active', 'trialing', 'past_due', 'canceled', 'none')),
  subscription_plan text default 'none' check (subscription_plan in ('basic', 'premium', 'none')),
  max_elders int default 1
);

-- Family members (users linked to a family)
create table public.family_members (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz default now() not null,
  family_id uuid references public.families(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  role text default 'member' check (role in ('admin', 'member')),
  full_name text not null,
  email text not null,
  phone text,
  receive_escalation_alerts boolean default true,
  receive_daily_summary boolean default true,
  unique(family_id, user_id)
);

-- Elders (phone numbers and names encrypted at rest)
create table public.elders (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz default now() not null,
  family_id uuid references public.families(id) on delete cascade not null,
  preferred_name text not null,
  full_name_encrypted text not null,
  phone_encrypted text not null,
  phone_hash text not null,
  timezone text default 'America/New_York',
  preferred_check_in_time time default '09:00',
  check_in_frequency text default 'daily' check (check_in_frequency in ('daily', 'twice_daily', 'weekly')),
  medical_notes_encrypted text,
  medications_encrypted text,
  emergency_contact_name text,
  emergency_contact_phone_encrypted text,
  is_active boolean default true,
  last_check_in_at timestamptz,
  mood_trend text default 'unknown' check (mood_trend in ('improving', 'stable', 'declining', 'unknown'))
);

-- Check-in sessions
create table public.check_in_sessions (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz default now() not null,
  family_id uuid references public.families(id) on delete cascade not null,
  elder_id uuid references public.elders(id) on delete cascade not null,
  status text default 'scheduled' check (status in ('scheduled', 'in_progress', 'completed', 'missed', 'escalated')),
  scheduled_at timestamptz not null,
  started_at timestamptz,
  completed_at timestamptz,
  turn_count int default 0,
  mood_score int check (mood_score >= 1 and mood_score <= 10),
  ai_summary text,
  escalation_triggered boolean default false,
  escalation_reason text
);

-- Messages within check-in sessions
create table public.messages (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz default now() not null,
  family_id uuid references public.families(id) on delete cascade not null,
  session_id uuid references public.check_in_sessions(id) on delete cascade not null,
  elder_id uuid references public.elders(id) on delete cascade not null,
  direction text not null check (direction in ('inbound', 'outbound')),
  body text not null,
  ai_classification text check (ai_classification in ('positive', 'neutral', 'concerning', 'escalation')),
  ai_confidence numeric(3,2),
  twilio_sid text
);

-- Escalations
create table public.escalations (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz default now() not null,
  family_id uuid references public.families(id) on delete cascade not null,
  elder_id uuid references public.elders(id) on delete cascade not null,
  session_id uuid references public.check_in_sessions(id),
  type text not null check (type in ('keyword', 'ai_detected', 'missed_check_in', 'mood_decline')),
  severity text not null check (severity in ('low', 'medium', 'high', 'critical')),
  description text not null,
  status text default 'open' check (status in ('open', 'acknowledged', 'resolved')),
  acknowledged_by uuid references public.family_members(id),
  acknowledged_at timestamptz,
  resolved_by uuid references public.family_members(id),
  resolved_at timestamptz,
  notes text
);

-- Notification log
create table public.notification_log (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz default now() not null,
  family_id uuid references public.families(id) on delete cascade not null,
  type text not null check (type in ('sms', 'email', 'push')),
  recipient text not null,
  subject text,
  body text not null,
  status text default 'sent' check (status in ('sent', 'failed')),
  related_escalation_id uuid references public.escalations(id)
);

-- Indexes
create index idx_family_members_user_id on public.family_members(user_id);
create index idx_family_members_family_id on public.family_members(family_id);
create index idx_elders_family_id on public.elders(family_id);
create index idx_elders_phone_hash on public.elders(phone_hash);
create index idx_check_in_sessions_elder_id on public.check_in_sessions(elder_id);
create index idx_check_in_sessions_family_id on public.check_in_sessions(family_id);
create index idx_check_in_sessions_status on public.check_in_sessions(status);
create index idx_messages_session_id on public.messages(session_id);
create index idx_escalations_family_id on public.escalations(family_id);
create index idx_escalations_status on public.escalations(status);

-- Row Level Security
alter table public.families enable row level security;
alter table public.family_members enable row level security;
alter table public.elders enable row level security;
alter table public.check_in_sessions enable row level security;
alter table public.messages enable row level security;
alter table public.escalations enable row level security;
alter table public.notification_log enable row level security;

-- RLS Policies: family_id isolation
-- Users can only see data belonging to their family

create policy "Users can view their family"
  on public.families for select
  using (id in (select family_id from public.family_members where user_id = auth.uid()));

create policy "Admins can update their family"
  on public.families for update
  using (id in (select family_id from public.family_members where user_id = auth.uid() and role = 'admin'));

create policy "Users can view family members"
  on public.family_members for select
  using (family_id in (select family_id from public.family_members where user_id = auth.uid()));

create policy "Admins can insert family members"
  on public.family_members for insert
  with check (family_id in (select family_id from public.family_members where user_id = auth.uid() and role = 'admin'));

create policy "Admins can update family members"
  on public.family_members for update
  using (family_id in (select family_id from public.family_members where user_id = auth.uid() and role = 'admin'));

create policy "Admins can delete family members"
  on public.family_members for delete
  using (family_id in (select family_id from public.family_members where user_id = auth.uid() and role = 'admin'));

create policy "Users can view elders"
  on public.elders for select
  using (family_id in (select family_id from public.family_members where user_id = auth.uid()));

create policy "Admins can insert elders"
  on public.elders for insert
  with check (family_id in (select family_id from public.family_members where user_id = auth.uid() and role = 'admin'));

create policy "Admins can update elders"
  on public.elders for update
  using (family_id in (select family_id from public.family_members where user_id = auth.uid() and role = 'admin'));

create policy "Users can view check-in sessions"
  on public.check_in_sessions for select
  using (family_id in (select family_id from public.family_members where user_id = auth.uid()));

create policy "Users can view messages"
  on public.messages for select
  using (family_id in (select family_id from public.family_members where user_id = auth.uid()));

create policy "Users can view escalations"
  on public.escalations for select
  using (family_id in (select family_id from public.family_members where user_id = auth.uid()));

create policy "Users can update escalations"
  on public.escalations for update
  using (family_id in (select family_id from public.family_members where user_id = auth.uid()));

create policy "Users can view notification log"
  on public.notification_log for select
  using (family_id in (select family_id from public.family_members where user_id = auth.uid()));
