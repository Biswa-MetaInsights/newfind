# NewFind — Current State

Last reviewed: 2026-11-27

## Frontend release

The current production baseline is 7cfe2fa974293ce3504903ea32c3983fed05444d, assigned to www.newfind.events. It retains Gautham's design, same-origin backend routing and the privacy and terms pages. Bank name and account number are optional at organiser registration.

Session-recovery release 0c66a7af993adad6c4c2f6054847226043d903cd is live on www.newfind.events (Vercel DwSxoGsxYVP8HKQZifFdWLqaLLtH, Ready). A live browser confirmed that the previously failing dashboard redirects its expired session to sign-in and displays a clear explanation. Bank fields are labelled optional. Backend containers and database schemas are unchanged.

Cancelling an event puts it in the organiser console’s Archived tab. Public discovery and share previews omit it. An attendee following an existing link sees a cancellation notice. Existing ticket and cancellation history is retained.

## Verification

61 automated tests passed across the session client/store, event registration rules and isolated gateway/service journeys. One optional backup test was skipped. The TypeScript check, production build and focused lint passed; one existing Navbar warning remains. The shipping TypeScript booking client passed booking/retry/restart/account-isolation checks against isolated services. Live read-only checks passed for discovery and the public application pages.

Detailed coverage and limitations are in Eventmind_files/NEWFIND_QA_20261127.md. Automated test results do not constitute a full live-production or real-device sign-off.

## Remaining work

Live organiser registration, event creation and booking still need verification. The requested live organiser submission awaits approval of the exact contact/address details. No production test accounts, tickets or messages were created during this run. Mobile touch, real-device and production concurrency tests remain open. Facebook sign-in, paid checkout and external catalogue activation are not part of this correction.

Communities remain parked for Phase 2. Gautham's UI and existing backend permission checks are preserved. Other hosted applications are unchanged.
