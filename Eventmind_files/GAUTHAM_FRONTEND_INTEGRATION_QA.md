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
- Browser and production-domain evidence: pending candidate deployment.

SQLite service tests do not establish PostgreSQL concurrency behavior or real-device UI correctness. Prior release PostgreSQL tests remain separate historical evidence.

## External and deferred work

- Ticketmaster/OpenAgenda/publiq imports need usable host credentials/permissions and a verified import run. No keys are included in source and no importer is scheduled by this frontend change.
- Paid ticketing, payment-provider activation, refunds/settlement policy and AI inference remain outside the free-event release.
- Fresh real-provider Google signup/link/returning-login journeys require interactive provider verification; unit tests are not proof of live Google sign-in.
- Mobile viewport/accessibility, authenticated browser journeys and production error checks must be recorded before calling this release fully verified.
