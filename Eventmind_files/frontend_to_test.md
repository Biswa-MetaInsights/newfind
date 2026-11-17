# NewFind: frontend to test / decide

> From Gautham's review of "New page vs Old page" (2026-11-16/17). **Not fixed yet.** Nothing here is
> scheduled; Gautham will look at it later. Backend items live in `backend_to-do.md`.
> Line numbers are from 2026-11-17 and drift; grep the snippet.

---

## 1. Reminders for Gautham
Raise these when the review fixes are done (`review_resolution_plan.md`, Phase 5).

1. **FeatureBand copy.** Gautham chose **not** to change it in this round (2026-11-17). Reverting to Old page's wording would put three claims on the home page that are not live on New page: *a 2 % convenience fee on paid events*, *an AI assistant that "knows the event inside out"*, and *per-event chat rooms with the organiser*. The file's own header says every claim there is a promise to users (`components/FeatureBand.tsx`, lines 18-28). Decide: revert, rewrite truthfully, or keep the current text.
2. **Check the account recovery pages**: `/forgot-password`, `/reset-password`, `/verify-email` (his comment of 2026-11-16 12:28). Locally they cannot send mail (no SMTP; `backend_to-do.md` §2). `frontend_testing/` will include a Mailpit setup to test them.
3. **Missing-email fallback** (resend after about 5 minutes, then a "contact us" by email or phone) is recorded in `backend_to-do.md` §2; the pages need matching UI when the backend supports it.
4. The open decisions in §3 below.

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
| 7 | Dashboard **Tickets** tab fails as a whole if one event is deleted or private | `lib/bookings.ts` (`Promise.all` per ticket) | |
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
- **Stale `COMPONENTS.md` row for `EditPencil`** (docs only). It says the home page's city name uses `EditPencil` with the tooltip "Click here to change your location"; `CityPicker` no longer imports `EditPencil` (every variant is a pin glyph, and the tooltip now lives in `CityPicker`'s `inline` variant). The `CityPicker` row was corrected in Phase 2; the `EditPencil` row was left because it was outside that phase. Check where `EditPencil` is still used and fix the row.
- **FeatureBand**: deferred, see Reminder 1.
- **Home city-row radius (200 km)** is a question, in `backend_to-do.md` §9.
