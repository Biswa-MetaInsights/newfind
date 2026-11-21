# Local mail with Mailpit (dev only)

**DEV ONLY. NEVER DELETE. NEVER SHIP.** Not installed by any script here: these are the steps and
values to do it by hand when you want to test mail end to end.

Mailpit is a local SMTP server that keeps every message it receives and shows it in a web inbox.
Nothing it receives is forwarded anywhere, so any recipient (including the seed's `nfseed.*@gmail.com`
addresses) lands in the local inbox only.

## What it lets you test

| Flow | Page | Sent by |
|---|---|---|
| Forgot password → reset link | `/forgot-password` → `/reset-password#token=…` | auth service, `account_mail_outbox` worker (`recovery.py` `send_pending`) |
| Email verification | `/verify-email#token=…` (requested signed in via `POST /auth/request-verification`) | same worker |
| Event changed / cancelled / announcement | the email for a bell notification | event service, `event_mail_outbox` worker (`workspace.py` `send_event_mail`) |

Without SMTP configured, `/auth/capabilities` reports `email_recovery: false`, `/auth/forgot-password`
answers 503 "Email recovery is not configured yet", and both outboxes just accumulate rows.

## 1. Run Mailpit (pick one)

- **Docker:** `docker run -d --name mailpit -p 1025:1025 -p 8025:8025 axllent/mailpit`
- **Binary:** download the Windows build from the Mailpit GitHub releases page, unzip, run `mailpit.exe`
  (defaults: SMTP on `1025`, inbox on `8025`).

Inbox: <http://localhost:8025>.

## 2. Backend env values

Add to the backend's `.env` (the repo-root `.env` the services load; git-ignored, never commit it):

```env
SMTP_HOST=127.0.0.1
SMTP_PORT=1025
SMTP_FROM=no-reply@newfind.example.org
SMTP_LOCAL_TEST=true
APP_PUBLIC_URL=http://localhost:3000
# leave SMTP_USERNAME / SMTP_PASSWORD unset: Mailpit needs no login
```

Why each one (`backend/shared/mail.py`):

- `SMTP_HOST` + `SMTP_FROM` + `APP_PUBLIC_URL` together are what `ready()` checks; any one missing and
  mail stays off. `APP_PUBLIC_URL` is the base of every link in the messages.
- `SMTP_LOCAL_TEST=true` only takes effect when `SMTP_HOST` is `127.0.0.1`/`localhost`. It skips
  STARTTLS (Mailpit has no certificate) and lets reserved test domains (`example.org`, `.test`, …)
  through. It cannot enable anything against a real server.
- Port `465` would switch to implicit TLS; keep `1025`.

Then **restart the backend services** (env is read at start-up). Check:
`GET http://localhost:8000/auth/capabilities` should now say `"email_recovery": true`.

## 3. Try it

1. `node frontend_testing/seed/seed.mjs` (or use any account you know the password for).
2. `/forgot-password` → enter a seeded address from `accounts.local.json` → the message appears in
   Mailpit → follow the link (it opens on `:3000`).
3. Event mail: the seed already cancelled one event with a ticket-holder, which queued one
   `event_mail_outbox` row for the participant; once SMTP is up the event service's worker sends it.

## ⚠️ Before pointing SMTP anywhere real

Run `node frontend_testing/seed/reset.mjs` first. Pending outbox rows addressed to seeded accounts
would otherwise be delivered, and `nfseed.*@gmail.com` addresses are random but real-looking.
For the same reason, seed with `--domain=<a domain you control>` against anything but Mailpit.
