# NewFind: frontend to test / decide

> From Gautham's review of "New page vs Old page" (2026-11-16/17). **Not fixed yet.** Nothing here is
> scheduled; Gautham will look at it later. Backend items live in `backend_to-do.md`.
> Line numbers are from 2026-11-17 and drift; grep the snippet.

---

## 1. Reminders for Gautham
Raise these when the review fixes are done (`review_resolution_plan.md`, Phase 5).

1. **FeatureBand copy.** Gautham chose **not** to change it in this round (2026-11-17). Reverting to Old page's wording would put three claims on the home page that are not live on New page: *a 2 % convenience fee on paid events*, *an AI assistant that "knows the event inside out"*, and *per-event chat rooms with the organiser*. The file's own header says every claim there is a promise to users (`components/FeatureBand.tsx`, lines 18-28). Decide: revert, rewrite truthfully, or keep the current text.
2. **Check the account recovery pages**: `/forgot-password`, `/reset-password`, `/verify-email` (his comment of 2026-11-16 12:28). Locally they cannot send mail (no SMTP; `backend_to-do.md` §2). To test them locally, set up Mailpit: `frontend_testing/MAILPIT.md`.
3. **Missing-email fallback** (resend after about 5 minutes, then a "contact us" by email or phone) is recorded in `backend_to-do.md` §2; the pages need matching UI when the backend supports it.
4. The open decisions in §3, the Phase 4 findings in §4 and the Phase 3 notes in §5 below.
5. **Pending cleanup of test data on the :8000 backend (Old page's database, `eventmind-newbackend`). Not done; Gautham chose to do it later.** Still in the database: the Phase 5 seed (5 `nfseed.*` accounts, 15 demo events) and the Phase 4 chat demo (organiser `nfseed.chat-organiser.c55ee5@gmail.com`, a participant, two free Brussels events). `node frontend_testing/seed/reset.mjs` removes all of those (it reuses the recorded `--db`). It does **not** remove the two Phase 3 accounts in §5 #5. After a reset, deleted events can linger on `/explore` for up to 5 minutes (§4 #5).

## 2. Frontend issues marked Broken or Risky that Gautham has not commented on
From the review document's "Broken or risky" lists (New page column and "On both"). Community items are not listed because Communities are parked.

| # | Issue | Where | Note |
|---|---|---|---|
| 1 | Hero quick pick **"Online"** returns nothing | `components/HeroChatCollage.tsx:43,161` | Links to `event_type=Online` without `city=Online`, so Explore adds the chosen city's lat/lng and the backend drops online events (`backend_to-do.md` §1). Confirmed live. |
| 2 | Hero quick pick **"Free"** inherits Explore's default "This week" | `HeroChatCollage.tsx:160` | The free event on 25 Nov was missing because the link opened with `date_from`/`date_to` for the current week. Confirmed live. ("Tonight" is being removed.) |
| 3 | `/explore` opened directly ignores the navbar city | `app/explore/page.tsx` initial `city` | Also in `backend_to-do.md` §1 at Gautham's request. Both sites. |
| 4 | Create form: picking a city does not set the event time zone when the fallback city list is used; time-zone gaps collapse into "Failed to save event…" | `app/organizer/create/page.tsx:942` | Frontend half of `backend_to-do.md` §4. |
| 5 | Checkout has no 10-ticket cap; sold-out races and changed quantities all show "Booking failed. Please retry…" | `app/checkout/[id]/page.tsx:164` | Backend allows 1 to 10. |
| 6 | Event chat page opens at the oldest message; the whole list is an `aria-live` region refreshed every 5 s; Send has no disabled style; blank page (no navbar) while signed out | `components/EventRooms.tsx` | |
| 7 | Dashboard **Tickets** tab fails as a whole if one event is deleted or private | `lib/bookings.ts` (`Promise.all` per ticket) | Reproduced in Phase 4: "Tickets could not be loaded. Please refresh or sign in again." Repeatable with `frontend_testing/cdp/scenarios.mjs --only=deleted`. |
| 8 | `/notifications` has no footer, background wrapper or tab title | `app/notifications/page.tsx` | |
| 9 | External listings (Ticketmaster, OpenAgenda) navigate away in the same tab | `app/event/[id]/page.tsx:217` | |
| 10 | Organisation name field has no 120-character limit (backend rejects longer; page shows a generic error) | `app/organizer/create/page.tsx:828` | |
| 11 | Earnings: the "Show totals in" currency picker is unreachable (rendered only in the "event has no row" branch); dates print as raw ISO | `app/organizer/(console)/earnings/page.tsx:183,259` | He asked for the backend half to be noted; the frontend can format regardless. |
| 12 | Console: next-up panel, attendees "Booked" column print raw ISO; check-in time is off by the UTC offset | `events/page.tsx:349`, `attendees/page.tsx:343,400` | Check-in half is the backend's missing zone (`backend_to-do.md` §6). |
| 13 | Create form location copy mentioned a map and shared search that don't exist there | `components/LocationSelector.tsx` | Being fixed by the coordinates/OpenStreetMap removal. |

## 3. Decisions taken and still open
- **Zone label on the event page**: placed beside the time, on the right of the date row (Old page has no zone label; this is the interpretation of "show it to the right of the date, like Old page"). Say if you meant directly after the date text.
- **Year on the event page**: kept. Only event **cards** lose the year, to make room for the venue name (Gautham, 2026-11-17).
- **Hero "Tonight" quick pick**: removed. No "Today" chip was added to the hero; Explore already has a Today date preset (still returns nothing until the backend date bug is fixed).
- **"Suggested for you"** becomes a filter tab after "All" (signed-in users with results), replacing the separate carousel; Old page's always-empty "Recommended" tab branches are removed. Done in Phase 2: the tab counts only in-person and hybrid suggestions, because the row is "Happening in {city}"; an online-only suggestion does not show there. Say if online ones should count too.
- **Explore's location picker has no border** (Phase 2). It is the navbar's `CityPicker` (pin + city name, no outline), and on Explore it sits in the top bar between the bordered search box and the bordered "Sort by" box, so it reads lighter than its neighbours. Decide: leave it, or give it the 2px `--brand-control-border` outline the other controls wear (a design change, so not done without you). `app/explore/page.tsx`, the `<CityPicker value={city} …/>` line.
- **FeatureBand**: deferred, see Reminder 1.
- **Home city-row radius (200 km)** is a question, in `backend_to-do.md` §9.

## 4. Found while building `frontend_testing/` (Phase 4, 2026-11-17)
Seen against the :8000 backend (Old page's, `eventmind-newbackend`, same backend code as New page). Not fixed.

| # | Finding | Where | Note |
|---|---|---|---|
| 1 | **Ticket cards show the browser's time, the event page shows the venue's.** A Brussels 19:00 event reads "7:00 PM" on `/event/<id>` from both India and Brussels, but "11:30 pm" on the dashboard ticket card from an India browser. | dashboard ticket card vs `/event/[id]` | Same family as §2 #12. Screenshots: `scenarios.mjs --only=timezone` and `--only=states`. |
| 2 | **Local backends create no participant profile on registration.** The auth service creates it synchronously only with `KAFKA_ENABLED=false` (`backend/services/auth/app/api/auth_endpoints.py`, register); `docker-compose.yml` sets it, `backend/scripts/shadow_runner.py` does not. Without it every new account gets "Record not found" (404) on `/user/<id>`, the dashboard Profile tab and every chat post. | env / `shadow_runner.py` | Not a production issue if production runs the compose env. Fix is one env line in the runner; the seed works around it. Also belongs in `backend_to-do.md`. |
| 3 | **Old page chat cannot hold a two-person conversation in a browser.** The :8007 service keeps one socket per (room, user) (`services/chat/app/services/connection_manager.py`); the page, the navbar's `ChatPresence` and `next dev`'s double-run effects each open one, so the page loses its slot and shows "Could not connect to the chat service". When a socket closes, the server broadcasts `{"system": "User … left."}` with no `sender_id`, which crashes an open chat page (`msg.sender_id.substring`). Nothing is stored, so a reload is empty; other people show as "Attendee XXXX". | Old page `app/chat/[roomId]/page.tsx`, chat service | For the New vs Old comparison only; New page's chat stores messages and shows history, names and read state. Screenshots from `frontend_testing/chat-demo/run.mjs`. |
| 4 | **New page chat: the open room still showed "(2 unread)"** in the room list in one participant screenshot, while that room was open. Organiser view did not. May be timing (marked read after load). | `components/EventRooms.tsx` | Check once; not confirmed as a bug. |
| 5 | **Deleted events can linger on `/explore` for up to 5 minutes**: the event service caches `/events/search` for 5 min and only clears it on create/edit. Matters for testing after `reset.mjs` or a real deletion. | `services/event/app/api/event_endpoints.py` (`_CACHE_TTL`) | Backend behaviour. |
| 6 | **Correction to Phase 2's note:** the :8000 backend **does** have `/event/recommendations`; it answered 401 (sign-in required), not 404. The Phase 2 check that mocked recommendations because the route was "missing" could be repeated against the real route with a seeded signed-in account. | `review_resolution_plan.md` §9 Phase 2 line | |

## 5. Notes from the bypass + `frontend_testing/` skeleton (Phase 3, 2026-11-17)
Checked at 1280px against :3000 and the :8000 backend. Bypass strip, dev banner and assistant flag behaved as specified in all three runs (bypass on, bypass off + assistant on, dummy mode).

| # | Note | Where | Decide / do |
|---|---|---|---|
| 1 | **Dev banner placement was my call, not yours.** It sits in normal flow above the navbar (not fixed), so it never covers the create form's sticky bar or the assistant launcher, but every page is 36.5px lower in `next dev`. Production is unaffected. | `apps/web/src/frontend_testing/DevBanner.tsx`, `app/layout.tsx` | Keep, or move it (e.g. a small fixed chip). A design change, so not done without you. |
| 2 | **Bypass strip wording** follows New page's title: "Dev bypass on — organisation setup is not being enforced.", buttons "Skip to Create Event →" (onboarding) and "← Set up your organisation" (create). Old page said "verification" and "← Organiser registration". | `frontend_testing/BypassStrip.tsx` and its two callers | Confirm the wording. |
| 3 | **How the frontend is deployed is still unconfirmed.** `STATUS.md` → *Deployment boundaries* says Vercel; nobody has checked. Root `frontend_testing/` is never imported, so it cannot reach a bundle; the open part is whether it rides along in the deploy artefact. | `frontend_testing/README.md` → *Open question* | Confirm Vercel (or not). |
| 4 | **Production-bundle check run in Phase 5 (2026-11-17), result differs from the plan.** With `NEXT_PUBLIC_SKIP_ORGANIZER_VERIFICATION` and `NEXT_PUBLIC_DEV_SHOW_EVENT_ASSISTANT` both forced to `true` during `next build`, both flags compile to `false` (`"SHOW_EVENT_ASSISTANT",0,!1,"SKIP_ORGANIZER_VERIFICATION",0,!1`), so the bypass cannot turn on. But **`Dev bypass on — organisation setup is not being enforced.` is still in two client chunks** (and "Skip to Create Event" in one) because `BypassStrip` is not tree-shaken: unreachable code, not a live bypass. The `NEXT_PUBLIC_*` names appear only in server source maps (`.next/server`), never in `.next/static`; no `.map` files ship in `static`. The old checklist line ("must not appear") would fail as written; `HANDOVER.md` now states the real check. | `HANDOVER.md` → *Shipping checklist*; `src/frontend_testing/BypassStrip.tsx` | Decide: accept the dead text, or make it tree-shake (a code change, not done). |
| 5 | **Two Phase 3 throwaway accounts are left on the :8000 backend** (Old page's database): `nf.p3.noprof.<timestamp>@gmail.com` and `nf.p3.prof.<timestamp>@gmail.com` (the second with an organiser profile "Phase Three Org"). `reset.mjs` only sweeps `nfseed.*`, so it will not remove them. | :8000 backend DB | Delete by hand, or leave as test data. |
| 6 | **`.env.local` changes reached the running `next dev` without a restart** (Next 16; server HTML and client behaviour both switched within seconds, three times). `HANDOVER.md` → *Dummy vs real data mode* and `frontend_testing/README.md` still say to restart. | docs only | Restarting is still the safe advice; soften the wording if it keeps holding. |
| 7 | **Assistant in real mode: only its appearance was checked.** The widget shows on `/event/<id>` with `NEXT_PUBLIC_DEV_SHOW_EVENT_ASSISTANT=true`; sending a message (needs `OPENAI_API_KEY` in the backend `.env`) was not tried. | `components/EventChatWidget.tsx` | Send one message to confirm. |
| 8 | **The paid demo event can only ever show "blocked"**: paid checkout isn't released, so that UI state stops at the booking button. | `frontend_testing/fixtures/` | Expected; revisit when payments land. |
| 9 | **Lint: 8 warnings, all pre-existing, none from Phase 3.** Unused `subFg` and `StarIcon` (`components/EventsCarousel.tsx:638,695`), unused `showToast` (`components/navbar/Navbar.tsx:423`), an unused expression (`scripts/responsive-sweep.mjs:82`), and `<img>` in the two OG image routes (`app/event/[id]/opengraph-image.tsx`, `app/community/[slug]/opengraph-image.tsx`; `<img>` is normal for `next/og`). | as listed | Small cleanup; the OG ones can stay. |
| 10 | **New page already had an unused `src/lib/dev-flags.ts`** (the bypass flag, wired to nothing). It was moved into `src/frontend_testing/` rather than duplicated. | `apps/web/src/frontend_testing/dev-flags.ts` | Info only. |
