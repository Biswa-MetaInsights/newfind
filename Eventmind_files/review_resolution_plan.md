# Plan v2: resolve the review comments on "NewFind: New page vs Old page"

> **HANDOFF FILE. Approved by Gautham 2026-11-17.** Start each session with "Do Phase N from
> `Eventmind_files/review_resolution_plan.md`". Read only that phase's row (§6), the work items it
> names (§3-§5) and the files they list. No broad searching, no Explore agents: the research is done.
> Line numbers drift; grep the snippet. Tick the checklist at the bottom when a phase is finished.
> Where this file says "the plan is saved" it was copied from the plan-mode file; this copy is the live one.
>
> **Corrections made while saving (this copy wins):** (1) CLAUDE.md rule 13 / HANDOVER wording is
> rewritten in **Phase 3** (when the bypass actually returns), not Phase 0, so no doc claims something
> the code doesn't do yet. (2) `PARKED_README.md` rows start as `planned` and flip to `parked` in the
> phase that comments the code out. (3) The 12 KB budget stays.

## Context
Gautham left 51 comment threads on the comparison artifact. Most say "make New page (localhost:3000, `eventmind-gautham-live-features`) match Old page (localhost:3002, `eventmind-newbackend`)". The rest ask for backend notes, doc entries, answers, or test tooling. Code changes go into **New page only**; Old page's own bugs are ignored (his comment). Both sites share one backend, so backend problems are logged, not fixed.

Paths: `FE` = `eventmind-gautham-live-features/frontend_react/apps/web/src`, `OLD` = `eventmind-newbackend/frontend_react/apps/web/src`. Line numbers come from research; re-grep by snippet before editing, they may have shifted.

Conventions: park = comment out, never delete, with a `PARKED <date> (<reason>)` marker, listed in a new `PARKED_README.md`. Settled: Private **and** Unlisted visibility both parked; throwaway test accounts; test tooling lives in a `frontend_testing` folder.

---

## 1. Answers to your questions (nothing here changes code)

**Bell icon: does New page's offer a technical advantage?** No meaningful one.
- Both are 24×24 outline glyphs, stroke 1.8, round caps, `currentColor`. New page's `BellIcon` (`components/organizer/ConsoleIcons.tsx:175-177`) goes through the shared `Outline` wrapper (`:29-44`: same viewBox, stroke, `aria-hidden`). OLD's is an inline Heroicons `<svg>` with a longer path (bell body + clapper).
- New page's only merit is consistency with the shared console icon set. It is not smaller in any way that matters, not more accessible (the button already has `aria-label`), and not faster. `BellIcon` is imported only by `NotificationBell.tsx`, and the navbar doesn't use console icons otherwise.
- **Approved by you:** keep the shared `Outline` wrapper, but change the `BellIcon` path to OLD's Heroicons path, at 21px. Result: the Old page bell look, no duplicated SVG markup. Plus `title="Notifications"` and OLD's 150 ms JS hover. Your earlier comment (12:51) said replace with the old icon, and your later one (14:14) said keep the new icon only if it has a technical advantage. It doesn't, so this follows both.

**Why was "Enter coordinates" struck through?** My mistake: I wrote "~107-110" and "~101, ~106" (approximate line numbers); two tildes in the same paragraph render as strikethrough. The feature is **not** struck. It is removed from the code (plan item B4). I'll write "about" instead of "~" from now on.

**Bypasses / testing aids removed in git history (nothing restored yet):**
- **Dev bypass `SKIP_ORGANIZER_VERIFICATION`** (`lib/dev-flags.ts`: opens `/organizer/create` without an organiser profile, adds a strip with a "Skip to Create Event →" button on onboarding and a way back on create).
  - Removed 2026-11-01 in `94ea31e` ("Prepare isolated Hetzner core deployment…"): file, strips and gates deleted. The same commit **rewrote the docs**: CLAUDE.md rule 13 ("STRIP THE DEV BYPASS BEFORE DEPLOYING…", with the argument that the flag is `NODE_ENV==="development" && env var`, so it is inert in production) became "no development verification bypass is included", and HANDOVER's "Strip the dev bypass" checklist became "bypasses have been removed".
  - 2026-11-12 `d72f4b0` brought back only the file; the same day `726a79f` removed its usages again. Today `lib/dev-flags.ts` exists but **nothing imports it**.
