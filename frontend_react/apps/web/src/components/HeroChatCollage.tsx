"use client";

// PARKED 2026-11-18 (hero search bar + quick picks): the imports below are only used by the
// search bar / quick picks, which are commented out further down. Restore them together.
// import { useState } from "react";
import Image from "next/image";
// import Link from "next/link";
// import { useRouter } from "next/navigation";
// import { useLocationStore, DEFAULT_CITY } from "@eventmind/store";
// import { EVENT_FORMATS } from "@eventmind/types";
// import { CityPicker } from "@/components/CityPicker";
import { BrandMark } from "@/components/brand/BrandMark";
import { GUTTERS } from "@/lib/layout";
// import { exploreHref } from "@/lib/explore-href";
// import { weekendRange } from "@/lib/date-range";

// The home hero: two polaroids either side of a fake group chat that ends with
// NewFind's answer. (The search bar and quick picks that sat underneath are PARKED
// 2026-11-18 — commented out below; see PARKED_README.md.)
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
// hidden and a single row of small polaroids (as many of the eight as fit) sits under the
// chat card instead.
//
// From 1536px each side column holds FOUR polaroids: the original pair hugging the
// chat card, plus an "outer" pair further out (marked OUTER_ONLY below). They live in
// the side columns only — never below the search bar, which is its own row — and
// they match the originals' sizes, hug the inner pair (overlapping it by ~30px so
// the cluster reads as one collage) and are staggered so a column's stack still ends
// inside its 480px. Below 1536 the side columns are too narrow for two stacks and the
// outer pair is hidden.
//
// The mockup collapses at 1000px, but at 1024–1279px the side columns are only ~130–260px
// wide — narrower than the polaroids — so they would slide under the chat card.

type ChatLine = { side: "left" | "right"; emoji: string; label: string; text: string };

const CHAT: ChatLine[] = [
  { side: "left", emoji: "😃", label: "Excited", text: "we should do something tonight" },
  { side: "right", emoji: "🤩", label: "Star-struck", text: "yesssss. but what’s the plan?" },
  { side: "left", emoji: "🤷", label: "Shrugging", text: "idk, you pick" },
  { side: "right", emoji: "🥺", label: "Pleading face", text: "i have no clue" },
  { side: "left", emoji: "🙄", label: "Eye roll", text: "classic." },
];

// PARKED 2026-11-18 (hero search bar + quick picks) — used only by the quick picks.
// // Explore reads `event_type` for format and `free=true` for price. "Online" is a
// // FORMAT, never a category.
// const eventType = (format: string) => `/explore?view=events&event_type=${encodeURIComponent(format)}`;
//
// // ⚠️ These are <Link>s, so they cannot take OUTLINE_BUTTON: its hover rules are
// // all `enabled:`, and :enabled matches only form controls — on an <a> the hover
// // fill would never fire. Same colours, written without the guard.
// const CHIP =
//   "inline-flex items-center rounded-lg border-2 border-[var(--brand-control-border)] text-[var(--brand-text)] " +
//   "transition-colors hover:border-[var(--brand-green)] hover:bg-[var(--brand-green)] hover:text-[var(--brand-on-green)] " +
//   "[@media(pointer:coarse)]:min-h-11";

type Polaroid = {
  src: string;
  alt: string;
  caption: string;
  emoji: string;
  // Mirror the emoji horizontally. 🚶 faces left on most platforms and the newer
  // right-facing sequence (🚶‍➡️) is not in every OS font (Windows 10 shows two glyphs).
  flipEmoji?: boolean;
  // Placement, width, tilt and stacking are literal class strings so Tailwind's
  // source scan can see them. Values are the mockup's.
  place: string;
  photoHeight: string;
  position: string;
  priority?: boolean;
};

// Visibility gate for the outer pair. Literal string so Tailwind's scan sees it.
const OUTER_ONLY = "hidden min-[1536px]:block";

