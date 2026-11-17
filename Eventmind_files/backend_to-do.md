# NewFind: backend to-do

> Collected from Gautham's review of "New page vs Old page" (2026-11-16/17). Backend issues and open
> product questions only. Frontend items live in `frontend_to_test.md`.
>
> ⚠️ **Some of these may exist only on the locally hosted sites and not on the server deployment.**
> Local-only causes: no SMTP settings, `APP_PUBLIC_URL` pointing at `localhost:3002`, no
> `/app/data/geonames.sqlite` outside Docker, `NEWFIND_BACKEND_ORIGIN` unset. **Re-check each item on
> the deployed server before treating it as a real bug.**
>
> File paths are under `backend/`. Line numbers are from 2026-11-17 and drift; grep the snippet.

---

## 1. Event search: dates and online events
- **`date_to` is read as the start of that day (00:00).** `services/event/app/api/event_endpoints.py:191` declares `date_to: Optional[datetime]`; `:225-226` filter `start_date >= date_from` and `start_date <= date_to`. The frontend sends date-only strings, so:
  - Explore's **Today** preset (`date_from = date_to = today`) returns nothing.
  - **This week** and **This month** drop events on their last day (Sunday, month end).
  - Confirmed live against the running backend on 2026-11-16.
- **Suggested fix:** treat a date-only `date_to` as end of day (`start_date < date_to + 1 day`), or have the frontend send the next day / `T23:59:59`. Comparisons are also UTC-naive, not in the event's own time zone.
- **Online events are dropped when `lat`/`lng` are sent** (`event_endpoints.py:241`, `if event.event_type == 'Online': continue`; `:236-249` also drops events without coordinates). Confirmed: 1 online event without lat/lng, 0 with.
- **`/explore` opened directly ignores the navbar city**: see 1c below. The hero **Online** and **Free** quick picks: see 1a and 1b.

### 1a. Hero "Online" quick pick returns nothing
- **What happens.** The home hero chip "Online" opens `/explore?view=events&event_type=Online` (`components/HeroChatCollage.tsx`, the `eventType()` helper and `quickPicks`). The link has no `city`, so Explore treats it as an ordinary city search: it falls back to the navbar city (New York by default) and sends `lat`, `lng` and `radius=200` together with `event_type=Online` (`app/explore/page.tsx`, the non-online branch of `buildEventParams`). The page says "0 events found" although online events exist.
- **Why.** `search_events` widens `event_type=Online` to `['Online', 'Hybrid']` (`services/event/app/api/event_endpoints.py:222-224`), then, as soon as `lat` is present, skips every row whose type is `'Online'` (`:241`). Online events are stored with no real coordinates (0,0), so a radius cannot apply to them. What survives is only Hybrid events inside 200 km of the city, usually none. Confirmed live: 1 online event without `lat`/`lng`, 0 with.
- **Ideal behaviour.** A search for the Online format never returns zero just because the visitor's city is far from anything. **Backend:** a geographic filter must not exclude online events: either skip the radius check for `Online` rows (return them with `distance_km: null`), or ignore `lat`/`lng` when `event_type` is exactly `Online`. Hybrid events keep the radius because they have a venue. **Frontend (works even before the backend fix):** the chip should link with `city=Online`, the Online pseudo-city, which makes Explore query by format only and send no coordinates; the same applies when someone picks the "Online" format chip on Explore itself.

### 1b. Hero "Free" quick pick inherits "This week"
- **What happens.** The chip opens `/explore?view=events&free=true` (`HeroChatCollage.tsx`, `quickPicks`). The link has no dates, and Explore applies its default date preset **"This week"** when the URL carries neither `date_from` nor `date_to` (`DEFAULT_PRESET = "week"`, `explore/page.tsx` near the top, and the two `useState` initialisers for `dateFrom`/`dateTo`). So "Free" silently shows only free events between today and this Sunday. Confirmed live: a free event on 25 November was missing when opened on 17 November.
- **Compounding backend bug.** With that date window the `date_to` problem above also applies: a free event on that Sunday is dropped (`date_to` is read as 00:00).
- **Ideal behaviour.** "Free" means **all upcoming free events**, with no hidden date window, and the page should make any active date filter visible. **Frontend:** link with an explicit open range, for example `date_from=<today>` and no `date_to` (Explore treats a URL that carries either date as authoritative and leaves the other empty). **Product question for Gautham:** should `/explore` opened without any date default to "This week" at all, or to "Any date (upcoming)" with the presets as optional narrowing? The default hides events for everyone who arrives without a date, not only from this chip.
- **Related backend behaviour to confirm is intended.** Free is sent as `price_max=0`, and the backend then also requires `source == 'native'` (`event_endpoints.py:229-231`), so free external listings (Ticketmaster, OpenAgenda) never appear under "Free".

