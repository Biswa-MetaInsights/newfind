// DEV ONLY. NEVER DELETE. NEVER SHIP.
// Live-seed demo data: the signed-in states and one event per UI state, read by
// ../seed/seed.mjs. NOT the in-app dummy fixtures (apps/web/src/frontend_testing/fixtures/),
// which feed NEXT_PUBLIC_DATA_MODE=dummy and never touch a backend.
// What each one is for, and the page to check it on: CHECKLIST.md beside this file.

/** One throwaway account per signed-in state (plan §4). "Logged out" needs no account. */
export const STATES = [
  { label: "organiser", role: "organizer", name: "Seed Organiser", profile: true, state: "organiser with profile (owns every demo event)" },
  { label: "organiser-no-profile", role: "organizer", name: "Seed Unverified Organiser", state: "organiser without profile" },
  { label: "participant", role: "user", name: "Seed Participant", state: "participant with tickets" },
  { label: "new-user", role: "user", name: "Seed New User", state: "brand-new user (no tickets, no profile edits)" },
  { label: "deleted-ticket-holder", role: "user", name: "Seed Ticket Holder", state: "ticket-holder whose event was deleted" },
];

const BRUSSELS = { tz: "Europe/Brussels", location: { name: "Ancienne Belgique, Boulevard Anspach 110", address: "Boulevard Anspach 110", city: "Brussels", country: "Belgium", latitude: 50.8476, longitude: 4.3489 } };
const TOKYO = { tz: "Asia/Tokyo", location: { name: "Shibuya Stream Hall", address: "3-21-3 Shibuya", city: "Tokyo", country: "Japan", latitude: 35.6580, longitude: 139.7016 } };
const ONLINE_URL = "https://meet.google.com/nfs-seed-demo";

// Exactly 120 characters (asserted at the bottom); the backend allows 200.
const long = "[Seed] 120-character title: a deliberately long event name that has to wrap or truncate cleanly on every card, tab, row.";

/**
 * start: { days, time } = wall clock in the event's own time zone, `days` from today;
 *        { minutes }    = relative to now (for "already started").
 * book:  account labels that claim one free ticket while the event is still bookable.
 * then:  a PATCH applied AFTER booking (that is how a ticket ends up on a closed/cancelled event).
 * delete: remove the row from the database after booking (no API deletes an event).
 * external: insert via the event service's /events/ingest as a Ticketmaster listing.
 */
export const EVENTS = [
  { key: "free", title: "[Seed] Free · Brussels jazz evening", category: "Music", ...BRUSSELS, start: { days: 14, time: "19:00" }, hours: 3, price: 0, capacity: 120, book: ["participant"] },
  { key: "paid", title: "[Seed] Paid · Brussels product workshop", category: "Business", ...BRUSSELS, start: { days: 21, time: "10:00" }, hours: 6, price: 25, capacity: 40, tryBook: "participant" },
  { key: "sold-out", title: "[Seed] Sold out · One-seat tasting", category: "Food & Drink", ...BRUSSELS, start: { days: 9, time: "18:30" }, hours: 2, price: 0, capacity: 1, book: ["participant"] },
  { key: "unlimited", title: "[Seed] Unlimited · Open park run", category: "Sports", ...BRUSSELS, start: { days: 5, time: "08:00" }, hours: 2, price: 0, capacity: 0, book: ["participant"] },
  { key: "registration-closed", title: "[Seed] Registration closed · Design meetup", category: "Networking", ...BRUSSELS, start: { days: 12, time: "18:00" }, hours: 3, price: 0, capacity: 60, book: ["participant"], then: { status: "registration_closed" } },
  { key: "cancelled", title: "[Seed] Cancelled · Rooftop cinema", category: "Arts & Culture", ...BRUSSELS, start: { days: 16, time: "21:00" }, hours: 2, price: 0, capacity: 80, book: ["participant"], then: { status: "cancelled" } },
  { key: "past", title: "[Seed] Past · Autumn book swap", category: "Education", ...BRUSSELS, start: { days: -10, time: "14:00" }, hours: 3, price: 0, capacity: 50 },
  { key: "started", title: "[Seed] Already started · All-day hackathon", category: "Technology", ...BRUSSELS, start: { minutes: -60 }, hours: 8, price: 0, capacity: 100 },
  { key: "draft", title: "[Seed] Draft · Unpublished pottery class", category: "Creative", ...BRUSSELS, start: { days: 30, time: "11:00" }, hours: 2, price: 0, capacity: 12, status: "draft" },
  { key: "online", title: "[Seed] Online · Remote TypeScript clinic", category: "Technology", tz: "Europe/Brussels", type: "Online", location: { name: "Online", city: "Brussels", country: "Belgium", online_url: ONLINE_URL }, start: { days: 8, time: "17:00" }, hours: 1.5, price: 0, capacity: 300, book: ["participant"] },
  { key: "hybrid", title: "[Seed] Hybrid · Climate policy panel", category: "Education", ...BRUSSELS, type: "Hybrid", extraLocation: { online_url: ONLINE_URL }, start: { days: 11, time: "19:30" }, hours: 2, price: 0, capacity: 90, book: ["participant"] },
  { key: "tokyo", title: "[Seed] Tokyo time zone · Night market walk", category: "Food & Drink", ...TOKYO, start: { days: 15, time: "19:00" }, hours: 3, price: 0, capacity: 30, book: ["participant"] },
  { key: "long-title", title: long, category: "Arts & Culture", ...BRUSSELS, start: { days: 18, time: "20:00" }, hours: 2, price: 0, capacity: 70, book: ["participant"] },
  { key: "external", title: "[Seed] External listing · Stadium concert", category: "Music", ...BRUSSELS, start: { days: 40, time: "20:00" }, hours: 3, price: 45, capacity: 0, external: "https://www.ticketmaster.be/event/nfseed-demo-listing" },
  { key: "deleted", title: "[Seed] Deleted · Event removed after booking", category: "Networking", ...BRUSSELS, start: { days: 10, time: "18:00" }, hours: 2, price: 0, capacity: 40, book: ["deleted-ticket-holder"], delete: true },
];

if (long.length !== 120) throw new Error(`long-title fixture is ${long.length} chars, expected 120`);
