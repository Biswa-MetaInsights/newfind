"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocationStore, DEFAULT_CITY } from "@eventmind/store";
import { EVENT_FORMATS } from "@eventmind/types";
import { CityPicker } from "@/components/CityPicker";
import { BrandMark } from "@/components/brand/BrandMark";
import { GUTTERS } from "@/lib/layout";
import { exploreHref } from "@/lib/explore-href";
import { weekendRange } from "@/lib/date-range";

// The home hero: two polaroids either side of a fake group chat that ends with
// NewFind's answer, then a search bar and four quick picks underneath.
//
// Ported from the "Photos 1 — polaroids" mockups (dark + light). Where the mockup
// and the brand system disagree the brand system wins: type is the app font
// (Bricolage/DM Sans are not loaded; the ONE exception is the polaroid captions,
// set in the handwritten Caveat as --font-hand), every corner is rounded-lg
// (a bubble keeps its "tail" by reducing ONE corner), and the location field is
// the shared CityPicker. The palette the brand tokens don't cover lives in
// --hero-* tokens in globals.css. See DESIGN_NOTES.md.
//
// Layout: three columns from `xl` (1280px). Below that the polaroid columns are
// hidden and a strip of four round avatars stands in for them. The mockup
// collapses at 1000px, but at 1024–1279px the side columns are only ~130–260px
// wide — narrower than the polaroids — so they would slide under the chat card.

type ChatLine = { side: "left" | "right"; emoji: string; label: string; text: string };

const CHAT: ChatLine[] = [
  { side: "left", emoji: "😃", label: "Excited", text: "we should do something tonight" },
  { side: "right", emoji: "🤩", label: "Star-struck", text: "yesssss. but what’s the plan?" },
  { side: "left", emoji: "🤷", label: "Shrugging", text: "idk, you pick" },
  { side: "right", emoji: "🥺", label: "Pleading face", text: "i have no clue" },
  { side: "left", emoji: "🙄", label: "Eye roll", text: "classic." },
];

// Explore reads `event_type` for format and `free=true` for price. "Online" is a
// FORMAT, never a category.
const eventType = (format: string) => `/explore?view=events&event_type=${encodeURIComponent(format)}`;

// ⚠️ These are <Link>s, so they cannot take OUTLINE_BUTTON: its hover rules are
// all `enabled:`, and :enabled matches only form controls — on an <a> the hover
// fill would never fire. Same colours, written without the guard.
const CHIP =
  "inline-flex items-center rounded-lg border-2 border-[var(--brand-control-border)] text-[var(--brand-text)] " +
  "transition-colors hover:border-[var(--brand-green)] hover:bg-[var(--brand-green)] hover:text-[var(--brand-on-green)] " +
  "[@media(pointer:coarse)]:min-h-11";

type Polaroid = {
  src: string;
  alt: string;
  caption: string;
  emoji: string;
  // Placement, width, tilt and stacking are literal class strings so Tailwind's
  // source scan can see them. Values are the mockup's.
  place: string;
  photoHeight: string;
  position: string;
  priority?: boolean;
};

const LEFT_POLAROIDS: Polaroid[] = [
  {
    src: "/hero/hero-5.png",
    alt: "Two friends mid-rally in a table tennis match",
    caption: "table tennis club",
    emoji: "🔥",
    place: "left-[30px] top-0 z-[2] w-[200px] rotate-[-6deg]",
    photoHeight: "h-[230px]",
    position: "object-[50%_50%]",
    priority: true,
  },
  {
    src: "/hero/hero-7.png",
    alt: "Children painting at easels in a workshop",
    caption: "painting class",
    emoji: "🎨",
    place: "left-[96px] top-[228px] z-[1] w-[220px] rotate-[4deg]",
    photoHeight: "h-[200px]",
    position: "object-[50%_50%]",
  },
];

const RIGHT_POLAROIDS: Polaroid[] = [
  {
    src: "/hero/hero-4.png",
    alt: "A man meditating calmly at sunrise yoga",
    caption: "sunrise yoga",
    emoji: "🧘🏻",
    place: "right-[24px] top-0 z-[2] w-[210px] rotate-[6deg]",
    photoHeight: "h-[210px]",
    position: "object-[50%_50%]",
    priority: true,
  },
  {
    src: "/hero/hero-2.png",
    alt: "A woman laughing on a video call with her online book club",
    caption: "online meetup",
    emoji: "😀",
    place: "right-[104px] top-[218px] z-[1] w-[210px] rotate-[-5deg]",
    photoHeight: "h-[186px]",
    position: "object-[88%_50%]",
  },
];