- Other deletions I found are not test aids (restored features like notifications, rooms, location picker, social sign-in). The only other test-related deletion: `test_app.mjs`, `test_auth_chat.mjs` (root Playwright scripts) on 2026-09-03 (`0522a76`), described in the commit as an "inert" harness. I haven't opened them.
- Still present: dummy data mode (`NEXT_PUBLIC_DATA_MODE=dummy` plus `lib/fixtures/`), `responsive-sweep.mjs`, `booking-contract.mjs`, backend `tests/smoke_live.py`. `backend/scripts/seed_events.py` is stale (uses a placeholder organiser the current gateway rejects).
- The original rule-13 text and checklist are recoverable from `94ea31e^` and will be the base for the new "never remove" wording.

**Session wait: is it a bug fixed on New page?** Yes. It is the wait for the saved sign-in to load before deciding "signed in?". Old page checks immediately, so a hard refresh or direct link on dashboard, checkout or create can bounce a signed-in user to /auth. New page waits (`hasHydrated`) on dashboard, checkout, create and onboarding (confirmed in code). The sweep script's header comment still says these pages don't wait; that comment is stale and gets corrected.

**Why a 12 KB budget on CLAUDE.md, and why I wrote "keep within it":** it is the file's own rule (`CLAUDE.md` header; now 11.4 KB). It exists because CLAUDE.md loads into every session automatically, so every added KB is paid on every turn, and the old combined file had grown to 104 KB. **Decision: the 12 KB budget stays.** CLAUDE.md is 11,407 bytes, so about 880 bytes of headroom (limit 12,288). The "never remove" rules must be visible to a future agent before it knows to look, so they go in CLAUDE.md, but as a rewrite of rule 13 plus at most two very short lines (target under 700 bytes net), with all detail in `PARKED_README.md` and `frontend_testing/README.md`. After editing I measure the file (`(Get-Item CLAUDE.md).Length`) and trim wording if it goes over; the budget is not lifted.

**Recommended vs Suggested for you:** different data. Old "Recommended" filters already-loaded city events for a `recommended` badge that `/event/search` never emits, so it's effectively always empty. New "Suggested for you" calls `GET /event/recommendations` (signed-in only, matches profile interests to category/tags, falls back to nearest). Per your latest comment: remove Recommended, show Suggested for you as a tab/chip placed like Recommended was.

**Chat and assistant on New page:** event rooms for organiser + ticket holders, saved on the server, loaded by polling; no AI. The AI Event Assistant is hidden behind `isDummyMode` (`event/[id]/page.tsx:524`), so real users can't see it. Backend `POST /events/{id}/chat` exists, works for organiser and ticket holders only, needs `OPENAI_API_KEY`, and Docker doesn't pass the key. I add a dev-only flag to show it for testing (§4).

**Registration status consistency:** not consistent (organiser chip vs event page), goes to backend_to-do. **Postponement notification:** exists (in-app notice + email outbox for every ticket holder), email only if SMTP is configured, so locally it's in-app only.

**Your account-recovery reminder and the "resend email" comment:** the reminder is thread `5aa13d2e` ("Account recovery pages… Remind me to check it later", 12:28, still open on the document). It's about checking `/forgot-password`, `/reset-password`, `/verify-email` later. I invented a TODO.md entry for it; dropped. It goes in the reminders list instead. Your other comment (resend after ~5 min, then a "contact us" by email or phone) I **have** seen (thread `64e91249`); it's in backend_to-do, item 2.

---

## 2. Decisions recorded from your feedback
- Event page **keeps the year** (card-only removal, to fit the venue). Zone label goes beside the time on the right of the date row.
- Remove the **"Tonight"** hero quick pick. No "Today" pick is added to the hero (Today already exists as an Explore date preset).
- **"Suggested for you"** tab (not "Recommended for you"); remove the dead `Recommended` branches in `EventsCarousel.tsx`.
- Visibility field: Private **and** Unlisted commented out; form still sends `public`.
- **FeatureBand: not touched in this round (confirmed by you).** Reverting would bring back three claims that are false on New page today (2 % fee, AI assistant, chat promise). It goes on the reminders list in `frontend_to_test.md`.
- **"Enter coordinates" is removed from the code** (B3), confirmed.
- **Dummy data mode is merged into the testing folder** (see §4): the mode still exists (`NEXT_PUBLIC_DATA_MODE=dummy`, branches in `lib/data-source.ts`, fixtures in `lib/fixtures/`), so the fixtures move under `frontend_testing` and the docs treat it as a dev-testing tool.
- `/explore` opened directly ignoring the navbar city → recorded in backend_to-do as you said (it is frontend code, so it also gets a line in frontend_to_test.md).
- **CLAUDE.md 12 KB budget stays** (Gautham, 2026-11-17). After the 2026-11-17 routing row it is 11,595 bytes (limit 12,288). Measure after every CLAUDE.md edit.

