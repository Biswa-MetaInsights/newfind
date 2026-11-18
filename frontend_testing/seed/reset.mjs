// DEV ONLY. NEVER DELETE. NEVER SHIP.
// Removes everything seed.mjs and ../chat-demo/run.mjs created: the accounts in
// ../accounts.local.json, every row that points at them or at their events, then the file.
// No API deletes users, events or tickets, so this works on the SQLite file directly,
// the one each run recorded (override with --db=).
//
//   node frontend_testing/seed/reset.mjs              # what accounts.local.json lists
//   node frontend_testing/seed/reset.mjs --orphans    # also any nfseed.* account the file lost
//   node frontend_testing/seed/reset.mjs --dry-run    # count only
//
// ⚠️ The event service caches /events/search for 5 minutes, so deleted demo events can
// linger on /explore until then (or until any event is created or edited).
import { args, hex, loadAccounts, removeAccountsFile, EMAIL_PREFIX, ACCOUNTS_FILE } from "./lib.mjs";
import { DatabaseSync } from "node:sqlite";
import { existsSync } from "node:fs";

// table -> columns holding a USER id, columns holding an EVENT id (missing tables/columns are skipped).
const PLAN = [
  ["tickets", ["user_id"], ["event_id"]],
  ["waitlist", ["user_id"], ["event_id"]],
  ["admission_audit", ["actor_id"], ["event_id"]],
  ["event_messages", ["user_id"], ["event_id"]],
  ["event_room_reads", ["user_id"], ["event_id"]],
  ["event_mail_outbox", ["user_id"], []],
  ["event_notifications", ["user_id"], ["event_id"]],
  ["event_changes", ["actor_id"], ["event_id"]],
  ["reviews", ["user_id"], ["event_id"]],
  ["payment_intents", ["user_id"], ["event_id"]],
  ["chat_messages", ["sender_id"], ["room_id"]], // Old page's WebSocket chat (room id = event id)
  ["room_participants", ["user_id"], ["room_id"]],
  ["events", ["organizer_id"], ["id"]],
  ["organizer_profiles", ["user_id"], []],
  ["community_members", ["user_id"], []],
  ["communities", ["organizer_id"], []],
  ["profile_image_assets", ["owner_id"], []],
  ["profiles", ["id"], []],
  ["account_tokens", ["user_id"], []],
  ["social_identities", ["user_id"], []],
  ["users_credentials", ["id"], []],
];

const file = loadAccounts();
const byDb = new Map();
for (const run of file.runs) {
  const db = args.db ?? run.db;
  const t = byDb.get(db) ?? { users: new Set(), events: new Set(), emails: new Set() };
  run.accounts.forEach((a) => { t.users.add(hex(a.id)); t.emails.add(a.email.toLowerCase()); });
  run.events.forEach((e) => t.events.add(hex(e.id)));
  byDb.set(db, t);
}
if (args.orphans && args.db && !byDb.has(args.db)) byDb.set(args.db, { users: new Set(), events: new Set(), emails: new Set() });
if (!byDb.size) { console.log(`Nothing to reset: ${ACCOUNTS_FILE} is missing or empty. (Use --orphans --db=<file> to sweep nfseed.* accounts.)`); process.exit(0); }

let failed = false;
for (const [dbPath, t] of byDb) {
  if (!existsSync(dbPath)) { console.error(`skip ${dbPath}: no such file`); failed = true; continue; }
  const db = new DatabaseSync(dbPath);
  db.exec("PRAGMA busy_timeout = 5000");
  if (args.orphans) {
    for (const r of db.prepare("select id, email from users_credentials where lower(email) like ?").all(EMAIL_PREFIX + "%")) {
      t.users.add(hex(r.id)); t.emails.add(r.email.toLowerCase());
    }
  }
  // Events owned by a seeded organiser count too (covers an event created after a crash).
  for (const r of db.prepare(`select id from events where organizer_id in (${[...t.users].map(() => "?").join(",") || "''"})`).all(...t.users)) t.events.add(hex(r.id));

  const users = [...t.users], events = [...t.events];
  console.log(`${dbPath}\n  ${users.length} accounts, ${events.length} events${args["dry-run"] ? "  (dry run)" : ""}`);
  const tables = new Set(db.prepare("select name from sqlite_master where type='table'").all().map((r) => r.name));
  db.exec("BEGIN");
  try {
    for (const [table, userCols, eventCols] of PLAN) {
      if (!tables.has(table)) continue;
      const cols = new Set(db.prepare(`pragma table_info("${table}")`).all().map((c) => c.name));
      const where = [], params = [];
      for (const [list, colsFor] of [[users, userCols], [events, eventCols]]) {
        for (const c of colsFor) {
          if (!cols.has(c) || !list.length) continue;
          where.push(`lower(replace(${c}, '-', '')) in (${list.map(() => "?").join(",")})`);
          params.push(...list);
        }
      }
      if (!where.length) continue;
      const sql = `from "${table}" where ${where.join(" or ")}`;
      const n = args["dry-run"] ? db.prepare(`select count(*) n ${sql}`).get(...params).n : db.prepare(`delete ${sql}`).run(...params).changes;
      if (n) console.log(`  ${table.padEnd(22)} ${n}`);
    }
    if (tables.has("account_mail_outbox") && t.emails.size) {
      const list = [...t.emails];
      const sql = `from account_mail_outbox where lower(recipient) in (${list.map(() => "?").join(",")})`;
      const n = args["dry-run"] ? db.prepare(`select count(*) n ${sql}`).get(...list).n : db.prepare(`delete ${sql}`).run(...list).changes;
      if (n) console.log(`  ${"account_mail_outbox".padEnd(22)} ${n}`);
    }
    db.exec(args["dry-run"] ? "ROLLBACK" : "COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    console.error(`  FAILED, nothing removed from this file: ${e.message}`);
    failed = true;
  }
  db.close();
}
if (!failed && !args["dry-run"]) { removeAccountsFile(); console.log(`Removed ${ACCOUNTS_FILE}`); }
process.exit(failed ? 1 : 0);