// The four faces that stand in for the polaroids below `xl`.
const AVATARS = [
  { src: "/hero/hero-2.png", alt: "A woman laughing on a video call", position: "object-[88%_50%]" },
  { src: "/hero/hero-4.png", alt: "A man meditating calmly at sunrise yoga", position: "object-[50%_50%]" },
  { src: "/hero/hero-5.png", alt: "Two friends mid-rally in a table tennis match", position: "object-[50%_50%]" },
  { src: "/hero/hero-7.png", alt: "Children painting at easels in a workshop", position: "object-[50%_50%]" },
];

function PolaroidCard({ card }: { card: Polaroid }) {
  return (
    <div
      className={`absolute box-border rounded-lg bg-[var(--hero-polaroid)] px-2.5 pt-2.5 text-[var(--hero-polaroid-ink)] shadow-[var(--hero-shadow-polaroid)] ${card.place}`}
    >
      <div className={`relative overflow-hidden rounded-[4px] ${card.photoHeight}`}>
        <Image
          src={card.src}
          alt={card.alt}
          fill
          sizes="220px"
          className={`object-cover ${card.position}`}
          priority={card.priority}
        />
      </div>
      <div className="flex h-11 items-center gap-1.5">
        {/* Handwriting: the one approved exception to the single app font. Caveat
            runs small for its point size, hence 26px against the old 20px. */}
        <span className="font-[family-name:var(--font-hand)] text-[26px] font-bold leading-none">{card.caption}</span>
        <span aria-hidden="true" className="text-[18px]">
          {card.emoji}
        </span>
      </div>
    </div>
  );
}

