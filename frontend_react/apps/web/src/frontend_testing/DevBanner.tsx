"use client";

import { DATA_MODE } from "@/lib/data-source";
import { GUTTERS } from "@/lib/layout";
import { SHOW_EVENT_ASSISTANT, SKIP_ORGANIZER_VERIFICATION } from "./dev-flags";

/**
 * DEV ONLY. NEVER DELETE. NEVER SHIP. — see repo-root `frontend_testing/README.md`.
 *
 * One line above every page in `next dev` saying which data mode and dev flags
 * the running server was started with, so a screenshot or a bug report carries
 * its own context. Mounted by `app/layout.tsx` behind
 * `NODE_ENV === "development"`, and re-checks that here, so a production build
 * renders nothing.
 *
 * In normal flow, not fixed: it scrolls away with the page and the sticky navbar
 * takes over, so it never covers a page's own fixed chrome (the create form's
 * sticky bar, the assistant launcher). TERRACOTTA edge = not product UI, the same
 * tell as `BypassStrip`.
 */
export function DevBanner() {
  if (process.env.NODE_ENV !== "development") return null;
  const onOff = (on: boolean) => (on ? "on" : "off");
  return (
    <div
      data-dev-banner
      className={`py-1.5 flex flex-wrap gap-x-4 gap-y-1 text-meta ${GUTTERS}`}
      style={{
        borderBottom: "2px solid var(--brand-terracotta)",
        backgroundColor: "var(--brand-surface)",
        color: "var(--brand-hint)",
      }}
    >
      <span className="font-bold">Dev</span>
      <span>Data: {DATA_MODE}</span>
      <span>Organisation bypass: {onOff(SKIP_ORGANIZER_VERIFICATION)}</span>
      <span>Assistant flag: {onOff(SHOW_EVENT_ASSISTANT)}</span>
    </div>
  );
}