### 1c. `/explore` opened directly ignores the navbar city
- **What happens.** Opening `/explore` directly (typed address, bookmark, a link without `city=`) searches around **New York** even when the navbar says Brussels. Only links that carry `city=`/`lat`/`lng` (home "View all", the hero search) land on the right place. Seen on both sites.
- **Most likely cause (not yet debugged in a browser).** Explore keeps its own `city` state, initialised once: from the URL's `lat`/`lng`, else from the `city` name, else from the store's `selectedCity` (`explore/page.tsx`, the `useState<City>` initialiser). Until the persisted location store has finished loading (`_hasHydrated`), `selectedCity` is the default city, New York, and a `useState` initialiser never runs again, so the page keeps New York after the store loads Brussels.
- **Ideal behaviour.** With no location in the URL, Explore starts in the navbar's city and follows it once the store has loaded. Explore's own picker stays local to the page, so a search there does not move the navbar's city (settled). The URL should then carry the city so the page can be shared. This is frontend code, listed here at Gautham's request and in `frontend_to_test.md`.

## 2. Account recovery and sign-in
- **Forgot password cannot work locally.** `services/auth/app/api/recovery.py:117` returns 503 "Email recovery is not configured yet" when `mail_ready()` is false (`:126` does the same for request-verification). Readiness needs `SMTP_HOST`, `SMTP_FROM` and `APP_PUBLIC_URL` (`shared/mail.py:8-9`). There are no `SMTP_*` values in the local `.env`.
- **Reset links point at the wrong site.** The link is built from `APP_PUBLIC_URL` (`recovery.py:109`), which is `http://localhost:3002` locally, and Old page has no `/reset-password`.
- **Social sign-in** only accepts a start from `APP_PUBLIC_URL` (`oauth.py:91-93`, 403 "Start social sign-in from NewFind"), so it fails from `localhost:3000` while the value is `:3002`. The buttons also stay disabled while no Google/Facebook keys are configured.
- **⚠️ Gautham's addition (verbatim intent):** "This is great, but what if the user doesn't receive the email on the first try? There should be an option to **resend the email after about 5 minutes**, and if that doesn't fix it either, an option to **contact us** (via email or phone number)." Applies to password reset and to email verification. Needs: resend cooldown (server-enforced), a visible support contact, and a limit on resends.

## 3. Passwords
- **Different minimums in different places:** sign-in form 8, sign-up form 10, reset 10 (`AccountRecovery.tsx:14`), **backend register 8** (`auth_schemas.py:14`), **backend login unlimited** (`auth_schemas.py:26-28`). Gautham: sign-in and sign-up should ideally have the **same** minimum.
- **Maximum is 72** (frontend `maxLength`, backend 72-byte validator at `auth_schemas.py:17-21` and `recovery.py:92-96`). 72 is bcrypt's input limit (`services/auth/app/services/auth_service.py:11,16`). Gautham: 72 seems too high; **16 or 20** may be a better upper limit. Note: most security guidance prefers a *higher* cap, so confirm this is intended. Lowering it means changing the validators and the truncation together.

## 4. Locations and time zones
- **`GET /event/locations` reads `/app/data/geonames.sqlite`** (`shared/places.py:7,13-14`, overridable with `LOCATION_DB`; `shared/import_places.py` builds it). Outside Docker the file is missing, the search returns `[]`, and the frontend falls back to a built-in city list **without a time zone**. Result: choosing Tokyo on the create form keeps `Europe/Brussels`, and the saved start time is off by the difference (8 h).

