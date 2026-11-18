// DEV ONLY. NEVER DELETE. NEVER SHIP.
// Screenshots the navbar bell's dropdown in each state by answering
// GET /event/notifications from CDP instead of the backend.
//
//   node frontend_testing/cdp/bell.mjs [--as=participant] [--out=<dir>] [--base=http://localhost:3000]
//
// Needs a seeded account to sign in with (seed.mjs), because the bell only renders signed in.
// States: empty, unread, read, loading (request never answered), error (HTTP 500; the
// dropdown shows it only after react-query's 3 retries, ~7 s).
import { args, account, seededEvent } from "../seed/lib.mjs";
import { withBrowser, newPage } from "./cdp.mjs";

const href = (key) => (seededEvent(key) ? `/event/${seededEvent(key).id}` : "/explore");
const hoursAgo = (h) => new Date(Date.now() - h * 3600e3).toISOString();
const items = (read) => [
  { id: "00000000-0000-4000-8000-000000000001", kind: "cancelled", title: "[Seed] Cancelled · Rooftop cinema: cancelled", body: "The organiser updated [Seed] Cancelled · Rooftop cinema. Please review the latest event details.", href: href("cancelled"), created_at: hoursAgo(1), read_at: read ? hoursAgo(0.5) : null },
  { id: "00000000-0000-4000-8000-000000000002", kind: "rescheduled", title: "[Seed] Hybrid · Climate policy panel: rescheduled", body: "The organiser updated [Seed] Hybrid · Climate policy panel. Please review the latest event details.", href: href("hybrid"), created_at: hoursAgo(5), read_at: read ? hoursAgo(4) : null },
  { id: "00000000-0000-4000-8000-000000000003", kind: "ticket_issued", title: "Your ticket is confirmed", body: "[Seed] Free · Brussels jazz evening — open your dashboard to view the ticket and QR code.", href: href("free"), created_at: hoursAgo(26), read_at: hoursAgo(25) },
];
const STATES = {
  empty: { answer: { json: { items: [], unread_count: 0 } }, expect: "No notifications yet" },
  unread: { answer: { json: { items: items(false), unread_count: 2 } }, expect: "Rooftop cinema" },
  read: { answer: { json: { items: items(true), unread_count: 0 } }, expect: "Rooftop cinema" },
  loading: { answer: "hold", expect: "Loading notifications" },
  error: { answer: { status: 500, json: { detail: "Mocked failure (frontend_testing/cdp/bell.mjs)" } }, expect: "could not be loaded", wait: 20000 },
};

await withBrowser(async (browser) => {
  const who = await account(args.as ?? "participant");
  const only = args.only ? String(args.only).split(",") : Object.keys(STATES);
  for (const name of only) {
    const s = STATES[name];
    const page = await newPage(browser, { auth: who });
    await page.mock("/event/notifications", (req) => (req.method === "GET" && !req.url.includes("/read") ? s.answer : null));
    await page.goto("/", 1000);
    const bell = await page.waitFor(`!!document.querySelector('button[aria-label="Notifications"]')`, 20000);
    if (!bell) { console.log(`FAIL  ${name}: no bell in the navbar (signed out?)`); continue; }
    await page.eval(`document.querySelector('button[aria-label="Notifications"]').click()`);
    const ok = await page.waitFor(`document.querySelector('section[aria-label="Notifications"]')?.textContent.includes(${JSON.stringify(s.expect)})`, s.wait ?? 8000);
    const badge = await page.eval(`document.querySelector('button[aria-label="Notifications"] span')?.textContent ?? ""`);
    const file = await page.shot(`bell-${name}`);
    console.log(`${ok ? "ok  " : "FAIL"}  ${name.padEnd(8)} badge="${badge}"  ${file}`);
  }
});
