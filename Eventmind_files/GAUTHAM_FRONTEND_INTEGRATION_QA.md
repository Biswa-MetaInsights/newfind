# Gautham frontend integration — 12 November 2026

## Release intent

Retain the restored PR 9 hero, Roboto font, brand stylesheet and component geometry while reconnecting the existing core backend. No production database migration or backend container replacement is part of the frontend deployment.

## Implemented in the candidate

- Same-origin production API proxy and client configuration.
- Email/password accounts, enabled-provider social login and callback pages; actionable visible errors; recovery and verification pages.
- Persistent free booking, server inventory and idempotency, account-scoped ticket retrieval and authenticated QR rendering. No synthetic ticket confirms a real booking.
- Organizer event states including drafts, attendees, check-in/undo, overview and currency-separated earnings reads.
- Persistent event content, cover upload, agenda, FAQ, lifecycle and announcements integration.
- International place lookup, 200 km discovery, map, pagination and currency-scoped price filtering.
- Saved participant profiles, avatar uploads and explicit social account linking.
- Durable event conversations, unread counts and notifications; community membership and reviews.
- Help/About pages, working Help destination, safe provider links and canonical social metadata.
- Prepared OpenAgenda calendar import modules and provider-specific presentation. This does not activate an import.

## Verification

- Existing isolated backend suite: 40 passed, one optional restic test skipped.
- Shipping TypeScript booking client against the actual isolated gateway/services: passed booking, duplicate retry, ticket-service restart persistence, other-account isolation, owner booking rejection and private QR access.
- OpenAgenda tests: 15 passed, covering normalization, dates/cancellation, license attribution, import identity and database upsert.
- Frontend TypeScript: passed.
- Production build: passed, including recovery, provider callback and Help/About routes.
- ESLint: no errors; existing unused-symbol warnings remain.
- Production deployment `7Udocu8Lk5njFevNjpcYJNSVfc4h` is Ready and assigned to `www.newfind.events`; application source `726a79f80e0d311047af5069bf874b6d97229831`.
- Browser: original two-column hero, Roboto font, sign-in photo/header/home navigation, Help route, and API-backed Leuven selection verified. Desktop scroll width did not exceed the viewport.
- Google: button opens Google, owner selected an account, consent returned to NewFind; existing password-account collision correctly requires explicit linking. Password entered by the owner was rejected. Recovery/linking and persisted signed-in browser checks remain blocked on owner input.
- Device emulation is blocked by policy. Normal browser zoom reproduced a location panel beginning at x=-104 px. Hotfix `6bb9ac3` is live in production deployment `6qR5LyCLegpA7XaZjQAWKhAhEeMd`; its bounded scrollable panel passed at 340, 454, 545, 681, 779 and 909 CSS px from the heading and mobile menu. Live 340 px panel bounds: left/top 16, right 321, bottom 218, viewport 340×234. Home/auth/discovery and expanded discovery location have no horizontal overflow at 340 px. This does not replace real-device touch/keyboard or signed-in organiser QA.
- Production-data QA: automatic approval review rejected creating persistent live test accounts/tickets/messages. No successful live mutation journey is claimed; explicit permission is required before retrying.
- Follow-up test-harness fix uses ESM imports; the booking-client test and lint were rerun successfully. No deployed application behavior changed.

SQLite service tests do not establish PostgreSQL concurrency behavior or real-device UI correctness. Prior release PostgreSQL tests remain separate historical evidence.

## Booking-date correction

The reported November 9 QA listing is dated 2030-11-09T08:30:00Z, not November 2026. The year is now explicit in cards/details. Shared registration-state checks gate event-card and sticky controls and direct checkout, including already-started, ended, completed, cancelled, closed, invalid-date and sold-out cases. An open page rechecks at start/end boundaries. Twelve Node regression cases passed; TypeScript and focused lint passed. Deployment verification is pending.

## External and deferred work

- Ticketmaster/OpenAgenda/publiq imports need usable host credentials/permissions and a verified import run. No keys are included in source and no importer is scheduled by this frontend change.
- Paid ticketing, payment-provider activation, refunds/settlement policy and AI inference remain outside the free-event release.
- Fresh real-provider Google signup/link/returning-login journeys require interactive provider verification; unit tests are not proof of live Google sign-in.
- Mobile viewport/accessibility, authenticated browser journeys and production error checks must be recorded before calling this release fully verified.