const LEFT_POLAROIDS: Polaroid[] = [
  {
    src: "/hero/hero-5.jpg",
    alt: "A player focused on the next shot in a table tennis match",
    caption: "table tennis club",
    emoji: "🔥",
    place: "left-[26px] top-0 z-[2] w-[176px] rotate-[-6deg] min-[1536px]:left-auto min-[1536px]:right-[18px]",
    photoHeight: "h-[202px]",
    position: "object-[45%_50%]",
    priority: true,
  },
  {
    src: "/hero/hero-7.jpg",
    alt: "Two children laughing as they paint in a workshop",
    caption: "painting class",
    emoji: "🎨",
    place: "left-[84px] top-[200px] z-[1] w-[194px] rotate-[4deg] min-[1536px]:left-auto min-[1536px]:right-[-7px]",
    photoHeight: "h-[176px]",
    position: "object-[57%_50%]",
  },
  {
    src: "/hero/hero-8.jpg",
    alt: "A comedian smiling into the microphone in front of a green velvet curtain",
    caption: "open mic night",
    emoji: "🎤",
    place: `${OUTER_ONLY} left-auto right-[172px] top-[-14px] z-[1] w-[176px] rotate-[5deg]`,
    photoHeight: "h-[202px]",
    position: "object-[50%_50%]",
  },
  {
    src: "/hero/hero-3.jpg",
    alt: "A woman laughing at a table in a lantern-lit night food market",
    caption: "offline meetups",
    emoji: "🤝",
    place: `${OUTER_ONLY} left-auto right-[181px] top-[203px] z-0 w-[194px] rotate-[-4deg]`,
    photoHeight: "h-[176px]",
    position: "object-[50%_50%]",
  },
];

const RIGHT_POLAROIDS: Polaroid[] = [
  {
    src: "/hero/hero-4.jpg",
    alt: "A man meditating calmly at sunrise yoga",
    caption: "sunrise yoga",
    emoji: "🧘🏻",
    place: "right-[21px] top-0 z-[2] w-[184px] rotate-[6deg] min-[1536px]:right-auto min-[1536px]:left-[18px]",
    photoHeight: "h-[184px]",
    position: "object-[50%_50%]",
    priority: true,
  },
  {
    src: "/hero/hero-1.jpg",
    alt: "Three friends laughing over coffee and open books in a café book club",
    caption: "book club",
    emoji: "📚",
    place: "right-[92px] top-[191px] z-[1] w-[184px] rotate-[-5deg] min-[1536px]:right-auto min-[1536px]:left-[190px] min-[1536px]:top-[203px] min-[1536px]:z-0 min-[1536px]:rotate-[4deg]",
    photoHeight: "h-[164px]",
    position: "object-[56%_50%]",
  },
  {
    src: "/hero/hero-2.jpg",
    alt: "A woman laughing on a video call with her online book club",
    caption: "online meetup",
    emoji: "😀",
    place: `${OUTER_ONLY} left-[188px] top-[-14px] z-[1] w-[184px] rotate-[-5deg]`,
    photoHeight: "h-[184px]",
    position: "object-[88%_50%]",
  },
  {
    src: "/hero/hero-6.jpg",
    alt: "Three friends chatting as they walk along an autumn woodland path",
    caption: "outdoor walks",
    emoji: "🚶",
    flipEmoji: true,
    place: `${OUTER_ONLY} left-[-4px] top-[203px] z-[1] w-[184px] rotate-[-5deg]`,
    photoHeight: "h-[164px]",
    position: "object-[50%_50%]",
  },
];

// Below `xl` the big side columns give way to SMALL polaroids, and the chat card is held at
// 400px instead of stretching with the screen. Eight photos in two groups:
//   · below `sm`, a single ROW on the page background under the chat card (the big collage's
//     outer four, as many as the row's width holds), which gives way to
//   · from `sm`, the inner four as two STACKS beside the card, two a side. They grow with the
//     room they have and top out at 130px (~tablet width), then hold until `xl`, where the
//     big collage takes over.
// Tilts and visibility gates are literal class strings so Tailwind's scan sees them.
//
// ⚠️ The 400px card width is written in three places that must change together: the grid's
// `sm:grid-cols-[…_minmax(0,400px)_…]` and the centre column's `max-w-[400px]` (both in
// HeroChatCollage below). The stacks' 130px cap is `PolaroidStack`'s `w-[min(130px,100cqw)]`.