### 4a. Create form: time zone and error handling
Frontend code (`app/organizer/create/page.tsx`) driven by backend behaviour; also listed in `frontend_to_test.md`. Three separate problems:
1. **The time zone does not follow the chosen city on the fallback list.** The city picker calls `setEventTimezone` only when the picked city has a `timezone` (the `LocationSelector` `onChange` handler at the "Event location" field). Cities from the built-in fallback list (used whenever `/event/locations` returns nothing, see above) have none, so `eventTimezone` stays at its default `"Europe/Brussels"` (state initialiser near the top of the component). Choosing Tokyo and entering 19:00 saves 19:00 Brussels time, which is 03:00 the next day in Tokyo (an 8-hour shift in winter, 7 in summer).
2. **The time zone is a free-text box.** The "Event time zone" input accepts any text and offers a short datalist of 12 zones. A typo or a non-IANA value ("IST", "Europe/Brusels") passes the form. The backend rejects it with 422 "Choose a valid IANA time zone" (`services/event/app/schemas/event_schemas.py:18-25`); in the browser the same bad value makes the time conversion throw first (`lib/event-time.ts`).
3. **Every failure becomes the same sentence.** The submit handler ends in `catch { setError("Failed to save event. Please check all fields and try again.") }` and drops the real error. Things lost behind it: the friendly messages `eventTimeUtc()` already throws, "Enter a valid event date and time." and "This local time does not exist because the clocks change. Please choose another time." (`lib/event-time.ts:8,18`, a time inside a daylight-saving gap); an unknown time zone name; the backend's 422 field messages (title or organisation name too long, capacity, price); 401 (session expired), 403 (no organiser profile) and 5xx or network errors.
- **Ideal behaviour.**
  - **Derive the zone from the place.** `/event/locations` should return a `timezone` for every result, and the fallback city list should carry one too (or the backend resolves a zone from `lat`/`lng`). The form shows the zone as a derived value with a "change" control, so Tokyo gives `Asia/Tokyo` with no extra step.
  - **Pick, don't type.** Make the zone a searchable list of valid IANA names (`Intl.supportedValuesOf('timeZone')`), not free text, so an invalid zone cannot be entered.
  - **Say what went wrong, next to the field.** Show client-side validation messages inline (date/time, time zone, the daylight-saving gap). Parse the backend's 422 `detail` list (each item names the field in `loc` and a readable `msg`) into per-field messages. Give 401, 403 and 5xx/network their own short messages ("Your session expired, sign in again", "Set up your organisation first", "Something went wrong on our side, try again").
  - **Backend side:** keep the strict validator, keep its messages human-readable and stable, and return the zone with every location result.

## 5. Uploaded images
- Cover images are saved as the relative URL `/api/user/assets/<id>` (`services/user/app/api/assets.py:59`). They only display when the Next.js app proxies `/api/*`, i.e. when `NEWFIND_BACKEND_ORIGIN` was set at dev-server start (`next.config.ts`). It is not in `.env.local`. Such an event also cannot be edited on Old page (its edit dialog rejects `/api/...` image links).

## 6. Organiser console data
- **`checked_in_at` has no time zone** (`services/ticketing/app/models/ticket.py:36`, set with `datetime.utcnow()` at `management.py:101`, returned without a "Z" at `:83,105`), so the frontend shows it shifted by the viewer's UTC offset. `purchased_at` is also naive, but the attendee endpoint appends "Z" (`:82`).
- **Attendee rows** (`management.py:56-91`): `phone` is always `''` (`:80`), `status` is always `'Confirmed'` even after check-in (`:82`), `repeat` is always `''` (`:82`). `q` search is applied after fetching and skips pagination (`:78,91`).
- **Raw ISO dates in the console:** the "next-up" date and the attendees' "Booked" column arrive as ISO strings (`management.py` around `:159` for next-up). The frontend prints them as-is today (`events/page.tsx:349`, `attendees/page.tsx:400`, `earnings/page.tsx:259`); the backend should return them with an explicit zone, or the frontend should format them.

- **Earnings: the "Show totals in" currency picker is unreachable** (`organizer/(console)/earnings/page.tsx`, near the "has not settled anything yet" branch). The `<select>` is rendered only inside the branch for "the picked event has no earnings row", so in the normal view it never exists. An organiser with events in more than one currency sees only the first row's currency (`currency = params.get('currency') || allRows[0]?.currency`) and the page silently hides every row in another currency (`.filter(r => r.currency === currency)`). The overview payload already carries `revenueByCurrency` (`management.py` around `:150`), but the earnings page does not use it.
  - **Ideal behaviour:** the picker appears whenever the organiser has more than one currency (or the page shows one total per currency); other-currency rows are never silently dropped; no conversion between currencies unless a rate source is agreed. Frontend work, listed here at Gautham's request.
- **Raw ISO dates (frontend now formats them; the backend should still send a zone).** The next-up `when` and each earnings row's `when` are the event's raw `start_date` string (`management.py:145,166`), and the attendees' `booked` is `purchased_at.isoformat() + 'Z'` (`:82`). The console now prints them in the event's own time zone, e.g. "04 Dec 2026, 19:00 CET" (2026-11-17), by looking the event up in the organiser's event list. **Ideal:** include each event's `timezone` in those three payloads so the frontend needs no lookup, and fix `checked_in_at` (above) so the check-in time can be formatted the same way.

