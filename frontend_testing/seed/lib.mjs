// DEV ONLY. NEVER DELETE. NEVER SHIP.
// Shared helpers for seed.mjs, reset.mjs, ../cdp/*.mjs and ../chat-demo/run.mjs.
// Plain Node 22+ (built-in fetch, WebSocket and node:sqlite); no npm dependency.
import { existsSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { randomBytes, randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";

// node:sqlite still prints an ExperimentalWarning on Node 24; it is noise here.
process.removeAllListeners("warning");

export const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.join(HERE, ".."); // repo-root frontend_testing/
export const REPO = path.join(ROOT, "..");
export const ACCOUNTS_FILE = path.join(ROOT, "accounts.local.json"); // git-ignored

export const args = Object.fromEntries(
  process.argv.slice(2).filter((a) => a.startsWith("--")).map((a) => {
    const i = a.indexOf("=");
    return i < 0 ? [a.slice(2), true] : [a.slice(2, i), a.slice(i + 1)];
  }),
);

/** The gateway every frontend talks to (NEXT_PUBLIC_API_URL). */
export const API = args.api ?? process.env.NF_API ?? "http://localhost:8000";
/** The event service itself: only /events/ingest (external listings) goes here, the gateway refuses it. */
export const EVENT_SVC = args["event-service"] ?? process.env.NF_EVENT_SERVICE ?? "http://localhost:8003";
/** The user service itself: only the internal profile route (see ensureProfile). */
export const USER_SVC = args["user-service"] ?? process.env.NF_USER_SERVICE ?? "http://localhost:8002";
/** Which web app the printed links point at. */
export const WEB = args.web ?? process.env.NF_WEB ?? "http://localhost:3000";
/**
 * The SQLite file the RUNNING backend writes to. Needed only for what no API can do:
 * deleting an event (the "deleted event" scenario) and the reset. It must be the file the
 * services on :8000 actually use (their working directory decides it), not just any copy;
 * seed.mjs checks this before it deletes anything.
 */
export const DB_PATH = path.resolve(args.db ?? process.env.NF_DB ?? path.join(REPO, "backend", "platform_dev.db"));
/** Backend .env, read only for INTERNAL_API_KEY (external-listing fixture). Never printed. */
export const BACKEND_ENV = path.resolve(args["backend-env"] ?? process.env.NF_BACKEND_ENV ?? path.join(path.dirname(DB_PATH), "..", ".env"));
/** Throwaway address domain. gmail.com because the auth service 422s reserved TLDs (.test, .example). */
export const DOMAIN = args.domain ?? process.env.NF_SEED_DOMAIN ?? "gmail.com";
/** Every seeded address starts with this, so `reset --orphans` can find them without the accounts file. */
export const EMAIL_PREFIX = "nfseed.";

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const hex = (uuid) => String(uuid).replaceAll("-", "").toLowerCase(); // how SQLite stores UUIDs
export const subOf = (token) => JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString()).sub;

export async function call(method, url, { token, body, headers = {}, expect = [200, 201] } = {}) {
  const r = await fetch(url.startsWith("http") ? url : API + url, {
    method,
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}), ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await r.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  if (!expect.includes(r.status)) throw new Error(`${method} ${url} -> ${r.status} ${text.slice(0, 300)}`);
  return { status: r.status, data };
}

export async function login(email, password) {
  const { data } = await call("POST", "/auth/login", { body: { email, password } });
  return data; // { access_token, ... } — the shape the web app persists
}

/** Register a throwaway account and sign it in. role: "user" | "organizer". */
export async function register(label, role, fullName) {
  const email = `${EMAIL_PREFIX}${label}.${randomBytes(3).toString("hex")}@${DOMAIN}`;
  const password = `Seed-${randomBytes(6).toString("hex")}`;
  await call("POST", "/auth/register", { body: { email, password, full_name: fullName, role } });
  const tokens = await login(email, password);
  const a = { label, role, email, password, full_name: fullName, id: subOf(tokens.access_token), token: tokens.access_token };
  await ensureProfile(a);
  return a;
}

/**
 * Registration creates the participant profile (name shown in chat, dashboard Profile tab)
 * synchronously ONLY when the auth service runs with KAFKA_ENABLED=false, as docker-compose
 * sets it. A backend started outside Docker without that flag hands it to Kafka, nothing
 * consumes it locally, and the account has no profile: /user/<id> and chat posts 404.
 * Create it the same way registration would. Warns once so the cause stays visible.
 */
let warnedProfile = false;
export async function ensureProfile(a) {
  const { status } = await call("GET", `/user/${a.id}`, { token: a.token, expect: [200, 404] });
  if (status === 200) return;
  const key = internalKey();
  if (!key) throw new Error(`No profile for ${a.email} and no INTERNAL_API_KEY to create one (pass --backend-env=).`);
  await call("POST", `${USER_SVC}/users/internal/profile`, { headers: { "x-internal-key": key }, expect: [201], body: { user_id: a.id, full_name: a.full_name } });
  if (!warnedProfile) { console.log("note     backend did not create profiles on register (KAFKA_ENABLED is not false); the seed creates them"); warnedProfile = true; }
}

export async function organiserProfile(account) {
  await call("POST", `/user/${account.id}/organizer`, {
    token: account.token,
    body: {
      full_name: account.full_name, company_name: "Seed Events BV", company_address: "Rue de la Loi 16, 1000 Brussels",
      company_email: account.email, contact_email: account.email, country: "Belgium",
      registration_number: "BE0123456789", bank_name: "Seed Bank", bank_account_number: "BE68539007547034",
    },
  });
}

export async function book(account, eventId, expect = [201]) {
  return call("POST", "/ticket/book", {
    token: account.token, expect,
    body: { event_id: eventId, user_id: account.id, quantity: 1, request_id: randomUUID() },
  });
}

export function internalKey() {
  if (process.env.INTERNAL_API_KEY) return process.env.INTERNAL_API_KEY;
  if (!existsSync(BACKEND_ENV)) return "";
  const line = readFileSync(BACKEND_ENV, "utf8").split(/\r?\n/).find((l) => l.startsWith("INTERNAL_API_KEY="));
  return line ? line.slice("INTERNAL_API_KEY=".length).trim().replace(/^["']|["']$/g, "") : "";
}

export async function openDb() {
  if (!existsSync(DB_PATH)) throw new Error(`No SQLite file at ${DB_PATH}. Pass --db=<the platform_dev.db the running backend uses>.`);
  const { DatabaseSync } = await import("node:sqlite");
  const db = new DatabaseSync(DB_PATH);
  db.exec("PRAGMA busy_timeout = 5000"); // the services hold the same file open
  return db;
}

// ── Time ─────────────────────────────────────────────────────────────────────
function offsetMs(utcMs, tz) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(new Date(utcMs)).map((x) => [x.type, x.value]));
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - utcMs;
}
/** `days` from today, at wall-clock `hhmm` in `tz` (what an organiser types), as a UTC Date. */
export function wallClock(days, hhmm, tz) {
  const d = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" })
    .formatToParts(new Date(Date.now() + days * 864e5)).map((x) => [x.type, x.value]));
  const [h, m] = hhmm.split(":").map(Number);
  const guess = Date.UTC(+d.year, +d.month - 1, +d.day, h, m);
  return new Date(guess - offsetMs(guess - offsetMs(guess, tz), tz)); // second pass settles a DST edge
}