// ⚠️ Row cards are 92px wide with an 8px gap, so n cards need 100n − 8px; each gate is that
// plus 12px of room for the tilt and shadow (n=3 → 304, n=4 → 404). Change the width or gap
// and every gate must follow. The first two always show (192px).
const ROW_POLAROIDS: { card: Polaroid; tilt: string; gate: string }[] = [
  { card: LEFT_POLAROIDS[2], tilt: "rotate-[-5deg]", gate: "" },
  { card: RIGHT_POLAROIDS[2], tilt: "rotate-[4deg]", gate: "" },
  { card: LEFT_POLAROIDS[3], tilt: "rotate-[-3deg]", gate: "hidden @min-[304px]:block" },
  { card: RIGHT_POLAROIDS[3], tilt: "rotate-[5deg]", gate: "hidden @min-[404px]:block" },
];

// ⚠️ The side stacks hold the SAME photos, in the same order and tilt, as the big collage's
// inner pair at `xl` (LEFT/RIGHT_POLAROIDS[0] on top, [1] under it), so a side never swaps
// its pictures as the screen widens. The row below the card holds the outer four.
const LEFT_SIDE_POLAROIDS: { card: Polaroid; tilt: string }[] = [
  { card: LEFT_POLAROIDS[0], tilt: "rotate-[-6deg]" },
  { card: LEFT_POLAROIDS[1], tilt: "rotate-[4deg]" },
];
const RIGHT_SIDE_POLAROIDS: { card: Polaroid; tilt: string }[] = [
  { card: RIGHT_POLAROIDS[0], tilt: "rotate-[6deg]" },
  { card: RIGHT_POLAROIDS[1], tilt: "rotate-[-5deg]" },
];

// One small polaroid. Width comes from the caller; the photo keeps one proportion (80:76,
// the row's 92px card) at every size so a side card scales as a whole.
function SmallPolaroid({ card, tilt, className = "" }: { card: Polaroid; tilt: string; className?: string }) {
  return (
    <div
      className={`box-border flex-none rounded-lg bg-[var(--hero-polaroid)] px-1.5 pt-1.5 text-[var(--hero-polaroid-ink)] shadow-[var(--hero-shadow-polaroid)] ${tilt} ${className}`}
    >
      <div className="relative aspect-[80/76] overflow-hidden rounded-[3px]">
        {/* Drawn at up to ~112px tall × 16/9 ≈ 200px wide, hence 200px (see PolaroidCard). */}
        <Image src={card.src} alt={card.alt} fill sizes="200px" className={`object-cover ${card.position}`} />
      </div>
      <div aria-hidden="true" className="flex h-7 items-center justify-center text-[15px] leading-none">
        <span className={card.flipEmoji ? "inline-block -scale-x-100" : ""}>{card.emoji}</span>
      </div>
    </div>
  );
}

// A container query, not a viewport breakpoint: the room the row has is its own width,
// which is the page column minus the gutters, not a fixed fraction of the screen.
function PolaroidRow({ className = "" }: { className?: string }) {
  return (
    <div className={`@container w-full ${className}`}>
      <div className="flex justify-center gap-2 py-1">
        {ROW_POLAROIDS.map(({ card, tilt, gate }) => (
          <SmallPolaroid key={card.src} card={card} tilt={tilt} className={`w-[92px] ${gate}`} />
        ))}
      </div>
    </div>
  );
}

// A side stack: two small polaroids one above the other, vertically centred beside the card.
// The column is a size container, so each card is as wide as the column allows (100cqw) up
// to SIDE_MAX_W — they grow with the screen, then stop.
function PolaroidStack({ items, className = "" }: { items: { card: Polaroid; tilt: string }[]; className?: string }) {
  return (
    <div className={`@container flex min-w-0 flex-col items-center justify-center gap-3 ${className}`}>
      {items.map(({ card, tilt }) => (
        <SmallPolaroid key={card.src} card={card} tilt={tilt} className="w-[min(130px,100cqw)]" />
      ))}
    </div>
  );
}

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
          // ⚠️ NOT the frame's width. The frame is a portrait/square window and the
          // photo is 16:9 under object-cover, so the photo is DRAWN at frame height ×
          // 16/9 — 409px for the tallest (230px) frame. A "220px" here made the browser
          // fetch the 256w file and stretch it ~1.6×, which read as a blurry photo.
          // 420px covers the tallest frame; the shorter ones just over-fetch a little.
          sizes="420px"
          className={`object-cover ${card.position}`}
          priority={card.priority}
        />
      </div>
      <div className="flex h-11 items-center gap-1.5">
        {/* Handwriting: the one approved exception to the single app font. Caveat
            runs small for its point size, hence 26px against the old 20px. */}
        <span className="font-[family-name:var(--font-hand)] text-[22px] font-bold leading-none">{card.caption}</span>
        <span aria-hidden="true" className={`text-[16px] ${card.flipEmoji ? "inline-block -scale-x-100" : ""}`}>
          {card.emoji}
        </span>
      </div>
    </div>
  );
}