## 7. Registration status is shown inconsistently
- The organiser's status chip (`EventStatus.tsx:115-121`, `lifecycleOf`, 4 states) and the event/booking page (`lib/registration-state.ts:4-15`) derive state differently:
  - an event whose end time has passed but status is still `published` shows **"Live / open for new joins"** on the chip and **"Event ended"** on the booking card;
  - a `completed` event shows the chip **"Registration closed"** but the booking card **"Event ended"**;
  - a `published` event that has already started shows the chip **"Live"** but the booking card **"Registration closed"**.
- Cards and Explore badges have no "closed" or "ended" badge at all (`EventBadges.tsx:134`, `card-adapters.ts:72`), so `registration_closed` events look the same as open ones in lists.
- `registration_closed` **does** exist in the backend (`services/event/app/models/event.py:11-16`). Several comments in `EventStatus.tsx` (`:51-73`, `:179-181`) still say it doesn't; they are stale. Needs one agreed status model shared by the backend and both views.

## 8. Unlimited capacity (capacity 0)
Event page and booking handle it correctly now. Leftovers:
- The AI prompt says "Capacity: 0 attendees" (`services/event/app/api/chat_endpoint.py:82`).
- The publish dialog warns "The page will show Sold Out and nobody can book" for capacity 0 (`PublishEventModal.tsx:38,84-89`), which is wrong.
- The create form rejects capacity below 1 (`organizer/create/page.tsx:519-520`) while the edit dialog allows 0, so unlimited can't be chosen at creation.
- The console shows "5 of 0 · 0%" (`organizer/(console)/events/page.tsx:357`).

## 9. Product questions (not bugs)
- **Is 200 km the right radius for the city row** on the home page? (`app/page.tsx:25`; Old page used 100.)
- **In which phase shall we enable paid events?** Paid booking is blocked today (`services/ticketing/app/api/ticket_endpoints.py:65`); checkout says "Payments are disabled during initial testing".
- **Service fee should be a percentage of the ticket price, not a fixed amount.** Today it is a flat `SERVICE_FEE = 2.5` on the frontend (`checkout/[id]/page.tsx:17`) shown in the event's currency (so 2.5 JPY or 2.5 INR too); the backend hardcodes `buyerFee: 0` (`management.py:146`). Compute it server-side, per currency, as a percentage.
- Ticket cap: backend allows 1 to 10 per booking (`ticket_endpoints.py:30`); the frontend has no cap, see `frontend_to_test.md`.
- Organisation name length: see section 13.
- **Question for Biswajith: how is the frontend (the Next.js app) deployed and updated?** `STATUS.md` → *Deployment boundaries* says the existing Vercel project and `www.newfind.events`; the repo's only Dockerfiles are the backend's (`backend/**/Dockerfile`), and an earlier commit message mentions an isolated Hetzner deployment. Gautham does not know. Why it matters: (1) if the frontend is copied or built from a checkout (manually, on Hetzner or anywhere), `frontend_testing/` (test scripts, `accounts.local.json`) and `.env.local` must be excluded from the copy; (2) the dev flags are `NODE_ENV`-gated, but the production environment must still not set `NEXT_PUBLIC_SKIP_*` or `NEXT_PUBLIC_DEV_*`; (3) `STATUS.md` should then say the one true method.

## 10. AI Event Assistant: should everyone get it?
**Current state.** The widget is hidden for everyone in real mode (`event/[id]/page.tsx:524`, `isDummyMode && <EventChatWidget/>`). The backend endpoint exists (`POST /events/{event_id}/chat`, `services/event/app/api/chat_endpoint.py:99`) but answers only the organiser and ticket holders (403 otherwise), needs `OPENAI_API_KEY` (503 otherwise), and `docker-compose.yml:206-235` does not pass that key to the event service, so a Docker deployment returns 503. Old page shows the widget to everybody. `TODO.md` §7b already holds an undecided question about non-registered users.

**Gautham's question:** *Should we enable this for all users? Maybe that's better, because what if users would like to know something that's already published but couldn't spot it? What are the risks involved with this decision?*

