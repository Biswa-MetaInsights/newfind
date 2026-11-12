# NewFind — Current State

Owner: **Biswajith Gopinathan (Biswa-MetaInsights)**. Reviewed 2026-11-12.

## Live frontend

Gautham's original PR 9 frontend was restored on branch `rollback/gautham-frontend`, source commit `d72f4b022e0db5ac121b6d9e9aa71c4652f7b602`. Production deployment `APq2aaEGNWqM72nViksqQhDvY4vE` became Ready and its homepage was visually verified at `https://www.newfind.events/`. The backend and databases were retained. The unintegrated restored frontend disables social login, stores checkout tickets locally and does not call several newer backend endpoints.

## Integration candidate

Branch `integration/gautham-live-features` reconnects existing backend capabilities while retaining the original hero, Roboto font, stylesheet and shared design. It restores the same-origin API proxy, social callbacks, recovery, persistent free booking/QR, organiser operations, event content, place discovery, profile, notification, conversation and community APIs. Help and About routes are added. It also includes the prepared OpenAgenda importer; importing or scheduling it is a separate host operation.

The candidate is not yet claimed live or completely browser-tested. Detailed evidence and boundaries are in `Eventmind_files/GAUTHAM_FRONTEND_INTEGRATION_QA.md`.

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
