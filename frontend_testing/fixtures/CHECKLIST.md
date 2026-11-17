# Fixture → page checklist (dev only)

**DEV ONLY. NEVER DELETE. NEVER SHIP.** Each live-seed fixture in `demo-data.mjs`, the page it is
there to test, and what to look for. Seed with `node frontend_testing/seed/seed.mjs`; logins and
event ids land in `../accounts.local.json`. All demo titles start with `[Seed]`.

"Look for" is what the fixture is meant to exercise, not a claim that the page gets it right.
Anything wrong you find goes to `Eventmind_files/frontend_to_test.md` or `TODO.md`, not here.

## Events (owned by the `organiser` account)

| Key | State | Test on | Look for |
|---|---|---|---|
| `free` | Free, Brussels, 19:00 venue time, participant holds a ticket | `/event/<id>`, `/explore` card, dashboard Tickets | "Free" badge; claim CTA for others, "already booked" for the participant; the time-zone scenario below |
| `paid` | €25, published | `/event/<id>` → `/checkout/<id>` | Paid checkout is not released: booking must show as blocked/unavailable, never a working payment. The seed confirms the API refuses it (503) |
| `sold-out` | Capacity 1, taken by the participant | `/event/<id>`, `/explore` card | "Sold out" badge; no booking control for anyone else |
| `unlimited` | Capacity 0 (= no limit), participant ticket | `/event/<id>`, organiser `/organizer/events` | No "N left" / progress bar; no sold-out state |
| `registration-closed` | Booked, then status `registration_closed` | `/event/<id>`, participant's ticket | Closed registration copy; the existing ticket still valid |
| `cancelled` | Booked, then cancelled | `/event/<id>`, participant bell + dashboard | "Event cancelled"; a real unread **cancelled** notification for the participant |
| `past` | Ended 10 days ago | `/event/<id>` (direct link; search hides it) | Past-event state, no booking; absent from `/explore` |
| `started` | Started an hour ago, runs 8 h | `/event/<id>` | Booking closed because it has started (the API refuses bookings after start) |
| `draft` | Status `draft` | organiser `/organizer/events`; `/event/<id>` as the organiser vs anyone else | Draft chip and Publish for the owner; not viewable by anyone else |
| `online` | Online, meeting link, participant ticket | `/event/<id>`, the Online filter on `/explore` | "Online" format, no map/venue, never encoded as a category |
| `hybrid` | Brussels venue + link, participant ticket | `/event/<id>`, both online and in-person filters | Matches both formats |
| `tokyo` | Asia/Tokyo, 19:00 venue time, participant ticket | `/event/<id>`, dashboard Tickets | Venue-time display; see time-zone scenario |
| `long-title` | Exactly 120 characters, participant ticket | `/explore` card, `/event/<id>` hero, dashboard ticket card, organiser table row, `/chat` room list | Wraps or truncates cleanly at 320–1920px; nothing overflows (run the sweep) |
| `external` | Ticketmaster listing via `/events/ingest` | `/event/<id>`, `/explore` card | Sends you to the provider; NewFind booking refused ("Book this external event with its original ticket provider") |
| `deleted` | Booked by `deleted-ticket-holder`, then the row removed | that account's dashboard Tickets | Deleted-event scenario below |

## Signed-in states (one account each)

| Label | State | Test on | Look for |
|---|---|---|---|
| `organiser` | Organiser with an onboarding profile, owns every demo event | `/organizer/events`, `/organizer/attendees`, `/organizer/create` | Full console populated by the demo events |
| `organiser-no-profile` | Organiser role, no onboarding profile | `/organizer/create`, `/organizer/onboarding` | With the dev bypass on: the terracotta bypass strip; submitting is still refused by the gateway ("Organizer onboarding required", 403; the seed checks this). Bypass off: redirect to onboarding |
| `participant` | Nine tickets across the events above | `/dashboard?tab=tickets`, bell, `/chat` | Ticket cards for every state; bell badge with real notices |
| `new-user` | Registered, nothing else | `/dashboard` (all tabs), bell | Every empty state |
| `deleted-ticket-holder` | One ticket whose event no longer exists | `/dashboard?tab=tickets` | Deleted-event scenario below |
| *(logged out)* | No account | `/dashboard`, `/chat`, `/organizer/*`, `/checkout/<id>` | Redirect to `/auth`; public pages unchanged |

Screenshot all of these in one go: `node frontend_testing/cdp/scenarios.mjs --only=states`.

## Scenarios

- **Deleted event.** No API deletes an event, so the seed removes the row from SQLite after the ticket
  is booked, leaving the orphan a real deletion would. Expected today: the whole Tickets tab fails
  ("Tickets could not be loaded"), because `lib/bookings.ts` loads each ticket's event and one 404
  rejects the lot. `node frontend_testing/cdp/scenarios.mjs --only=deleted`.
- **Time zone (browser in India, event in Brussels).** `node frontend_testing/cdp/scenarios.mjs --only=timezone`
  opens `free` (Brussels) and `tokyo` with the browser emulating `Asia/Kolkata` and `Europe/Brussels`.
  The event page should show the venue's wall clock (19:00) whatever the browser's zone. Also compare
  the **dashboard ticket card** for the same event (`--only=states` runs in the machine's zone): it
  formats in the browser's zone, so the same Brussels 19:00 event reads 11:30 pm from India.
- **Notification bell** (mocked, any data): `node frontend_testing/cdp/bell.mjs` → empty, unread,
  read, loading, error.
- **Social sign-in configured** (mocked): `node frontend_testing/cdp/social.mjs` → `/auth` with the
  Google/Facebook buttons enabled vs. the real (unconfigured) disabled state.
- **Chat, New page vs Old page:** `node frontend_testing/chat-demo/run.mjs`.
