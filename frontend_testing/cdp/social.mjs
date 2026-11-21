// DEV ONLY. NEVER DELETE. NEVER SHIP.
// The /auth social buttons are disabled until GET /auth/capabilities says a provider is
// configured, which needs real Google/Facebook OAuth credentials. This answers it with
// { google: true, facebook: true } so the enabled buttons can be looked at, signed out.
// Clicking one still calls the real /auth/oauth/<provider>/start, which fails without
// credentials; this is for the look only.
//
//   node frontend_testing/cdp/social.mjs [--out=<dir>] [--base=http://localhost:3000]
import { withBrowser, newPage } from "./cdp.mjs";

const STATE = `JSON.stringify([...document.querySelectorAll('button')].filter(b => /Continue with (Google|Facebook)/.test(b.textContent)).map(b => b.textContent.trim() + (b.disabled ? ' (disabled)' : ' (enabled)')))`;

await withBrowser(async (browser) => {
  for (const [name, configured] of [["auth-social-real", false], ["auth-social-configured", true]]) {
    const page = await newPage(browser);
    if (configured) await page.mock("/auth/capabilities", (req) => (req.method === "GET" ? { json: { google: true, facebook: true } } : null));
    await page.goto("/auth", 4000); // lets the real capabilities call settle too
    await page.waitFor(`[...document.querySelectorAll('button')].some(b => /Continue with Google/.test(b.textContent))`, 20000);
    await page.waitFor(configured ? `[...document.querySelectorAll('button')].some(b => /Continue with Google/.test(b.textContent) && !b.disabled)` : "true", 8000);
    const file = await page.shot(name);
    console.log(`${name.padEnd(24)} ${await page.eval(STATE)}  ${file}`);
  }
});