**Risks to weigh:**
1. **Cost and abuse.** Anonymous traffic would hit a paid API. Needs per-IP and per-user rate limits, a daily cap, and a kill switch.
2. **Wrong answers.** A model can invent a price, time, refund rule or address. Answers should be grounded only in the event's own fields and say "ask the organiser" otherwise.
3. **Prompt injection.** Event descriptions are written by organisers. A malicious description can try to steer the assistant. Treat event text as data, not instructions.
4. **Data exposure.** Public users must not receive draft, unlisted or other private event data, attendee lists, or organiser contact details through the assistant.
5. **Privacy and legal.** What gets sent to the AI provider (user questions, event text) and where it is stored; a notice for users; GDPR basis.
6. **Moderation.** Offensive or off-topic use, and organiser-written text that is itself unsafe.
7. **Availability.** Provider outages should degrade to "assistant unavailable", never break the event page.
8. **Expectation.** If it is visible to everyone, it becomes a promise on every event page. Old page's home copy already promises it, and the same copy may come back to New page (see the FeatureBand reminder in `frontend_to_test.md`).

**Middle options:** signed-in users only; show it only on published public events; limit questions per day; start with a "suggested questions" set that needs no free text.

## 11. Other notes
- Postponement and cancellation **do** notify: an in-app notice plus an email outbox row for every current ticket holder (`services/event/app/api/workspace.py:101-110`, mail worker `:249-270`). Email only goes out when SMTP is configured, so locally it is in-app only. The note "Email delivery depends on the configured email service" in `EditEventModal.tsx:575` is accurate; the comment in `EventStatus.tsx:68-73` that "nothing sends" is stale.
- `/event/recommendations` (signed-in only, `workspace.py:274-296`) is what New page's "Suggested for you" uses. Old page's "Recommended" tab filters for a `recommended` badge that `/event/search` never emits, so it is effectively always empty.
- Old page's docs say the dev bypass was removed, but its code still has it (`lib/dev-flags.ts`).
- `backend/scripts/seed_events.py` is stale: it posts with a placeholder organiser that the gateway now rejects (`event_endpoints.py:62-63`, `gateway/access.py` organiser-profile check). Replaced by the seeding tools in `frontend_testing/`.

## 12. Dashboard "Tickets" tab fails as a whole when one event is gone
- **What happens.** A user with several tickets sees "Tickets could not be loaded. Please refresh or sign in again." and **no tickets at all** as soon as one of their events cannot be read. Reproduced in Phase 4 (`frontend_testing/cdp/scenarios.mjs --only=deleted`, the `deleted-ticket-holder` account).
- **Why.** The tab calls `GET /ticket/user/{id}`, which returns bare ticket rows (`ticket_endpoints.py:128-135`: id, event_id, price, QR hash, purchase time, no event data). The frontend then fetches **every ticket's event one by one** (`lib/bookings.ts`, `Promise.all(data.map(storedTicket))`, one `GET /event/{id}` each). If any one of those requests fails (the event row is gone, or the event is refused to this user), `Promise.all` rejects and the whole list is lost. It is also N+1 requests: 20 tickets means 21 calls on every dashboard load.
- **How it should work.**
  - **Backend:** the ticket list should carry what a ticket card needs, resolved server-side in one call: event title, `start_date`, `timezone`, currency, city/venue, image, and the event's status. If the event no longer exists, return the ticket with an explicit state (for example `event: null` plus `event_status: "removed"`) instead of failing, so the user still sees their ticket and can be told what happened.
  - **Frontend (until then):** load the events with `Promise.allSettled`, show the tickets that resolved, and draw an "Event unavailable" card for the ones that did not.
  - **Policy question:** I found no delete route in the event service (an event is cancelled or postponed, which notifies holders). So this happens when a row is removed outside the app (admin or database clean-up, a test reset) or an event stops being readable. Decide what a ticket holder should see and be owed in that case (refund note, contact link).

## 13. Organisation name length limit
- **Today.** The backend allows at most **120 characters** on an event's `organization_name` (`services/event/app/schemas/event_schemas.py:11` create, `:137` edit). The create form's "Organisation name" field (`organizer/create/page.tsx`) has **no `maxLength`**, so a longer name is typed without any hint and is then rejected with a 422 that the form shows only as "Failed to save event" (see 4a).
- **What Gautham asked for:** a suitable limit. **Proposal:** keep **120** as the one number (it already is the stored limit, it comfortably fits real organisation names, and the event title allows 200), and make every surface agree with it: `maxLength={120}` and a live counter ("37 / 120") on the create form and the edit dialog, and the backend's message shown next to the field if it is ever exceeded. If a shorter limit is preferred (for example 80, so a name never wraps on a card), change the backend validator and the form together, and check existing rows first (`select max(length(organization_name)) from events`).
- **Also check:** the organiser profile's own organisation name field on `/organizer/onboarding` should use the same limit; I have not compared them.
