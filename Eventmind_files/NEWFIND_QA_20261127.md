# NewFind regression verification — 27 November 2026

## Release decision

Session recovery correction is ready for deployment after automated checks. Live organiser submission, full live event creation/booking and real-device mobile journeys remain unverified. Paid checkout is unavailable.

## Confirmed defects

| Finding | Evidence | Correction |
|---|---|---|
| Account appears signed in with an invalid session | Live dashboard showed the account menu and “Tickets could not be loaded. Please refresh or sign in again.” Browser evidence recorded 401 for /api/auth/me, /api/event/rooms and /api/event/notifications. | Check stored token expiry during hydration; clear only the matching session after protected API 401; show a sign-in explanation. Server authentication remains authoritative. |
| A late request can finish after a newer sign-in | Regression simulates an old request returning 401 after replacing the session. | Ignore failures carrying an older token. |
| Organiser JWT decoding assumes ordinary base64 | Onboarding/create/navbar/console helpers passed the JWT payload directly to atob. | Normalize base64url characters before decoding. |
| Optional bank fields have no annotation | Live organiser form showed bank fields without an optional label. | Use the shared FormField optional prop; preserve blank-string API fields. |

## Verification

| Layer | Result | Coverage |
|---|---|---|
| Actual API client + Zustand session store + application configuration | 11 passed | Expired/malformed/missing persisted token, valid reload, protected 401, login/provider errors, 403, old-session race, damaged browser storage, successful sign-in. |
| Registration/date rules | 12 passed | Future/past, exact start/end, offsets, invalid dates, lifecycle statuses, sold-out and external inventory. |
| Isolated gateway and real services | 37 passed, 1 skipped | Accounts/profiles, blank-bank organiser registration, event creation/lifecycle/editing, geographic discovery, booking/retry/capacity/private tickets, owner permissions, check-in, notifications/chat, simulated social callbacks, migration and release checks. |
| Shipping TypeScript booking client against isolated services | 1 passed | Blank-bank registration, free event creation, booking, idempotent retry, ticketing restart, reload, separate-account isolation. |
| Compiler/build/lint | Passed | TypeScript, Next production build, focused ESLint (one existing Navbar warning). |
| Live read-only | Passed | Auth capabilities and event search 200; unauthenticated protected requests 401; auth/create/privacy/terms pages 200. Browser Brussels location selection, Explore link and clear-filter interaction worked. |

61 automated tests passed and one optional restic backup test was skipped. Counts combine separate runs and represent test functions, not browser scenarios.

## Reproduction

From frontend_react:

```sh
node apps/web/scripts/session-regression.test.mjs
node apps/web/scripts/registration-state.test.mjs
pnpm --filter @eventmind/web type-check
pnpm --filter @eventmind/web build
```

Backend snapshot: retained deployment/hetzner-backend commit 55afae90a2106d837077b026d67b443616eee414 in a separate worktree. The core test used empty synthetic bank fields. A local additional test invoked the shipping apps/web/scripts/booking-contract.mjs against the fixture gateway and checked retry/restart/account isolation. It passed. Temporary SQLite databases, generated signing/internal keys and localhost services were used; no production accounts or records were created. This does not prove the remote host is byte-identical or verify PostgreSQL concurrency.

```sh
python -m pytest backend/tests/test_core_integration.py backend/tests/test_operations.py backend/tests/test_release_features.py backend/tests/test_social_oauth.py backend/tests/test_google_config.py backend/tests/test_user_migration.py -q
```

## Limits and blockers

- Production organiser submission was blocked by the prior automatic approval review pending approval of the exact contact/address details. No real company registration success is claimed.
- Real-device mobile/touch, production concurrency and long-duration browser sessions remain unverified.
- Social callback tests simulate provider responses. Real Google consent/linking was not completed in this run; Facebook remains disabled.
- Paid payments and external catalogue activation are outside this release.
- Expired sessions require signing in again. No refresh-token endpoint is assumed or added. Unsaved form entries are not restored after expiry.
- Backend containers, schemas, unrelated apps, Gautham's design and permission checks remain unchanged.

## Deployment

Candidate production assignment and live expiry recovery confirmation pending.
