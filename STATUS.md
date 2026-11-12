# NewFind — Current State

Owner: **Biswajith Gopinathan (Biswa-MetaInsights)**. Reviewed 2026-11-12.

## Live frontend

The integrated Gautham design is live at `https://www.newfind.events/`, source commit `726a79f80e0d311047af5069bf874b6d97229831`, production deployment `7Udocu8Lk5njFevNjpcYJNSVfc4h` (Ready, 50-second build). The restored PR 9 hero, Roboto font, original stylesheet and component geometry are retained. The original unintegrated rollback remains `d72f4b022e0db5ac121b6d9e9aa71c4652f7b602` / deployment `APq2aaEGNWqM72nViksqQhDvY4vE`.

The frontend reconnects the existing API proxy, social callbacks, recovery, persistent free booking/private QR, organiser operations, event content, place discovery, profile, notification, conversation and community APIs. Help and About routes work. Prepared OpenAgenda importer code is included in the repository but has not been installed or run on the backend host. Production backend containers and database schemas are unchanged.

## Verification and blockers

56 isolated automated tests passed; one optional restic test was skipped. The actual TypeScript booking client passed retry/restart/account-isolation checks against isolated running services. Production build and TypeScript passed. ESLint has no errors and four existing warnings. A follow-up commit converts the test harness to ESM; it does not change the deployed application.

Desktop browser verification confirms the original hero/font, sign-in header/photo/home link, live Help page, API-backed Leuven search and an enabled Google button. Production `/api/auth/capabilities` returns Google/recovery/verification enabled and Facebook disabled.

The owner selected Google and reached consent and the live NewFind callback. That email already has a password account, so explicit linking is required. Password sign-in then returned `Incorrect username or password`. Password recovery and subsequent Dashboard → Profile linking require the owner's input. This is not evidence of a completed Google session.

Automatic approval review rejected the separate production-data QA run because it would create persistent live accounts, tickets and messages. It must not be rerun without explicit permission for those records. Device emulation is blocked by the organisation's DevTools policy. Normal browser zoom provides a narrow CSS viewport for geometry checks: at 454 px the event-heading location panel started at x=-104 px. A viewport-bounded scrollable picker with a mobile Close button is prepared; deployment validation and authenticated browser journeys remain pending. Detailed evidence is in `Eventmind_files/GAUTHAM_FRONTEND_INTEGRATION_QA.md`.

## Backend and operations

The existing isolated NewFind backend has persistent accounts/profiles, native event creation and lifecycle, geographic search, free booking, owner-scoped attendees/check-in, conversations, communities/reviews and notification/email outbox support. Prior live release and restart tests are historical evidence; this frontend rollout does not replace backend containers or alter schemas.

Google provider configuration was previously activated and one real login/session was verified before the frontend rollback. Reconnecting a button is not evidence that a new signup, linking or returning-login journey works on the new candidate. Facebook remains disabled until configured.

Local backups and health checks were previously activated; paid off-server backups remain deferred. TalktoFile and unrelated host workloads must remain untouched.

## Remaining activation and evidence

- External event providers require valid private host credentials/permissions and a verified import/refresh. No live catalogue activation is claimed.
- Paid tickets, Stripe completion/webhooks, ticket tiers, refunds/settlements and paid AI inference are not released.
- Real-device/mobile/accessibility, authenticated browser journeys, Google provider flows and production concurrency/error observations remain distinct from isolated automated checks.

## Deployment boundaries

Use the existing Vercel NewFind project and `www.newfind.events` domain. Keep Gautham's design. Preserve the existing NewFind backend, private databases/Redis, Compose isolation and unrelated TalktoFile services. Never publish secrets or restore a backup over live records as part of a frontend release.