export function HeroChatCollage() {
  const router = useRouter();
  const [q, setQ] = useState("");

  // Same hydration guard as the home page: the persisted city is only trusted
  // once the store has rehydrated.
  const _selectedCity = useLocationStore((s) => s.selectedCity);
  const hasHydrated = useLocationStore((s) => s._hasHydrated);
  const city = hasHydrated ? _selectedCity : DEFAULT_CITY;

  const [weekendFrom, weekendTo] = weekendRange();
  // PARKED 2026-11-17 (Gautham): the "Tonight" quick pick. Re-enable with
  //   const today = isoDate(new Date()); { label: "Tonight", href: `/explore?view=events&date_from=${today}&date_to=${today}` },
  // (Explore's own "Today" date preset still exists.) See PARKED_README.md.
  const quickPicks = [
    { label: "This weekend", href: `/explore?view=events&date_from=${weekendFrom}&date_to=${weekendTo}` },
    { label: "Free", href: "/explore?view=events&free=true" },
    { label: "Online", href: eventType(EVENT_FORMATS.online) },
  ];

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    router.push(exploreHref("events", city.name, city.lat, city.lng, { q: q.trim() }));
  }

  return (
    // overflow-x-clip (not hidden): the tilted polaroids and their shadows may poke
    // past the gutter, but clip leaves the y axis visible for the CityPicker popup.
    <section aria-label="Find something to do" className="overflow-x-clip" style={{ backgroundColor: "var(--brand-bg)", color: "var(--brand-text)" }}>
      <h1 className="sr-only">Find something to do, near you or online</h1>
      {/* Capped at 1360px and centred, like the mockup: the polaroids hug the chat
          card, and on a 1920px screen they would otherwise sit at the far edges. */}
      <div
        className={`${GUTTERS} mx-auto grid max-w-[1360px] grid-cols-1 items-center gap-x-10 gap-y-5 py-8 sm:py-12 xl:grid-cols-[minmax(0,1fr)_minmax(0,580px)_minmax(0,1fr)] xl:py-6 xl:pb-14`}
      >
        {/* Left polaroids */}
        <div className="relative z-0 hidden h-[480px] xl:col-start-1 xl:row-start-1 xl:block">
          {LEFT_POLAROIDS.map((card) => (
            <PolaroidCard key={card.src} card={card} />
          ))}
        </div>

        {/* Centre: avatar strip (below xl) + chat */}
        <div className="relative z-[2] flex min-w-0 flex-col gap-[22px] xl:col-start-2 xl:row-start-1">
          <div className="flex justify-center gap-2 xl:hidden">
            {AVATARS.map((a) => (
              <span key={a.src} className="relative h-[52px] w-[52px] flex-none overflow-hidden rounded-full border-2 border-[var(--hero-card)]">
                <Image src={a.src} alt={a.alt} fill sizes="52px" className={`object-cover ${a.position}`} />
              </span>
            ))}
          </div>

          <div className="overflow-hidden rounded-lg border border-[var(--brand-border)] bg-[var(--hero-card)] shadow-[var(--hero-shadow-card)]">
            <div className="flex flex-col gap-2.5 px-[22px] py-6">
              {CHAT.map((line) => {
                const right = line.side === "right";
                return (
                  <div
                    key={line.text}
                    className={`flex max-w-[88%] items-end gap-2.5 ${right ? "flex-row-reverse self-end" : "self-start"}`}
                  >
                    <span role="img" aria-label={line.label} className="flex h-10 w-10 flex-none items-center justify-center text-[30px] leading-none">
                      {line.emoji}
                    </span>
                    <div
                      className={`rounded-lg px-[18px] py-[11px] text-[18px] font-medium ${
                        right
                          ? "rounded-br-sm bg-[var(--hero-bubble-b)] text-[var(--hero-bubble-b-ink)]"
                          : "rounded-bl-sm bg-[var(--hero-bubble-a)] text-[var(--hero-bubble-a-ink)]"
                      }`}
                    >
                      {line.text}
                    </div>
                  </div>
                );
              })}

              <div className="mt-2 flex flex-col items-center gap-2.5 self-center text-center">
                <div className="rounded-lg bg-[var(--hero-callout)] px-6 py-3.5 text-[var(--hero-callout-ink)]">
                  <span className="mb-1 flex items-center justify-center gap-2 text-[18px] font-bold">
                    Don’t worry.
                    {/* The brand mark, not an emoji-style glyph. Ring/eyes/smile take the
                        callout's dark ink; the chin dot is the fixed terracotta. */}
                    <BrandMark className="h-7 w-7 flex-none" title="NewFind" />
                  </span>
                  <span className="block text-[clamp(26px,3vw,30px)] font-extrabold leading-[1.1] tracking-[-0.5px]">
                    Leave it with us.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Search: full-width row. z above the polaroids so the CityPicker popup
            (which opens downward) is never covered by a tilted card. */}
        <div className="relative z-[3] flex flex-col items-center gap-[18px] xl:col-span-3 xl:row-start-2">
          {/* Not overflow-hidden: the CityPicker popup opens below this bar. */}
          <form
            role="search"
            onSubmit={onSearch}
            className="flex w-full max-w-[880px] flex-wrap items-center gap-2 rounded-lg border-2 border-[var(--brand-control-border)] bg-[var(--hero-search)] p-2 shadow-[var(--hero-shadow-card)] focus-within:border-[var(--brand-green)]"
          >
            {/* The bar is white in both themes, so its ink is set per part, not on the
                form: CityPicker's popup inherits colour and sits on --brand-surface,
                which is dark in the dark theme. */}
            <label className="flex min-w-0 flex-[1_1_220px] items-center gap-2.5 px-3 text-[var(--hero-search-ink)]">
              <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="flex-none">
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" />
              </svg>
              <span className="sr-only">What are you into?</span>
              <input
                type="text"
                name="q"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Try pottery, marathon, dance,…"
                className="h-12 min-w-0 flex-1 bg-transparent text-[17px] text-[var(--hero-search-ink)] outline-none placeholder:text-[var(--brand-muted)]"
              />
            </label>
            <div className="sm:border-l-2 sm:border-[var(--brand-control-border)] sm:pl-1 [&_button[aria-expanded]]:text-[var(--hero-search-ink)]">
              <CityPicker />
            </div>
            <button
              type="submit"
              className="h-12 grow rounded-lg bg-[var(--brand-green)] px-6 text-[18px] sm:grow-0 font-bold text-[var(--brand-on-green)] transition-colors hover:bg-[var(--brand-green-hover)]"
            >
              Find something
            </button>
          </form>

          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="mr-1 text-[17px] text-[var(--brand-hint)]">Or just:</span>
            {quickPicks.map((p) => (
              <Link key={p.label} href={p.href} className={`${CHIP} px-4 py-2 text-[17px] font-semibold`}>
                {p.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Right polaroids */}
        <div className="relative z-0 hidden h-[480px] xl:col-start-3 xl:row-start-1 xl:block">
          {RIGHT_POLAROIDS.map((card) => (
            <PolaroidCard key={card.src} card={card} />
          ))}
        </div>
      </div>
    </section>
  );
}
