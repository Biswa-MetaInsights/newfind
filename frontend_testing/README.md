# frontend_testing: dev-only test tooling for the web app

**DEV ONLY. NEVER DELETE. NEVER SHIP.** See [`DO_NOT_DELETE.md`](DO_NOT_DELETE.md).

Everything you need to put the web app into a state you want to look at: dev flags, a dev banner,
the dummy-data fixtures, seed scripts and request mocks. It lives in two places:

| Where | What | Why there |
|---|---|---|
| `frontend_testing/` (repo root, this folder) | `seed/` (accounts, events, tickets, reset), `fixtures/` (live-seed demo data + `CHECKLIST.md`), `cdp/` (mocks and scenario screenshots), `chat-demo/`, `MAILPIT.md` | Never imported by the app, so it cannot reach a bundle |
| `frontend_react/apps/web/src/frontend_testing/` | `dev-flags.ts`, `BypassStrip.tsx`, `DevBanner.tsx`, `fixtures/` | Imported by pages, so it has to be inside the Next app |

## The rules

1. **Every flag is `process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_… === "true"`**
   and lives in `src/frontend_testing/dev-flags.ts`. The `NODE_ENV` half means a production build
   cannot turn it on, even if someone sets the variable in a deploy environment. No developer-email
   allowlists (they would ship in the bundle).
2. **The guard enforces this.** `apps/web/scripts/check-frontend-testing.mjs` runs first in
   `pnpm --filter @eventmind/web type-check` and fails if either folder or a required file is
   missing, if a flag loses its `NODE_ENV` half, or if a `NEXT_PUBLIC_SKIP_*` / `NEXT_PUBLIC_DEV_*`
   variable is read anywhere outside `dev-flags.ts`.
3. **Kept out of the backend image** by `.dockerignore`. Generated logins (`accounts.local.json`)
   are git-ignored.
4. **Set flags in `frontend_react/apps/web/.env.local` only**, which is git-ignored. Never commit it.

## Dev flags

**Default (Gautham, 2026-11-17): `NEXT_PUBLIC_DATA_MODE=real` and every flag below `false`.** Anyone opening the page sees the real page with real data. Turn a flag on only when Gautham says "frontend testing", and turn it back off afterwards.

Set in `apps/web/.env.local`, then restart `next dev` (`NEXT_PUBLIC_*` values are inlined at start).

| Variable | Effect when `true` (development only) |
|---|---|
| `NEXT_PUBLIC_SKIP_ORGANIZER_VERIFICATION` | `/organizer/create` opens without an organiser profile; `/organizer/onboarding` stops redirecting to it; both show the terracotta **bypass strip** linking to each other, and create's back arrow goes to onboarding. Skips the *check*, not the requirement: a real-mode submit without a profile can still be refused by the backend. |
| `NEXT_PUBLIC_DEV_SHOW_EVENT_ASSISTANT` | Shows the AI event assistant on `/event/[id]` in **real** data mode too (product shows it in dummy mode only). Needs `OPENAI_API_KEY` in the backend `.env`. |

The **dev banner** (`DevBanner.tsx`) is **parked since 2026-11-17**: the file stays, but `app/layout.tsx` no longer
mounts it. Uncomment the import and the render there to bring it back (one line above every page, `next dev` only).

## Dummy vs real data mode

`NEXT_PUBLIC_DATA_MODE` in `apps/web/.env.local` (restart after changing):

- **`real`** (default when unset): everything goes to the backend via the gateway.
- **`dummy`**: reads come from `src/frontend_testing/fixtures/` (`events.ts`, `organizer.ts`,
  `communities.ts`) with no backend needed; event create / edit / duplicate write to the fixtures in
  memory (lost on reload). **Still live in dummy mode:** sign-in, paid checkout and reviews.

The `isDummyMode` branches stay in `src/lib/data-source.ts` and the components; they are product code
paths. Details and gotchas: `HANDOVER.md` → *Dummy vs real data mode*.

## Seeding a real backend

Plain Node 22+ scripts (built-in `fetch`, `WebSocket`, `node:sqlite`), no dependency. Run them from
the repo root **in PowerShell** (the CDP ones launch headless Chrome, which is unreliable under Git
Bash). The backend and, for the CDP scripts, the dev server must already be running.

