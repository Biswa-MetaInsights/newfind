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
- **`/explore` opened directly ignores the navbar city** and searches around New York (seen on both sites; only links that carry `city=` get the right place). This is frontend code, listed here at Gautham's request and again in `frontend_to_test.md`.

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

## 5. Uploaded images
- Cover images are saved as the relative URL `/api/user/assets/<id>` (`services/user/app/api/assets.py:59`). They only display when the Next.js app proxies `/api/*`, i.e. when `NEWFIND_BACKEND_ORIGIN` was set at dev-server start (`next.config.ts`). It is not in `.env.local`. Such an event also cannot be edited on Old page (its edit dialog rejects `/api/...` image links).

## 6. Organiser console data
- **`checked_in_at` has no time zone** (`services/ticketing/app/models/ticket.py:36`, set with `datetime.utcnow()` at `management.py:101`, returned without a "Z" at `:83,105`), so the frontend shows it shifted by the viewer's UTC offset. `purchased_at` is also naive, but the attendee endpoint appends "Z" (`:82`).
- **Attendee rows** (`management.py:56-91`): `phone` is always `''` (`:80`), `status` is always `'Confirmed'` even after check-in (`:82`), `repeat` is always `''` (`:82`). `q` search is applied after fetching and skips pagination (`:78,91`).
- **Raw ISO dates in the console:** the "next-up" date and the attendees' "Booked" column arrive as ISO strings (`management.py` around `:159` for next-up). The frontend prints them as-is today (`events/page.tsx:349`, `attendees/page.tsx:400`, `earnings/page.tsx:259`); the backend should return them with an explicit zone, or the frontend should format them.

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
- Event `organization_name` max is 120 (`event_schemas.py:11,137`); the form has no limit.

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