export function HeroChatCollage() {
  // PARKED 2026-11-18 (hero search bar + quick picks): state, handler and quick-pick list.
  // const router = useRouter();
  // const [q, setQ] = useState("");
  //
  // // Same hydration guard as the home page: the persisted city is only trusted
  // // once the store has rehydrated.
  // const _selectedCity = useLocationStore((s) => s.selectedCity);
  // const hasHydrated = useLocationStore((s) => s._hasHydrated);
  // const city = hasHydrated ? _selectedCity : DEFAULT_CITY;
  //
  // const [weekendFrom, weekendTo] = weekendRange();
  // // PARKED 2026-11-17 (Gautham): the "Tonight" quick pick. Re-enable with
  // //   const today = isoDate(new Date()); { label: "Tonight", href: `/explore?view=events&date_from=${today}&date_to=${today}` },
  // // (Explore's own "Today" date preset still exists.) See PARKED_README.md.
  // const quickPicks = [
  //   { label: "This weekend", href: `/explore?view=events&date_from=${weekendFrom}&date_to=${weekendTo}` },
  //   { label: "Free", href: "/explore?view=events&free=true" },
  //   { label: "Online", href: eventType(EVENT_FORMATS.online) },
  // ];
  //
  // function onSearch(e: React.FormEvent) {
  //   e.preventDefault();
  //   router.push(exploreHref("events", city.name, city.lat, city.lng, { q: q.trim() }));
  // }

  return (
    // overflow-x-clip (not hidden): the tilted polaroids and their shadows may poke
    // past the gutter, but clip leaves the y axis visible for the CityPicker popup.
    <section aria-label="Find something to do" className="overflow-x-clip" style={{ backgroundColor: "var(--brand-bg)", color: "var(--brand-text)" }}>
      <h1 className="sr-only">Find something to do, near you or online</h1>
      {/* Capped at 1360px and centred, like the mockup: the polaroids hug the chat
          card, and on a 1920px screen they would otherwise sit at the far edges. */}
      <div
        className={`${GUTTERS} mx-auto grid max-w-[1360px] min-[1536px]:max-w-[1760px] grid-cols-1 items-center gap-y-5 py-8 sm:grid-cols-[minmax(0,1fr)_minmax(0,400px)_minmax(0,1fr)] sm:gap-x-3 sm:py-12 xl:grid-cols-[minmax(0,1fr)_minmax(0,520px)_minmax(0,1fr)] xl:gap-x-10 xl:py-6 xl:pb-14`}
      >
        {/* Left polaroids */}
        <div className="relative z-0 hidden h-[420px] xl:col-start-1 xl:row-start-1 xl:block">
          {LEFT_POLAROIDS.map((card) => (
            <PolaroidCard key={card.src} card={card} />
          ))}
        </div>

        {/* Below xl: the first side stack (sm+ only, see PolaroidStack) */}
        <PolaroidStack items={LEFT_SIDE_POLAROIDS} className="hidden sm:col-start-1 sm:row-start-1 sm:flex xl:hidden" />

        {/* Centre: chat. Held at 400px below xl (the grid column is already 400 from sm; the
            max-w covers the single-column phone layout) and 520px from xl. */}
        <div className="relative z-[2] flex w-full min-w-0 max-w-[400px] flex-col gap-[22px] justify-self-center sm:col-start-2 sm:row-start-1 xl:col-start-2 xl:row-start-1 xl:max-w-none">
          <div className="overflow-hidden rounded-lg border border-[var(--brand-border)] bg-[var(--hero-card)] shadow-[var(--hero-shadow-card)]">
            <div className="flex flex-col gap-2.5 px-[22px] py-6">
              {CHAT.map((line) => {
                const right = line.side === "right";
                return (
                  <div
                    key={line.text}
                    className={`flex max-w-[88%] items-end gap-2.5 ${right ? "flex-row-reverse self-end" : "self-start"}`}
                  >
                    <span role="img" aria-label={line.label} className="flex h-9 w-9 flex-none items-center justify-center text-[26px] leading-none">
                      {line.emoji}
                    </span>
                    <div
                      className={`rounded-lg px-[18px] py-[11px] text-body font-medium ${
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
                  <span className="mb-1 flex items-center justify-center gap-2 text-body font-bold">
                    Don’t worry.
                    {/* The brand mark, not an emoji-style glyph. Ring/eyes/smile take the
                        callout's dark ink; the chin dot is the fixed terracotta. */}
                    <BrandMark className="h-7 w-7 flex-none" title="NewFind" />
                  </span>
                  <span className="block text-[clamp(22px,2.6vw,26px)] font-extrabold leading-[1.1] tracking-[-0.5px]">
                    Leave it with us.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* The second side stack (sm → xl), then the polaroid row on the page background under
            the chat card (its own grid row, so gap-y spaces it). The row is phone-only: it
            gives way to the side stacks at sm. The stack is hidden from xl, where the big side
            columns take over. */}
        <PolaroidStack items={RIGHT_SIDE_POLAROIDS} className="hidden sm:col-start-3 sm:row-start-1 sm:flex xl:hidden" />
        <PolaroidRow className="sm:hidden" />

        {/* PARKED 2026-11-18 (Gautham): hero search bar + "Or just:" quick-pick chips.
            Removing the row also removes its grid row and gap, so the collage now ends
            the section. Restore together with the imports, state and consts commented
            out above. Inner comments below are written as [[ ]] because a JSX comment
            cannot nest.

        [[ Search: full-width row. z above the polaroids so the CityPicker popup
            (which opens downward) is never covered by a tilted card. ]]
        <div className="relative z-[3] flex flex-col items-center gap-[18px] xl:col-span-3 xl:row-start-2">
          [[ Not overflow-hidden: the CityPicker popup opens below this bar. ]]
          <form
            role="search"
            onSubmit={onSearch}
            className="flex w-full max-w-[880px] flex-wrap items-center gap-2 rounded-lg border-2 border-[var(--brand-control-border)] bg-[var(--hero-search)] p-2 shadow-[var(--hero-shadow-card)] focus-within:border-[var(--brand-green)]"
          >
            [[ The bar is white in both themes, so its ink is set per part, not on the
                form: CityPicker's popup inherits colour and sits on --brand-surface,
                which is dark in the dark theme. ]]
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
                className="h-12 min-w-0 flex-1 bg-transparent text-small text-[var(--hero-search-ink)] outline-none placeholder:text-[var(--brand-muted)]"
              />
            </label>
            <div className="sm:border-l-2 sm:border-[var(--brand-control-border)] sm:pl-1 [&_button[aria-expanded]]:text-[var(--hero-search-ink)]">
              <CityPicker />
            </div>
            <button
              type="submit"
              className="h-12 grow rounded-lg bg-[var(--brand-green)] px-6 text-control sm:grow-0 font-bold text-[var(--brand-on-green)] transition-colors hover:bg-[var(--brand-green-hover)]"
            >
              Find something
            </button>
          </form>

          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="mr-1 text-small text-[var(--brand-hint)]">Or just:</span>
            {quickPicks.map((p) => (
              <Link key={p.label} href={p.href} className={`${CHIP} px-4 py-2 text-control font-semibold`}>
                {p.label}
              </Link>
            ))}
          </div>
        </div>
        */}

        {/* Right polaroids */}
        <div className="relative z-0 hidden h-[420px] xl:col-start-3 xl:row-start-1 xl:block">
          {RIGHT_POLAROIDS.map((card) => (
            <PolaroidCard key={card.src} card={card} />
          ))}
        </div>
      </div>
    </section>
  );
}