```powershell
node frontend_testing/seed/seed.mjs --db="<the platform_dev.db the running backend uses>"
node frontend_testing/seed/reset.mjs        # removes everything the seed and chat demo created
```

- **What it creates:** one throwaway account per signed-in state and one event per UI state, both
  defined in `fixtures/demo-data.mjs`; what each is for and where to look: `fixtures/CHECKLIST.md`.
  Logins go to `accounts.local.json` (git-ignored), rewritten after every step so a crash still
  leaves `reset.mjs` a full list. `reset.mjs --orphans` also sweeps any `nfseed.*` account the file lost.
- **`--db` must be the file the running services write to**, because two things have no API and go
  straight to SQLite: deleting an event (the deleted-event state) and the reset. Their working
  directory decides it, so check which repo's `backend/` they were started from. The seed refuses to
  continue if its first event is not in that file. The run records the path; `reset.mjs` reuses it.
- **Other options:** `--api=` (gateway, `:8000`), `--event-service=` (`:8003`, only for the external
  listing, which the gateway refuses), `--user-service=` (`:8002`), `--web=` (links), `--domain=`
  (address domain; default `gmail.com`, because the auth service 422s `.test`/`.example`).
  `INTERNAL_API_KEY` is read from the backend `.env` beside the DB, or the env var, and never printed.
- **Profiles:** a backend started outside Docker without `KAFKA_ENABLED=false` creates no participant
  profile on registration, so `/user/<id>` and chat posts 404 for every new account. The seed creates
  the profile the way registration would and prints a note when it had to.
- Replaces `backend/scripts/seed_events.py`, which posts as a placeholder organiser the gateway now
  rejects. That script is left in place, unused.

## Mocks, scenarios and screenshots

Shared plumbing is `cdp/cdp.mjs` (Chrome launch, CDP class and sign-in injection copied from
`apps/web/scripts/responsive-sweep.mjs`; keep the two in step). Screenshots go to
`frontend_testing/shots/` (git-ignored) unless you pass `--out=`. `--base=` changes the web app URL.

| Command | What it shows |
|---|---|
| `node frontend_testing/cdp/bell.mjs [--as=participant]` | Navbar bell dropdown with `GET /event/notifications` answered by CDP: empty, unread, read, loading, error |
| `node frontend_testing/cdp/social.mjs` | `/auth` with `GET /auth/capabilities` mocked to `{google: true, facebook: true}`, beside the real disabled buttons |
| `node frontend_testing/cdp/scenarios.mjs [--only=states,deleted,timezone]` | Each seeded signed-in state plus a logged-out run; the deleted-event Tickets tab; Brussels/Tokyo events with the browser in India vs Brussels |
| `node frontend_testing/chat-demo/run.mjs --db=…` | Two throwaway accounts, two free Brussels events, the same conversation on New page `/chat/<id>` (`:3000`) and Old page `/chat/<id>` (`--old=`, default `:3002`) |

The bell, scenarios and chat demo sign in as seeded accounts, so seed first.

## Signed-in responsive sweep (throwaway login)

```powershell
node frontend_testing/seed/seed.mjs --db="…"
$a = (Get-Content frontend_testing/accounts.local.json -Raw | ConvertFrom-Json).runs.accounts | Where-Object label -eq 'organiser' | Select-Object -Last 1
cd frontend_react; pnpm --filter @eventmind/web sweep -- --email=$($a.email) --password=$($a.password)
```

Use `organiser` to reach the console routes, `participant` for a populated dashboard. Reset afterwards.

## Mail

Local SMTP with Mailpit, for forgot-password, verification and event-change emails: `MAILPIT.md`.

## Open question

**How is the frontend deployed?** Unconfirmed (2026-11-17). `STATUS.md` → *Deployment boundaries* says Vercel;
Gautham half-remembers a manual Hetzner deploy but is not sure; Biswajith knows (question recorded in
`Eventmind_files/backend_to-do.md` §9). Nothing in this root folder is imported by the app, so it cannot
appear in a bundle. Whatever the method, do not copy `frontend_testing/` (it holds `accounts.local.json`,
local test logins) or `.env.local` to the server.
