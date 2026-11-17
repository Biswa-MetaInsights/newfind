// DEV ONLY. NEVER DELETE. NEVER SHIP.
// Chat demo (plan §5): one throwaway organiser + one participant, two free future
// Brussels events, the participant books both, then the SAME conversation is captured on
//   New page  /chat/<event_id>  (:3000; server-saved, polled, history + read state)
//   Old page  /chat/<event_id>  (:3002; WebSocket on :8007, nothing saved, opened by URL
//                                 because its room list comes from the browser's local tickets)
// Both pages must point at the same backend (NEXT_PUBLIC_API_URL), or the event ids differ.
//
//   node frontend_testing/chat-demo/run.mjs [--out=<dir>] [--base=http://localhost:3000] [--old=http://localhost:3002]
//
// Accounts and events are added to ../accounts.local.json as a "chat-demo" run, so
// ../seed/reset.mjs removes them with everything else.
import { args, call, register, organiserProfile, book, eventPayload, startRun, sleep, API } from "../seed/lib.mjs";
import { withBrowser, newPage, BASE } from "../cdp/cdp.mjs";

const OLD = args.old ?? "http://localhost:3002";
const BRUSSELS = { tz: "Europe/Brussels", location: { name: "Brasserie de la Lune, Rue du Marché au Charbon 45", address: "Rue du Marché au Charbon 45", city: "Brussels", country: "Belgium", latitude: 50.8458, longitude: 4.3478 } };
const EVENTS = [
  { key: "chat-1", title: "[Chat demo] Brussels board-game night", category: "Gaming", ...BRUSSELS, start: { days: 7, time: "19:00" }, hours: 3, price: 0, capacity: 40, description: "Chat demo event (frontend_testing/chat-demo)." },
  { key: "chat-2", title: "[Chat demo] Brussels Sunday brunch walk", category: "Food & Drink", ...BRUSSELS, start: { days: 12, time: "11:00" }, hours: 2, price: 0, capacity: 25, description: "Chat demo event (frontend_testing/chat-demo)." },
];
const CONVERSATION = [
  ["organiser", "Welcome, everyone! Doors open at 18:45 and the game library is on the first floor."],
  ["participant", "Thanks! Can I bring a friend who hasn't booked yet?"],
  ["organiser", "Yes, there is still room. Ask them to claim a free ticket on the event page."],
  ["participant", "Great, see you Saturday."],
];
const INPUT = 'input[placeholder^="Send a message"]';
const has = (text) => `document.body.innerText.includes(${JSON.stringify(text)})`;
const last = CONVERSATION.at(-1)[1];

const log = startRun("chat-demo");
const organiser = await register("chat-organiser", "organizer", "Demo Organiser");
log.addAccount(organiser, { state: "chat demo organiser (owns both chat events)" });
await organiserProfile(organiser);
const participant = await register("chat-participant", "user", "Demo Participant");
log.addAccount(participant, { state: "chat demo participant (booked both chat events)" });
const who = { organiser, participant };

const events = [];
for (const fx of EVENTS) {
  const { data: event } = await call("POST", "/event/", { token: organiser.token, body: eventPayload(fx, organiser.id) });
  log.addEvent({ key: fx.key, id: event.id, title: fx.title, status: event.status, url: `${BASE}/chat/${event.id}` });
  await book(participant, event.id);
  events.push(event);
  console.log(`event   ${fx.key}  ${event.id}  booked by the participant`);
}
const room = events[0];

// New page: the conversation is stored by the backend, so post it through the API...
for (const [speaker, content] of CONVERSATION) {
  await call("POST", `/event/${room.id}/messages`, { token: who[speaker].token, expect: [201], body: { content } });
  await sleep(1100); // distinct timestamps
}

await withBrowser(async (browser) => {
  const shots = [];
  // ...and both sides simply open the room and read the history.
  for (const speaker of ["participant", "organiser"]) {
    const page = await newPage(browser, { auth: { email: who[speaker].email, password: who[speaker].password }, height: 1150 });
    await page.goto(`${BASE}/chat/${room.id}`, 2000);
    const ok = await page.waitFor(has(last), 20000);
    shots.push(`${ok ? "ok  " : "FAIL"}  new-page as ${speaker.padEnd(11)} ${await page.shot(`chat-new-page-${speaker}`)}`);
  }

  // Old page keeps nothing, so both sides must be connected while it is typed, through its UI.
  // Captured AS IT BEHAVES: the :8007 service keeps ONE socket per (room, user), and the page,
  // its navbar ChatPresence and next dev's double-mounted effects each open one, so a page can
  // lose its slot ("Could not connect…"), and any socket closing broadcasts a sender-less
  // {"system": "User … left."} that crashes the open page on msg.sender_id.substring.
  const oldState = (p) => p.eval(`(() => { const t = document.body.innerText;
    if (t.includes("substring")) return "crashed: TypeError on msg.sender_id.substring";
    if (t.includes("Could not connect")) return "disconnected: 'Could not connect to the chat service'";
    const n = ${JSON.stringify(CONVERSATION.map((c) => c[1]))}.filter((m) => t.includes(m)).length;
    return n + "/" + ${CONVERSATION.length} + " messages shown"; })()`);
  const old = {};
  for (const speaker of ["organiser", "participant"]) {
    old[speaker] = await newPage(browser, { auth: { email: who[speaker].email, password: who[speaker].password }, height: 1150 });
    await old[speaker].goto(`${OLD}/chat/${room.id}?name=${encodeURIComponent(room.title)}`, 2000);
    if (!(await old[speaker].waitFor(has("Live Chat"), 30000))) console.log(`note  old page (${speaker}) never showed "Live Chat"`);
  }
  for (const [speaker, content] of CONVERSATION) {
    await old[speaker].type(INPUT, content).catch(() => {});
    await old[speaker].key("Enter").catch(() => {});
    await sleep(900);
  }
  await sleep(2000);
  for (const speaker of ["participant", "organiser"]) {
    shots.push(`as-is old-page as ${speaker.padEnd(11)} ${(await oldState(old[speaker])).padEnd(62)} ${await old[speaker].shot(`chat-old-page-${speaker}`)}`);
  }
  // Reload: nothing is saved, so even a working Old page room comes back empty.
  await old.participant.goto(`${OLD}/chat/${room.id}?name=${encodeURIComponent(room.title)}`, 4000);
  shots.push(`as-is old-page after reload ${(await oldState(old.participant)).padEnd(62)} ${await old.participant.shot("chat-old-page-participant-after-reload")}`);
  // Same reload on New page keeps it.
  const again = await newPage(browser, { auth: { email: participant.email, password: participant.password }, height: 1150 });
  await again.goto(`${BASE}/chat/${room.id}`, 2000);
  const kept = await again.waitFor(has(last), 20000);
  shots.push(`${kept ? "ok  " : "FAIL"}  new-page after reload (history kept) ${await again.shot("chat-new-page-participant-after-reload")}`);

  console.log("\n" + shots.join("\n"));
  console.log(`\nDemo organiser:   ${organiser.email} / ${organiser.password}`);
  console.log(`Demo participant: ${participant.email} / ${participant.password}`);
  console.log(`Room: ${BASE}/chat/${room.id}  and  ${OLD}/chat/${room.id}   (backend ${API})`);
});
