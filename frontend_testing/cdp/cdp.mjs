// DEV ONLY. NEVER DELETE. NEVER SHIP.
// Raw DevTools Protocol plumbing for the mocks, scenarios and chat demo. The Chrome
// launch, the CDP class and the sign-in injection are copied from
// apps/web/scripts/responsive-sweep.mjs (keep them in step); added here: per-page
// isolated browser contexts (two users signed in at once), CDP events, request mocks.
// No Playwright/Puppeteer: Node 22+ has fetch and WebSocket built in.
// Run from PowerShell, not Git Bash (Chrome's headless launch is unreliable under Bash).
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { args, ROOT, sleep, login } from "../seed/lib.mjs";

export const BASE = args.base ?? "http://localhost:3000";
export const OUT = path.resolve(args.out ?? path.join(ROOT, "shots")); // git-ignored

const CHROME =
  args.chrome ??
  [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
  ].find(existsSync);

class CDP {
  constructor(ws) {
    this.ws = ws; this.id = 0; this.pending = new Map(); this.listeners = [];
    ws.onmessage = (e) => {
      const m = JSON.parse(e.data);
      const p = m.id && this.pending.get(m.id);
      if (p) { this.pending.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); return; }
      if (m.method) for (const l of this.listeners) if (l.method === m.method && l.sessionId === m.sessionId) l.fn(m.params);
    };
  }
  send(method, params = {}, sessionId) {
    const id = ++this.id;
    return new Promise((res, rej) => { this.pending.set(id, { res, rej }); this.ws.send(JSON.stringify({ id, method, params, sessionId })); });
  }
  on(method, sessionId, fn) { this.listeners.push({ method, sessionId, fn }); }
}

export async function launch() {
  if (!CHROME) throw new Error("No Chrome/Edge found — pass --chrome=<path>");
  const port = Number(args.port ?? 9334); // the sweep uses 9333; both can run at once
  const chrome = spawn(CHROME, [
    "--headless=new", `--remote-debugging-port=${port}`, "--no-first-run", "--no-default-browser-check",
    "--disable-gpu", "--hide-scrollbars", `--user-data-dir=${path.join(process.env.TEMP ?? "/tmp", `nf-ft-${port}`)}`, "about:blank",
  ], { stdio: "ignore" });
  process.on("exit", () => { try { chrome.kill(); } catch {} });
  let ver;
  for (let i = 0; i < 60 && !ver; i++) {
    try { const r = await fetch(`http://127.0.0.1:${port}/json/version`); if (r.ok) ver = await r.json(); } catch {}
    if (!ver) await sleep(200);
  }
  if (!ver) throw new Error("Chrome did not start");
  const ws = new WebSocket(ver.webSocketDebuggerUrl);
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  const cdp = new CDP(ws);
  mkdirSync(OUT, { recursive: true });
  return {
    cdp,
    async close() { ws.close(); await sleep(200); chrome.kill(); }, // close the socket first, or libuv asserts
  };
}

/**
 * A fresh tab in its OWN browser context (separate localStorage), optionally signed in.
 * auth: { email, password } | { tokens, email }.  timezone: IANA id for Emulation.setTimezoneOverride.
 */
export async function newPage(browser, { auth, width = 1280, height = 900, timezone } = {}) {
  const { cdp } = browser;
  const { browserContextId } = await cdp.send("Target.createBrowserContext");
  const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank", browserContextId });
  const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });
  const send = (m, p) => cdp.send(m, p, sessionId);
  await send("Page.enable"); await send("Runtime.enable");
  await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 800 });
  if (timezone) await send("Emulation.setTimezoneOverride", { timezoneId: timezone });
  if (auth) {
    const tokens = auth.tokens ?? await login(auth.email, auth.password);
    const persisted = JSON.stringify({ state: { userEmail: auth.email, tokens, isAuthenticated: true, _hasHydrated: false }, version: 0 });
    await send("Page.addScriptToEvaluateOnNewDocument", { source: `try { localStorage.setItem("eventmind-auth", ${JSON.stringify(persisted)}); } catch {}` });
  }
  const mocks = [];
  const page = {
    send,
    async eval(expression) {
      const r = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
      return r.result.value;
    },
    async goto(url, settle = 3000) { await send("Page.navigate", { url: url.startsWith("http") ? url : BASE + url }); await sleep(settle); },
    /** Poll a boolean JS expression; returns false on timeout instead of throwing. */
    async waitFor(expression, timeout = 15000) {
      for (const t0 = Date.now(); Date.now() - t0 < timeout; await sleep(250)) {
        try { if (await page.eval(expression)) return true; } catch {}
      }
      return false;
    },
    async click(text, selector = "button") {
      return page.eval(`(() => { const el = [...document.querySelectorAll(${JSON.stringify(selector)})].find(b => b.textContent.replace(/\\s+/g,' ').trim().includes(${JSON.stringify(text)}) && b.getClientRects().length); if (el) el.click(); return !!el; })()`);
    },
    async type(selector, text) {
      await page.eval(`document.querySelector(${JSON.stringify(selector)})?.focus()`);
      await send("Input.insertText", { text });
    },
    async key(key, code = key, keyCode = 13) {
      await send("Input.dispatchKeyEvent", { type: "keyDown", key, code, windowsVirtualKeyCode: keyCode });
      await send("Input.dispatchKeyEvent", { type: "keyUp", key, code, windowsVirtualKeyCode: keyCode });
    },
    async shot(name) {
      const { data } = await send("Page.captureScreenshot", { format: "png" });
      const file = path.join(OUT, name.endsWith(".png") ? name : `${name}.png`);
      writeFileSync(file, Buffer.from(data, "base64"));
      return file;
    },
    /**
     * Intercept requests whose URL contains `fragment`. handler(request) returns
     * { status, json } to answer, "hold" to never answer (a loading state), or null to pass through.
     * Call before navigating.
     */
    async mock(fragment, handler) {
      mocks.push({ fragment, handler });
      await send("Fetch.enable", { patterns: mocks.map((m) => ({ urlPattern: `*${m.fragment}*`, requestStage: "Request" })) });
    },
  };
  cdp.on("Fetch.requestPaused", sessionId, async ({ requestId, request }) => {
    const m = mocks.find((x) => request.url.includes(x.fragment));
    const answer = m ? await m.handler(request) : null;
    if (answer === "hold") return;
    if (!answer) return send("Fetch.continueRequest", { requestId }).catch(() => {});
    const origin = request.headers.Origin ?? request.headers.origin ?? BASE;
    await send("Fetch.fulfillRequest", {
      requestId, responseCode: answer.status ?? 200,
      responseHeaders: [
        { name: "content-type", value: "application/json" },
        { name: "access-control-allow-origin", value: origin },
        { name: "access-control-allow-credentials", value: "true" },
      ],
      body: Buffer.from(JSON.stringify(answer.json ?? {})).toString("base64"),
    }).catch(() => {});
  });
  return page;
}

/** Run `main(browser)` with Chrome up, always closing it. */
export async function withBrowser(main) {
  const browser = await launch();
  try { await main(browser); await browser.close(); process.exit(0); }
  catch (e) { console.error(e); await browser.close(); process.exit(1); }
}
