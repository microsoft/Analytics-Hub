-- ============================================================================
-- community-supabase.sql
-- Schema + row-level security for anonymous Community polls.
--
-- Run this ONCE in the Supabase SQL editor of the SAME project used by votes.js.
-- It reuses the existing public "anon" publishable key already shipped in the
-- site bundle (docs/votes.js). Security comes from RLS below, not key secrecy.
--
-- Privacy guarantees enforced here:
--   * NO customer/PII columns exist. We store an anonymous client_id (a random
--     localStorage UUID) purely for best-effort de-duplication.
--   * Anonymous clients can INSERT a response but can NEVER read raw rows, so
--     open-text answers are write-only from the browser and never leak.
--   * Anonymous clients can read ONLY pre-aggregated choice counts, and only
--     for polls whose results are meant to be public (handled app-side too).
-- ============================================================================

-- 1) Response table -----------------------------------------------------------
create table if not exists public.ah_poll_responses (
  id          bigint generated always as identity primary key,
  poll_id     text        not null,
  question_id text,                 -- which question within a (multi-question) poll
  option_id   text,                 -- set for single/multi choice polls
  free_text   text,                 -- set for text polls; NEVER exposed to anon
  client_id   text,                 -- anonymous localStorage UUID (not PII)
  created_at  timestamptz not null default now()
);

create index if not exists ah_poll_responses_poll_idx
  on public.ah_poll_responses (poll_id);

-- If the table already existed from an earlier version, add the new column.
alter table public.ah_poll_responses
  add column if not exists question_id text;

-- Keep free text bounded (defense in depth; the widget also caps length).
alter table public.ah_poll_responses
  add constraint ah_poll_free_text_len
  check (free_text is null or char_length(free_text) <= 1000) not valid;

-- 2) Row-level security -------------------------------------------------------
alter table public.ah_poll_responses enable row level security;

-- Allow anonymous inserts only. (No USING/SELECT policy => anon cannot read rows,
-- which is what keeps open-text answers private.)
drop policy if exists ah_poll_insert_anon on public.ah_poll_responses;
create policy ah_poll_insert_anon
  on public.ah_poll_responses
  for insert
  to anon
  with check (
    poll_id is not null
    and (
      (option_id is not null and free_text is null) or   -- choice vote
      (free_text is not null and option_id is null)       -- text answer
    )
    and char_length(coalesce(free_text, '')) <= 1000
  );

-- 3) Aggregate read path (choice polls only) ---------------------------------
-- A SECURITY DEFINER function returns ONLY counts, and ONLY option_id (never
-- free_text). This is the sole way anon can read anything back.
create or replace function public.ah_poll_results(p_poll_id text)
returns table (option_id text, votes bigint)
language sql
security definer
set search_path = public
as $$
  select option_id, count(*)::bigint as votes
  from public.ah_poll_responses
  where poll_id = p_poll_id
    and option_id is not null
  group by option_id
$$;

grant execute on function public.ah_poll_results(text) to anon;

-- 4) Combined submit + read RPC ----------------------------------------------
-- Records one response (for one question) and returns the fresh choice
-- aggregate. For text answers it records and returns no rows.
-- Drop the older 4-arg version if it exists from a previous install.
drop function if exists public.ah_poll_submit(text, text, text, text);

create or replace function public.ah_poll_submit(
  p_poll_id     text,
  p_question_id text,
  p_option_id   text,
  p_free_text   text,
  p_client_id   text
)
returns table (option_id text, votes bigint)
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.ah_poll_responses (poll_id, question_id, option_id, free_text, client_id)
  values (
    p_poll_id,
    nullif(p_question_id, ''),
    nullif(p_option_id, ''),
    nullif(left(coalesce(p_free_text, ''), 1000), ''),
    nullif(p_client_id, '')
  );

  if p_option_id is not null and p_option_id <> '' then
    return query select * from public.ah_poll_results(p_poll_id);
  end if;
  return;
end;
$$;

grant execute on function public.ah_poll_submit(text, text, text, text, text) to anon;