/** POST /event/ body for a fixture (../fixtures/demo-data.mjs shape), mirroring what /organizer/create sends. */
export function eventPayload(fx, organizerId) {
  const start = fx.start.minutes !== undefined ? new Date(Date.now() + fx.start.minutes * 60e3) : wallClock(fx.start.days, fx.start.time, fx.tz);
  const end = new Date(start.getTime() + fx.hours * 3600e3);
  const type = fx.type ?? "In-Person";
  return {
    organizer_id: organizerId, title: fx.title, category: fx.category, event_type: type,
    description: fx.description ?? `Demo event seeded by frontend_testing for the "${fx.key}" state. See frontend_testing/fixtures/CHECKLIST.md.`,
    location: { event_type: type, ...fx.location, ...(fx.extraLocation ?? {}), ...(type === "Online" ? { latitude: null, longitude: null } : {}) },
    tags: ["seed", fx.key], language: "English", timezone: fx.tz,
    start_date: start.toISOString(), end_date: end.toISOString(),
    capacity: fx.capacity, price: fx.price, currency: "EUR", status: fx.status ?? "published",
  };
}

// ── accounts.local.json ──────────────────────────────────────────────────────
// { runs: [ { kind, createdAt, api, db, accounts: [...], events: [...] } ] }
// Written after EVERY create, so a crash half-way still leaves reset.mjs a complete list.
export function loadAccounts() {
  return existsSync(ACCOUNTS_FILE) ? JSON.parse(readFileSync(ACCOUNTS_FILE, "utf8")) : { runs: [] };
}
export function startRun(kind) {
  const file = loadAccounts();
  const run = { kind, createdAt: new Date().toISOString(), api: API, web: WEB, db: DB_PATH, accounts: [], events: [] };
  file.runs.push(run);
  const save = () => writeFileSync(ACCOUNTS_FILE, JSON.stringify(file, null, 2) + "\n");
  save();
  return {
    run,
    addAccount(a, extra = {}) { const { token, ...stored } = a; run.accounts.push({ ...stored, ...extra }); save(); },
    addEvent(e) { run.events.push(e); save(); },
    updateEvent(id, patch) { Object.assign(run.events.find((e) => e.id === id), patch); save(); },
  };
}
export function removeAccountsFile() { rmSync(ACCOUNTS_FILE, { force: true }); }
/** Find a seeded account by label in the newest run that has it, and sign it in. */
export async function account(label) {
  const runs = loadAccounts().runs;
  for (let i = runs.length - 1; i >= 0; i--) {
    const a = runs[i].accounts.find((x) => x.label === label);
    if (a) return { ...a, tokens: await login(a.email, a.password) };
  }
  throw new Error(`No "${label}" account in ${ACCOUNTS_FILE}; run frontend_testing/seed/seed.mjs first.`);
}
export function seededEvent(key) {
  const runs = loadAccounts().runs;
  for (let i = runs.length - 1; i >= 0; i--) {
    const e = runs[i].events.find((x) => x.key === key);
    if (e) return e;
  }
  return null;
}
