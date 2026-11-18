// DEV ONLY. NEVER DELETE. NEVER SHIP.
// Screenshots the seeded signed-in states, the deleted-event case and the time-zone case.
//
//   node frontend_testing/cdp/scenarios.mjs [--only=states,deleted,timezone] [--out=<dir>] [--base=…]
//
// states   one page per seeded account (see fixtures/CHECKLIST.md), plus a logged-out run
// deleted  the ticket-holder whose event row was removed: /dashboard?tab=tickets
// timezone the Brussels and Tokyo events with the BROWSER in India (Asia/Kolkata) and in
//          Brussels; the event page should keep the venue's wall clock, whatever the browser says
import { args, account, seededEvent } from "../seed/lib.mjs";
import { withBrowser, newPage } from "./cdp.mjs";

const only = new Set(args.only ? String(args.only).split(",") : ["states", "deleted", "timezone"]);
const ALERTS = `JSON.stringify([...document.querySelectorAll('[role="alert"]')].map(e => e.textContent.trim()).filter(Boolean).slice(0, 3))`;
const TIMES = `JSON.stringify([...new Set((document.querySelector('main') ?? document.body).innerText.match(/[^\\n]{0,40}\\b\\d{1,2}[:.]\\d{2}\\b[^\\n]{0,40}/g) ?? [])].slice(0, 4))`;

async function visit(browser, name, route, opts = {}) {
  const page = await newPage(browser, opts);
  await page.goto(route, 7000);
  const landed = await page.eval("location.pathname + location.search");
  const file = await page.shot(name);
  return { page, landed, file };
}

await withBrowser(async (browser) => {
  if (only.has("states")) {
    for (const [label, route] of [
      ["organiser", "/organizer/events"],
      ["organiser-no-profile", "/organizer/create"],
      ["participant", "/dashboard?tab=tickets"],
      ["new-user", "/dashboard?tab=tickets"],
      [null, "/dashboard?tab=tickets"], // logged out
    ]) {
      const auth = label ? await account(label) : undefined;
      const { page, landed, file } = await visit(browser, `state-${label ?? "logged-out"}`, route, { auth });
      console.log(`state     ${(label ?? "logged-out").padEnd(22)} ${route} -> ${landed}  alerts=${await page.eval(ALERTS)}  ${file}`);
    }
  }
  if (only.has("deleted")) {
    const { page, landed, file } = await visit(browser, "deleted-event-tickets-tab", "/dashboard?tab=tickets", { auth: await account("deleted-ticket-holder") });
    const text = await page.eval(`(document.querySelector('main') ?? document.body).innerText.replace(/\\s+/g, ' ').slice(0, 300)`);
    console.log(`deleted   ${landed}  alerts=${await page.eval(ALERTS)}\n          text: ${text}\n          ${file}`);
  }
  if (only.has("timezone")) {
    for (const key of ["free", "tokyo"]) {
      const ev = seededEvent(key);
      if (!ev) { console.log(`timezone  no "${key}" event seeded`); continue; }
      for (const tz of ["Asia/Kolkata", "Europe/Brussels"]) {
        const { page, file } = await visit(browser, `timezone-${key}-browser-${tz.split("/")[1]}`, `/event/${ev.id}`, { timezone: tz });
        console.log(`timezone  ${key.padEnd(6)} browser=${tz.padEnd(16)} ${await page.eval(TIMES)}  ${file}`);
      }
    }
  }
});
