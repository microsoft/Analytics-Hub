# Community feature — design & layout changelog

Tracks design/layout decisions and changes for the new **Community** tab (polls + events).

## Design principles
- **No customer data stored.** Event signup is handled by external Microsoft-managed
  registration (Teams / Outlook / MS Forms). We only store a `registerUrl`. Polls are
  anonymous; open-text answers are write-only from the client and never rendered to users.
- **Discoverable, not buried.** Polls and events surface inline on relevant pages, a
  homepage module, and a one-shot nudge — the Community page is the archive/landing, not
  the only entry point.
- **Reuse existing patterns.** Poll responses reuse the same Supabase project as `votes.js`
  (public anon key + RLS). Poll/event content is authored as JSON in `docs/data/` via PR,
  matching `testimonials.json` / `traffic-history.json`.

## Decisions (from planning)
| Topic | Decision |
|---|---|
| Poll backend | Reuse existing Supabase (custom widget, RLS) |
| Event signup | External registration link + add-to-calendar (.ics); **no PII stored** |
| MSFT-only events | `msftOnly: true` → shows "Microsoft employees can register; everyone can watch the recording" |
| Respondent identity | Anonymous (localStorage de-dupe, like votes.js) |
| Returning responders | Inline/homepage embeds hide once answered, using only the on-device localStorage flag (no user data stored; per-browser). Community page keeps polls visible. |
| Choice-poll results | Per-poll (`showResults`: after_vote / always / never) |
| Open-text results | Never shown to users (team reads in Supabase only) |
| Surfacing | Inline on relevant pages + homepage module + nudge toast |
| Nav placement | Top-level "Community" tab (after Case Studies) |
| Authoring | JSON in `docs/data/` via PR |

## Change log
- _(unreleased)_ Chargeback poll is now a **3-question survey** (single card, one submit):
  usage outcome, likelihood-to-recommend, and an open-text "what would make it more valuable".
  Results are hidden from users (`showResults: never`); team reads them in Supabase. Widget
  gained multi-question support (`questions[]`); schema gained a `question_id` column plus a
  private `ah_poll_choice_summary` view and read queries in `sql/community-supabase.sql`.
- _(unreleased)_ Chargeback poll moved from a full-width band to a **sticky right-rail card**
  (`.cb-poll-rail`): floating bottom-right on ≥1200px viewports, inline on smaller screens,
  dismissible, and auto-hidden once answered (on-device flag only). Improves discoverability.
- _(unreleased)_ Introduce Community feature: `docs/data/polls.json`, `docs/data/events.json`,
  `docs/poll.js` widget, `docs/community/` page, top-level nav link across all pages,
  homepage poll/events module, nudge integration, and Supabase schema (`sql/community-supabase.sql`).

## Change — poll carousel (one question at a time)
- Converted the multi-question poll renderer (`renderMulti` in `docs/poll.js`) from a stacked form into a **stepped carousel**: shows one question at a time with a `Question X of N` label and progress dots.
- Single-choice questions auto-advance ~220ms after selection; a `Next` button also advances, and `Back` returns to prior questions (answers preserved). Final question shows `Submit`.
- Added carousel styles (progress dots, Back/Next buttons, fade-in on step change; honors `prefers-reduced-motion`). No change to what is stored — still anonymous, per-question submit on finish.

## Change — poll scheduling, placement, ordering, share bar
- Suppressed the empty state on the Community page: the Polls section is hidden entirely unless at least one poll is open (no more 'No open polls' / 'Loading' text).
- Chargeback poll (`chargeback-usage-2026`) close date set to **2026-10-02**.
- 'What should we build next' (`build-priorities-2026`) is now **indefinitely open** (no closesOn) and **Community-only** (placements: [community]).
- Added an `order` field to polls; `openPolls` sorts by it so lower-order polls show first and 'build next' (order 99) always comes last.
- Removed the `share.js` top share bar from the Consumption & Cost page (`cowork-billing/index.html`) per request.

## Change — hide already-answered polls on Community page
- The Community page now filters out polls this browser has already answered (via `window.ahPolls.responded` / on-device localStorage), so the repeated 'Thanks — your feedback was recorded' card no longer shows on reload. The immediate thanks right after submitting still appears. If all open polls are answered, the Polls section is hidden entirely.

## Change — remove fake events; add 'coming soon' webinars; admin results dashboard
- Removed all placeholder/fake events (REPLACE-WITH URLs). Community Events section now hides entirely when empty; each subsection hides when it has nothing.
- Added two **Coming soon** webinars (undated): 'AI-in-One technical setup' and 'ValueLens technical setup' — shown in Upcoming with a 'Coming soon' badge, 'date to be announced', and a disabled 'Registration opening soon' action (no fake link/date). Sorted after any dated sessions.
- Decoupled the homepage Community launch nudge from events (was nested under next-training, so it never fired with no events).
- Added team-only results dashboard 'docs/community/results/index.html' (Microsoft/Entra sign-in via Supabase, allowlist-gated, per-question bar charts + open-text, CSV export) and a discreet 'Results (team)' link on the Community page. Deleted the throwaway preview server.

## Change — dedicated Supabase project for polls (2026-09-09)
- Keith could not grant access to the existing Supabase project, so polls now use a **dedicated Supabase project** (org 'AnalyticsHub', project 'Polls'). Report voting (votes.js) is unchanged and stays on Keith's project.
- Repointed SUPABASE_URL/SUPABASE_KEY (anon/publishable key + RLS) in 'docs/poll.js' and 'docs/community/results/index.html' to the new project.
- Corrected admin allowlist email to 'shahegde@microsoft.com' to match the sign-in claim.

## Change — chargeback survey screening filter (2026-09-09)
- Added a 4th option to Q1 ('usage'): "No — we didn't need a chargeback report" flagged 'end: true'.
- poll.js carousel now treats any option with 'end:true' as **terminal**: selecting it finishes the survey immediately (records just that answer) and skips Q2/Q3.
- Purpose: screen out respondents who never needed the report, so Q2 (recommend) + Q3 (value gap) only come from people who actually needed chargeback — isolating whether that audience is getting value.

## Change — results dashboard sign-in via email magic link (2026-09-09)
- Entra/Azure app registration needs tenant-admin rights we don't have, so the results dashboard now signs in with Supabase's built-in **email magic link** (OTP) instead of Azure OAuth.
- Allowlist enforcement is unchanged: 'ah_is_admin()' still matches 'auth.jwt()->>email' against 'ah_admins', so only allowlisted @microsoft.com users can read results.
- 'docs/community/results/index.html': email input + 'Email me a sign-in link', 'signInWithOtp', SIGNED_IN/SIGNED_OUT handling. Requires adding the results URLs under Supabase → Authentication → URL Configuration.

## Change — home poll → bottom-right rail; results link under Resources (2026-09-09)
- Home page ('docs/index.html'): moved the Chargeback poll out of the Community band into a fixed **bottom-right quick-poll rail** ('.hp-poll-rail'), mirroring the Consumption page. Dismissible; auto-hides once responded/dismissed (localStorage only). Community band now shows a short blurb + 'More polls & open ideas →'.
- Added a **Poll Results** item (team-only, survey dashboard) to the **Resources** nav dropdown on all 21 pages, with depth-correct relative paths to 'community/results/'.