-- ============================================================================
-- 5) HOW THE TEAM SEES RESULTS (private — not exposed to the website)
-- ----------------------------------------------------------------------------
-- The anon key can only INSERT, so results are read from the Supabase
-- dashboard (SQL editor) or by any privileged/service role. Nothing below is
-- granted to anon.
--
-- (a) Choice tallies per question — the headline numbers:
--       select poll_id, question_id, option_id, count(*) as votes
--       from public.ah_poll_responses
--       where option_id is not null
--       group by poll_id, question_id, option_id
--       order by poll_id, question_id, votes desc;
--
-- (b) A convenience view you can open like a table in the dashboard:
create or replace view public.ah_poll_choice_summary as
  select poll_id, question_id, option_id, count(*)::bigint as votes,
         max(created_at) as last_response
  from public.ah_poll_responses
  where option_id is not null
  group by poll_id, question_id, option_id;

-- Keep the view private (readable only by privileged roles, never anon):
revoke all on public.ah_poll_choice_summary from anon;

-- (c) Open-text answers (e.g. the "what would make it more valuable" question).
--     Only ever readable here — the browser can never read these back:
--       select created_at, poll_id, question_id, free_text
--       from public.ah_poll_responses
--       where free_text is not null
--       order by created_at desc;
--
-- Tip: in the Supabase dashboard you can also click "Export to CSV" on any of
-- these queries to share results, or build a Supabase "Report".
-- ============================================================================

-- ============================================================================
-- 6) IN-APP RESULTS DASHBOARD — access for an allowlist of Microsoft users
-- ----------------------------------------------------------------------------
-- Enables the /community/results/ page: allowlisted people sign in with their
-- Microsoft (Entra) account and can read tallies + open-text answers. Everyone
-- else (including the anonymous website) still cannot read any response.
--
-- Prereq: no admin/tenant rights needed. Sign-in uses Supabase's built-in
-- **email magic link** (Authentication → Providers → Email, enabled by default).
-- In Supabase → Authentication → URL Configuration, add these redirect URLs:
--   https://microsoft.github.io/Analytics-Hub/community/results/
--   http://127.0.0.1:8000/community/results/   (for local testing)

-- (a) The allowlist. Add/remove people here anytime (emails are lower-cased).
create table if not exists public.ah_admins (
  email      text primary key,
  name       text,
  added_at   timestamptz not null default now()
);

insert into public.ah_admins (email, name) values
  ('alanderfield@microsoft.com',   'Adam Landerfield'),
  ('bmiddendorf@microsoft.com',    'Brian Middendorf'),
  ('fernandobe@microsoft.com',     'Fernando Berdugo Manzano'),
  ('jstoll@microsoft.com',         'Jennifer Stoll'),
  ('jordanking@microsoft.com',     'Jordan King'),
  ('keithmcgrane@microsoft.com',   'Keith Mcgrane'),
  ('luzlorenz@microsoft.com',      'Luz Lorenz'),
  ('saminabarton@microsoft.com',   'Samina Barton'),
  ('shahegde@microsoft.com',       'Shailendra Hegde'),
  ('sdowney@microsoft.com',        'Stephanie Downey'),
  ('stephansmith@microsoft.com',   'Stephanie Smith')
on conflict (email) do nothing;

-- Helper: is the signed-in user an allowlisted admin?
create or replace function public.ah_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.ah_admins
    where email = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- (b) Let allowlisted admins READ every response (tallies + open text).
alter table public.ah_admins enable row level security;

drop policy if exists ah_admins_self_read on public.ah_admins;
create policy ah_admins_self_read
  on public.ah_admins for select to authenticated
  using (public.ah_is_admin());

drop policy if exists ah_poll_admin_read on public.ah_poll_responses;
create policy ah_poll_admin_read
  on public.ah_poll_responses for select to authenticated
  using (public.ah_is_admin());

grant select on public.ah_poll_responses to authenticated;
grant select on public.ah_admins to authenticated;
-- (Anonymous visitors keep INSERT-only access — they still cannot read anything.)
-- ============================================================================


