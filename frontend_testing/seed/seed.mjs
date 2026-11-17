// DEV ONLY. NEVER DELETE. NEVER SHIP.
// Seeds a running backend with throwaway accounts (one per signed-in state) and one
// event per UI state (../fixtures/demo-data.mjs), books tickets, then writes every
// login to ../accounts.local.json (git-ignored). Undo it all with reset.mjs.
//
//   node frontend_testing/seed/seed.mjs                      # backend on :8000, this repo's backend/platform_dev.db
//   node frontend_testing/seed/seed.mjs --db="<path to the platform_dev.db the running backend uses>"
//
// Options: --api= (gateway, default http://localhost:8000) --event-service= (default :8003)
//          --web= (links, default http://localhost:3000) --db= --backend-env= --domain=
// Replaces backend/scripts/seed_events.py, which posts with a placeholder organiser
// the gateway now rejects.
import { existsSync } from "node:fs";
import { STATES, EVENTS } from "../fixtures/demo-data.mjs";
import {
  API, EVENT_SVC, WEB, DB_PATH, ACCOUNTS_FILE, call, register, organiserProfile, book,
  internalKey, openDb, hex, startRun, eventPayload as payload,
} from "./lib.mjs";

async function main() {
  // Preflight: the gateway answers, and the DB is the one it writes to (checked after the first create).
  await call("GET", "/event/search?limit=1");
  // No SQLite file (e.g. the Postgres runner): everything still seeds except the deleted-event state.
  const db = existsSync(DB_PATH) ? await openDb() : null;
  if (!db) console.log(`note     no SQLite file at ${DB_PATH}: skipping the "deleted" fixture; reset.mjs cannot clean up either`);
  const key = internalKey();
  const log = startRun("seed");
  console.log(`Seeding ${API} (DB ${DB_PATH})\n`);

  const accounts = {};
  for (const s of STATES) {
    const a = await register(s.label, s.role, s.name);
    log.addAccount(a, { state: s.state });
    if (s.profile) await organiserProfile(a);
    accounts[s.label] = a;
    console.log(`account  ${s.label.padEnd(22)} ${a.email}  (${s.state})`);
  }
  const organiser = accounts.organiser;

  // An organiser without a profile is refused by the gateway; record that it still is.
  const refused = await call("POST", "/event/", { token: accounts["organiser-no-profile"].token, expect: [403], body: payload(EVENTS[0], accounts["organiser-no-profile"].id) });
  console.log(`check    organiser-no-profile create -> ${refused.status} "${refused.data?.detail}" (expected 403)\n`);

  let dbChecked = false;
  for (const fx of EVENTS) {
    if (fx.delete && !db) continue;
    let event;
    if (fx.external) {
      if (!key) { console.log(`skip     ${fx.key.padEnd(22)} no INTERNAL_API_KEY (set it, or pass --backend-env=)`); continue; }
      ({ data: event } = await call("POST", `${EVENT_SVC}/events/ingest`, {
        headers: { "x-internal-key": key },
        body: { ...payload(fx, organiser.id), source: "ticketmaster", external_id: `nfseed-${hex(organiser.id).slice(0, 12)}`, event_website: fx.external },
      }));
    } else {
      ({ data: event } = await call("POST", "/event/", { token: organiser.token, body: payload(fx, organiser.id) }));
    }
    log.addEvent({ key: fx.key, id: event.id, title: fx.title, status: event.status, url: `${WEB}/event/${event.id}` });

    if (db && !dbChecked) {
      const row = db.prepare("select 1 from events where id = ?").get(hex(event.id));
      if (!row) throw new Error(`Event ${event.id} is not in ${DB_PATH}: that is not the database the backend on ${API} writes to. Pass --db=. (Run reset.mjs with the right --db to clean up.)`);
      dbChecked = true;
    }

    const notes = [];
    for (const label of fx.book ?? []) { await book(accounts[label], event.id); notes.push(`ticket for ${label}`); }
    if (fx.tryBook) {
      const r = await book(accounts[fx.tryBook], event.id, [503, 409]);
      notes.push(`paid booking refused ${r.status} "${r.data?.detail}"`);
    }
    if (fx.then) {
      await call("PATCH", `/event/${event.id}`, { token: organiser.token, body: fx.then });
      log.updateEvent(event.id, { status: fx.then.status });
      notes.push(`then ${JSON.stringify(fx.then)}`);
    }
    if (fx.delete) {
      // No API deletes an event. Remove the row only; the ticket stays, exactly the orphan
      // a real deletion would leave behind.
      db.prepare("delete from events where id = ?").run(hex(event.id));
      log.updateEvent(event.id, { status: "deleted (row removed; ticket kept)" });
      notes.push("event row deleted");
    }
    console.log(`event    ${fx.key.padEnd(22)} ${event.id}  ${notes.join("; ")}`);
  }
  db?.close();

  console.log(`\nLogins written to ${ACCOUNTS_FILE}`);
  console.log(`Organiser: ${organiser.email} / ${organiser.password}`);
  console.log("Undo with: node frontend_testing/seed/reset.mjs   (it reuses the --db recorded above)");
}

main().catch((e) => { console.error(`\nSEED FAILED: ${e.message}\nAnything created so far is listed in accounts.local.json; reset.mjs removes it.`); process.exit(1); });
