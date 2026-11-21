import Link from "next/link";
import { SKIP_ORGANIZER_VERIFICATION } from "./dev-flags";

/**
 * DEV ONLY. NEVER DELETE. NEVER SHIP. — see repo-root `frontend_testing/README.md`.
 *
 * The strip above the header of `/organizer/onboarding` and `/organizer/create`
 * while `SKIP_ORGANIZER_VERIFICATION` is on: says the check is off and links to
 * the other page of the pair. Renders nothing when the flag is off, and the flag
 * is a build-time `false` in production, so the body is dead code there.
 *
 * Deliberately a strip ABOVE the page rather than a control inside it: the page's
 * own layout is what you came to look at, and a button threaded into the header
 * would change the thing under review. The TERRACOTTA edge is the tell that it is
 * not product UI — nothing else on either page is outlined in the annotation
 * colour, and this product has no dashed borders anywhere (Gautham, 2026-09-09).
 * Wording follows the onboarding page's title, "Set up your organisation".
 */
export function BypassStrip({ href, label }: { href: string; label: string }) {
  if (!SKIP_ORGANIZER_VERIFICATION) return null;
  return (
    <div
      className="mb-6 rounded-lg p-4 flex flex-wrap items-center justify-between gap-3"
      style={{
        border: "2px solid var(--brand-terracotta)",
        backgroundColor: "var(--brand-surface)",
      }}
    >
      <p style={{ color: "var(--brand-hint)" }}>
        Dev bypass on — organisation setup is not being enforced.
      </p>
      <Link
        href={href}
        className="px-4 py-2 rounded-lg font-bold transition-colors bg-[var(--brand-green)] hover:bg-[var(--brand-green-hover)] text-[var(--brand-on-green)]"
      >
        {label}
      </Link>
    </div>
  );
}
