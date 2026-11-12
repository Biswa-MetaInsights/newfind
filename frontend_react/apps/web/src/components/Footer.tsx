import Link from "next/link";
import { BrandLogo } from "@/components/brand";

const GREEN = "#184E4A";
const LINEN = "#F2EFEA";

const COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Discover",
    links: [
      { label: "Explore Events", href: "/explore?view=events" },
      // PARKED 2026-08-14 (MVP) — communities are deferred to Phase 2.
      // { label: "Communities", href: "/explore?view=communities" },
    ],
  },
  {
    title: "For Organisers",
    links: [
      { label: "Create Event", href: "/organizer/create" },
      { label: "Organizer Console", href: "/organizer/events" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Help", href: "/help" },
    ],
  },
];

function FooterLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="text-[15px] no-underline transition-opacity hover:opacity-70"
      style={{ color: LINEN }}
    >
      {label}
    </Link>
  );
}

export function Footer() {
  return (
    <footer style={{ backgroundColor: GREEN, color: LINEN }}>
      <div className="px-4 sm:px-6 lg:px-12 py-12">
        <div className="flex flex-col gap-10 lg:flex-row lg:justify-between">
          {/* Brand — footer is a fixed deep-green block, so the logo stays linen. */}
          <div className="max-w-sm">
            <BrandLogo markSize={55} gap={16} style={{ color: LINEN }} />
            <p className="mt-3 text-[15px] leading-relaxed" style={{ color: "rgba(242,239,234,0.75)" }}>
              {/* PARKED 2026-08-14 (MVP) — was "…find events, communities, and experiences near you." */}
              Find events and experiences near you.
            </p>
            <p className="mt-3 text-[15px] leading-relaxed" style={{ color: "rgba(242,239,234,0.75)" }}>
              Developed and powered by MetaInsights BV.
            </p>
          </div>

          {/* Link columns */}
          {/* One column under 420px: two 128px cells wrapped every heading. The
              arbitrary step is emitted before `sm`, so `sm` still wins at 640+. */}
          <div className="grid grid-cols-1 min-[420px]:grid-cols-2 sm:grid-cols-3 gap-8 sm:gap-14">
            {COLUMNS.map((col) => (
              <div key={col.title} className="flex flex-col gap-3">
                <p className="text-xs font-bold uppercase tracking-wide" style={{ color: "rgba(242,239,234,0.6)" }}>
                  {col.title}
                </p>
                {col.links.map((l) => (
                  <FooterLink key={l.label} href={l.href} label={l.label} />
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom row */}
        <div
          className="mt-10 pt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
          style={{ borderTop: "1px solid rgba(242,239,234,0.18)" }}
        >
          <p className="text-sm" style={{ color: "rgba(242,239,234,0.7)" }}>
            © {new Date().getFullYear()} MetaInsights BV. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            {/* Social icons */}

          </div>
        </div>
      </div>
    </footer>
  );
}