---

## 3. Work items

### A. Docs and notes (no code)
1. **`Eventmind_files/backend_to-do.md`** (new; add a row to CLAUDE.md's routing table). Header: some issues may exist only on the locally hosted sites (no SMTP, `APP_PUBLIC_URL`=:3002, missing `geonames.sqlite`, no `NEWFIND_BACKEND_ORIGIN`) and not on the deployed server; re-check there. Items, each with file:line:
   1. Date search: `date_to` is read as 00:00, so "Today"/"This week" last day return nothing (`event_endpoints.py:191,225-226`); online events dropped when lat/lng sent (`:241`).
   2. Forgot password: 503 without SMTP (`recovery.py:117,126`, `mail.py:8-9`); reset links use `APP_PUBLIC_URL` (:3002); social sign-in only accepted from that origin (`oauth.py:91-93`); buttons disabled without keys. **Your text:** the first email may not arrive → resend option after ~5 minutes, then a "contact us" fallback (email or phone).
   3. Passwords: sign-in 8 / sign-up 10 / reset 10; backend register 8, login unlimited → one shared minimum; max 72 too high, consider 16–20 (72 is bcrypt's limit, `auth_service.py:11,16`).
   4. `/event/locations` needs `/app/data/geonames.sqlite`; fallback cities carry no time zone → Tokyo event keeps Europe/Brussels, saved 8 h off.
   5. Uploaded covers saved as `/api/user/assets/<id>`; only load when `NEWFIND_BACKEND_ORIGIN` is set.
   6. Console data: `checked_in_at` has no zone (`management.py:83,105`); phone/status/repeat hardcoded (`:80-82`); raw ISO "Booked" and "next-up" date (`management.py:159`).
   7. Registration-closed inconsistency: organiser chip (`EventStatus.tsx:115-121`) vs event page (`registration-state.ts:4-15`); no closed/ended badge on cards; stale comments `EventStatus.tsx:51-73`.
   8. Capacity 0: AI prompt "Capacity: 0 attendees" (`chat_endpoint.py:82`); publish modal says "Sold Out" (`PublishEventModal.tsx:38,84-89`); create form rejects <1 (`create/page.tsx:519`); console "5 of 0 · 0%" (`events/page.tsx:357`).
   9. Questions: "Is 200 km the right radius for the city row?"; "In which phase shall we enable paid events?"; service fee should be a **percentage** of the ticket, computed server-side per currency, not a flat €2.50 (`checkout/[id]/page.tsx:17`, `management.py:146`).
   10. **AI Event Assistant:** hidden for everyone (dummy-mode gate; Docker doesn't pass `OPENAI_API_KEY`). Your text: "Should we enable this for all users? Maybe that's better because what if users want to know something that's already published but couldn't spot it?" **Plus a Risks section I'll draft:** API cost and abuse (needs rate limits and a per-user cap), wrong or invented answers about price/time/refunds, prompt injection via event descriptions, leaking draft or private event data, anonymous traffic hitting the paid API, privacy (what is sent to the AI provider), moderation of organiser-written text.
   11. `/explore` opened directly ignores the navbar city and searches New York (both sites).
   12. Other: 10-ticket cap (`ticket_endpoints.py:30`), event org name max 120, postponement email needs SMTP, Old page docs say bypass removed but code has it.
2. **`frontend_to_test.md`** (new, `Eventmind_files/`), three sections:
   - **Reminders for Gautham** (I raise these at the end of the work): (1) **FeatureBand copy**: you chose not to change it now; three tiles would promise a 2 % fee, an AI assistant and chat rooms that aren't live on New page, so decide revert vs rewrite; (2) **check the account recovery pages** (`/forgot-password`, `/reset-password`, `/verify-email`; your thread 12:28) **and the missing-email fallback** (resend after ~5 min, then "contact us"; also in backend_to-do item 2); (3) decisions on the open items below.
   - **Frontend issues marked Broken/Risky you have not commented on:** hero "Online" and "Free" quick picks (Online returns nothing; Free inherits "This week"); `/explore` direct-open city; create form time-zone not following the city and generic "Failed to save event"; checkout has no 10-ticket cap and shows only a generic error; event chat page (opens at oldest message, whole list `aria-live` every 5 s, no disabled Send style, blank without navbar when signed out); dashboard Tickets tab fails entirely if one event is gone (`lib/bookings.ts`); `/notifications` has no footer/background/tab title; external listings open in the same tab (`event/[id]/page.tsx:217`); organisation name has no 120-char limit; earnings currency picker unreachable and raw ISO dates (`earnings/page.tsx:183,259`). (Community issues go away with parking.)
   - **Decisions taken / still open:** zone label placement (beside time, right side), year kept on event page, FeatureBand deferred.
3. **`PARKED_README.md`** (repo root; one table: feature, files, how it was parked, date, reason, how to re-enable). Entries: Communities (all of §B5-B8), footer social icons, Visibility field (Private + Unlisted), Explore map, hero "Tonight" quick pick, the old-comments about auth photo (removed rather than parked; record the reason in DESIGN_NOTES). Add `PARKED <date>` markers in code. CLAUDE.md gets one line pointing at it.
4. **`DESIGN_NOTES.md` §1 "Closed decisions"** rows (two-column format): auth photo removed (your reason verbatim: looks good full-screen but awkward when narrowed; a page used ~10 s should be simple and reliable, beautifying is redundant); year removed from cards to fit the venue; Explore map commented out to keep city picking simple; Private+Unlisted commented out because private events are not in MVP/phase 1 and may return later; Communities parked.
5. **CLAUDE.md / HANDOVER / STATUS / CHANGELOG / COMPONENTS:** rewrite rule 13 (restore the original "never remove the bypass; comment it out only while deploying" logic from `94ea31e^`); fold the "never remove/delete" rules (bypass + `frontend_testing/` incl. dummy fixtures, PARKED code, pointer to `PARKED_README.md`) into rule 13 and at most one extra line, keeping CLAUDE.md under 12 KB (measure after editing); HANDOVER shipping checklist ("Production access") updated; STATUS rows rewritten in place; CHANGELOG one line per meaningful change; COMPONENTS row for the bypass strip. Fix the stale hydration comment in `scripts/responsive-sweep.mjs`.

### B. Frontend changes (New page)
1. **Bell** (approved; do it in Phase 1): in `ConsoleIcons.tsx` set `BellIcon`'s path to OLD's Heroicons path; in `components/NotificationBell.tsx` size 21px, `title="Notifications"`, OLD's JS hover (150 ms, `useHoverStyle` look, `BRAND` from `@/lib/theme`); keep the dropdown.
2. **City picker** (`components/CityPicker.tsx:44`): remove green hover fill; add OLD tooltip "Click here to change your location" (`OLD CityPicker.tsx:134-146`, text colour not green).
3. **`components/LocationSelector.tsx`** (shared by navbar, Explore, Create form, so one edit does all): delete the "Your chosen search centre… OpenStreetMap" sentence (line about 99), delete the whole "Enter coordinates" block (about 107-110), reword the two messages that mention coordinates or the map (about 101, 106). Keep town search, "Use my location", GeoNames credit (licence attribution).
4. **Footer** (`components/Footer.tsx:86-89`): paste OLD's X/Instagram/LinkedIn links (`OLD Footer.tsx:83-94`) as a commented-out block with a PARKED marker.
5. **Communities, park everything:** comment out `Navbar.tsx:441`; copy OLD's `app/community/layout.tsx` (server `redirect("/")`); `PARKED = true` in `community/[slug]/opengraph-image.tsx:18` and `story/route.tsx:39`; `communities/page.tsx` redirect + body commented; in `organizer/create/page.tsx` comment out the community import (about 7-8), state (431-432), lookup (451), `community_id` (577), section (about 1198), mirroring `OLD create/page.tsx:427-470,590,1256-1285`. API/type packages untouched.
6. **Home:** hero placeholder → "Try pottery, marathon, dance,…" (`HeroChatCollage.tsx:261`); remove the "Tonight" entry (`:158`); drop `year` from `lib/card-adapters.ts:43` only (keep `timeZone`); **"Suggested for you" tab:** delete the second carousel section (`app/page.tsx:154`), pass the recommendations into the main `EventsCarousel` as a `suggestedEvents` prop, add tab "Suggested for you" after "All" (signed-in with results only), filter branch near `EventsCarousel.tsx:724`, fall back to "All" if the tab disappears, delete the dead `'Recommended'` branches (`:561-562`, `:728-729`).
7. **Explore:** comment out the map block (`explore/page.tsx:908`) and its unused `EventMap` import/`mapOpen` state (keep `EventMap.tsx` and `leaflet`); replace the `<details>` location control (`:606`) with `CityPicker` given optional controlled `value`/`onChange` props (Explore's `city` is local state, not the store); PARKED marker + reason ("keeps city picking simple").
8. **Event page:** split the zone from `fmtTime` (`event/[id]/page.tsx:71-77`) and render it as a small muted element beside the time on the right of the date row (`DetailCard.tsx:120-127`); keep the year.
9. **Auth page** (`app/auth/page.tsx`): remove the top bar (80-88), put "Back to home" absolutely top-right; delete the photo and overlay (94-97) and the `next/image` import; keep the logo link home (a small `lg:hidden` logo link for phones).
10. **Create form:** comment out the Visibility field (`organizer/create/page.tsx:967`), keep `visibility` state default `"public"`; PARKED marker; backend/types untouched.

### C. Bypass strip
Restore it as part of the testing folder (§4). The strip needs to be imported by two pages inside the Next app, so the **component and flag live in `apps/web/src/frontend_testing/`**; everything else (scripts, fixtures, README) is in the root `frontend_testing/`. Rewire `onboarding/page.tsx` (effect about 96-104, strip above header) and `create/page.tsx` (`useState` 440, effect 445-454, strip above header, back button 638) like OLD (`OLD create/page.tsx:447-451,656-691`, `onboarding/page.tsx:101,180-199`). Gate unchanged: `NODE_ENV==="development" && NEXT_PUBLIC_SKIP_ORGANIZER_VERIFICATION==="true"`; set to `true` in New page's `.env.local`. New page's onboarding title is "Set up your organisation" (OLD's says "Verify your organisation"); the strip's wording follows.

---

## 4. `frontend_testing/` (dev only, never deployed, never deleted)
Root of New page's repo. All of it is "DEV ONLY. NEVER DELETE. NEVER SHIP."
- `README.md`, `DO_NOT_DELETE.md`: purpose, how to run, the rules. Added to `.dockerignore`. `accounts.local.json` (generated logins) is git-ignored.
- **`seed/`** (Node 22 `fetch`, no new dependency): register throwaway accounts; organiser onboarding; create events via `POST /event/`; book tickets for participants; `reset`/cleanup script; replaces the stale `backend/scripts/seed_events.py` approach.
- **Signed-in states to cover (your list):** participant (with tickets), organiser with profile, organiser without profile, brand-new user, ticket-holder whose event was deleted (dashboard Tickets tab failure), plus a logged-out run.
- **Dummy data mode, merged here:** move `apps/web/src/lib/fixtures/` (`events.ts`, `organizer.ts`, `communities.ts`) into `apps/web/src/frontend_testing/fixtures/` and fix the imports (type-check proves nothing is missed). The `isDummyMode` branches in `lib/data-source.ts` and components stay where they are (they're product code paths); the README documents how to switch modes and what each mode covers. The guard script also checks the fixtures folder. Phase 3 does this move as its own commit because it touches many imports.
- **`fixtures/`** (live-seed demo events, in the root folder; the in-app dummy fixtures above are separate): demo events for every UI state: free, paid (blocked), sold out, unlimited (capacity 0), registration closed, cancelled, past, already started, draft, online, hybrid, Tokyo time zone, 120-char title, external listing.
- **Mocks:** CDP interception for `GET /event/notifications` (empty / unread / read / loading / error) to screenshot the bell dropdown; "social sign-in configured" mock for `/auth` buttons.
- **SMTP sink:** local Mailpit instructions + env values, so forgot-password, verification and event-change emails can be tested end to end.
- **Dev banner** (in `apps/web/src/frontend_testing/`): visible only in development; shows data mode, bypass on/off, assistant flag.
- **Event assistant flag** (`NEXT_PUBLIC_DEV_SHOW_EVENT_ASSISTANT`, same `NODE_ENV==="development" &&` rule): shows the assistant widget in real mode. Needs `OPENAI_API_KEY` locally (already set in the backend `.env`).
- **Chat demo** (`chat-demo/`): see §5.
- **Anything else needed for frontend testing:** the sweep (`pnpm --filter @eventmind/web sweep`) gets a documented throwaway-login recipe; a "deleted event" scenario; a time-zone scenario (browser in India vs event in Brussels); a checklist file mapping each fixture to the page it tests.
- **Protection against future removal (belt and braces):** (1) rules in README + CLAUDE.md + HANDOVER + PARKED_README; (2) a small guard script `apps/web/scripts/check-frontend-testing.mjs` chained into `pnpm type-check` (which agents must run), failing if `frontend_testing/` or the in-app folder is missing **or** a flag lacks its `NODE_ENV==="development"` half; (3) `.dockerignore` entry so it can't land in the backend image; (4) the in-app code is dead code in a production bundle, verified once by grepping the build output.
- Open for you: **how is the frontend deployed** (Vercel / Docker / other)? Nothing under repo-root `frontend_testing/` is imported by the app, so it can't appear in a bundle, but I'd like to confirm it can't ride along in the deploy artefact.

## 5. Chat demo
Servers are already listening on 3000, 3002, 8000-8009. Register two throwaway accounts (demo organiser + demo participant), onboard the organiser, create 2 free future Brussels events, have the participant book both (organisers can't book their own events). Capture the same conversation on New page `/chat/<event_id>` (server-saved, polled, history and read state) and Old page `/chat/<event_id>` (WebSocket on :8007, no history, no login check; room list comes from the browser's local tickets, so open the room URL directly). Hand you the demo organiser's login and a short "how they differ" note. You said "with me as the organiser"; throwaway organiser it is, per your earlier choice.

---

## 6. How to do this reliably and cheaply: phased sessions

**Why:** the research (file:line for every item) is already done. Re-doing it in a fresh session is the biggest token cost, and one giant session would hit context compaction and drift. So: write the research down once, then run short, single-purpose sessions that read only what they need.

**Setup (this session, after approval):**
1. Save this plan as `Eventmind_files/review_resolution_plan.md` (the handoff file: items, file:line, decisions, "done when" per item) with a progress checklist at the bottom that every session ticks.
2. Suggest a git checkpoint commit before Phase 1 (the branch has uncommitted work), and one commit per phase so any phase can be reverted alone. I only commit when you ask.

**Each session:** start with "Do Phase N from `Eventmind_files/review_resolution_plan.md`; read only that phase and the files it names." No Explore agents, no broad searching. End with: type-check (mandatory per CLAUDE.md), targeted visual check only where geometry changed, tick the checklist, update STATUS/CHANGELOG, stop.

| Phase | Scope | Model / cost | Visual check |
|---|---|---|---|
| **0 Docs** | A1-A5: backend_to-do, frontend_to_test, PARKED_README, DESIGN_NOTES rows, CLAUDE/HANDOVER wording, save the handoff file | cheapest (Sonnet), no code, no dev server | none |
| **1 Small edits** | B2-B4, B6 (placeholder, Tonight, card year), B8 zone label, B9 auth page, B10 visibility | Sonnet; type-check each | 1 pass at 375/1440 for cards, event page, auth |
| **2 Parking + tabs** | B5 Communities, B7 Explore map + CityPicker reuse, B6 Suggested-for-you tab | Opus/Fable for the tab and CityPicker (logic); parking is mechanical | Explore, home tabs, redirects |
| **3 Bypass + frontend_testing skeleton** | C, §4 folder, flags, guard script, banner, assistant flag; dummy-fixtures move as a separate commit | Sonnet | bypass strip on/off; dummy mode still loads |
| **4 Seeding + demos** | §4 seed/fixtures/mocks/SMTP notes, §5 chat demo, bell screenshots | Sonnet; needs servers up | screenshots are the output |
| **5 Close-out** | full sweep, production-bundle grep, doc reconciliation, reminders list, remove nothing | one careful session | `pnpm sweep` + spot checks |

Rules that keep outputs reliable: one phase = one commit; no phase edits files outside its list; every edit that changes UI also fixes the doc line that describes it in the same step (CLAUDE.md's own rule); stop and ask if a line no longer matches the plan rather than guessing.

## 7. Verification (end to end)
- `pnpm --filter @eventmind/web type-check` every phase; lint when hooks/imports change.
- Dev server per memory recipe; check at 375/1024/1440: bell hover + tooltip; city picker no green and no coordinates; home cards show venue, no year; "Suggested for you" tab only when signed in; Explore dropdown works, map gone; auth page without photo/bar, Back to home top-right; event page zone beside time, year kept; create form without Visibility and Community; bypass strip visible only with the flag; `/communities` and `/community/x` redirect home; footer icons only in source.
- `pnpm --filter @eventmind/web sweep` with a throwaway login; production build grep for the bypass text and the assistant flag; guard script passes and fails when the folder is temporarily renamed.
- Seed script end to end, then reset; chat demo screenshots of both sites.
- I won't reply on the artifact threads (they're not activated for Claude); I'll tell you which comments are done.

## 8. Reminders to raise with you at the end
1. FeatureBand copy (false claims) and whether to revert now or rewrite.
2. Check the account recovery pages.
3. Decide the open items in frontend_to_test.md.
(The bell approach is approved.)

---

## 9. Progress checklist (tick when done; one commit per phase)

- [x] **Phase 0, docs** (2026-11-17): `backend_to-do.md`, `frontend_to_test.md`, `PARKED_README.md` (rows `planned`), `DESIGN_NOTES.md` §1 rows, CLAUDE.md routing row, this handoff file. *Not done in Phase 0, moved:* CLAUDE.md rule 13 + HANDOVER shipping checklist (Phase 3), STATUS/CHANGELOG/COMPONENTS (in the phase that changes the code).
- [x] **Phase 1, small edits** (2026-11-17; type-check + lint clean; sweep 375/1440 on /, /auth, /event/[id] no overflow): B1 bell, B2 city picker tooltip/hover, B3 LocationSelector (no coordinates, no OSM sentence), B4 footer icons (commented), B6 placeholder + remove "Tonight" + card year, B8 zone label, B9 auth page, B10 visibility field parked. Flip those PARKED_README rows to `parked`. Fix the stale hydration comment in `scripts/responsive-sweep.mjs`.
- [x] **Phase 2, parking + tabs** (2026-11-17; type-check clean, lint 0 errors; headless-Chrome check: `/communities`, `/community/x`, `/community/create` land on `/`, OG/story 404; Suggested tab absent signed out and with no results, present after "All" with results, falls back to "All" when it empties; Explore picker local to the page; no overflow 320–1440. Recommendations were mocked in-browser; the :8000 backend running at the time was Old page's. It **does** have `/event/recommendations` (it answers 401 when signed out, found in Phase 4), so the check could be repeated against the real route): B5 Communities, B7 Explore map + `CityPicker` controlled props, B6 "Suggested for you" tab (+ remove dead `Recommended` branches).
- [x] **Phase 3, bypass + `frontend_testing/` skeleton** (2026-11-17; the existing unused `lib/dev-flags.ts` was moved into `src/frontend_testing/`; still open: how the frontend is deployed. The production-bundle grep was run in Phase 5): §C, §4 (README, DO_NOT_DELETE, guard script in `type-check`, banner, assistant flag, `.dockerignore`, `.gitignore`), then the dummy-fixtures move as its own commit; rewrite CLAUDE.md rule 13 and HANDOVER shipping checklist (keep CLAUDE.md under 12,288 bytes).
- [x] **Phase 4, seeding + demos:** §4 seed/fixtures/mocks/SMTP notes, §5 chat demo + screenshots, bell dropdown screenshots. Needs servers up (memory: `eventmind-start-servers-recipe`).
- [x] **Phase 5, close-out** (2026-11-17): `pnpm sweep` organiser, participant and signed-out at nine widths, 0 overflow in all three; guard script fails with the folder / `seed/seed.mjs` renamed and passes when restored, git status unchanged; production build grep: flags compile to `false`, but the `BypassStrip` text still ships as dead code (`frontend_to_test.md` §5 #4); STATUS, CHANGELOG, COMPONENTS (stale `EditPencil` row) and HANDOVER (bundle check) brought in line. Reminders in §8 and `frontend_to_test.md` §1 are listed for Gautham, not acted on. **Not done, by choice:** `reset.mjs` cleanup of the seed and chat demo accounts (pending item, `frontend_to_test.md` §1 #5).
