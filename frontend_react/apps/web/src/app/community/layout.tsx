// ⚠️ PARKED 2026-11-17 — THIS WHOLE FILE IS THE PARK (copied from OLD page's
// app/community/layout.tsx, parked there 2026-08-14).
//
// Communities must not be visible to users anywhere (PARKED_README.md). This
// layout is the single choke point for every route under /community/* — the
// detail page, the create page, and anything added later. It is a server
// component, so it runs before the (client) pages beneath it and they never
// render. That is why none of those pages needed editing: they sit on disk
// complete and still type-checked, ready for Phase 2.
//
// Covered by this one file:
//   /community/create        → home
//   /community/<slug>        → home
//   /community               → 404 (no page.tsx at this level; nothing to show)
//
// NOT covered — a route handler and a metadata route are separate route entries
// that a layout never wraps, so they are parked in their own files (PARKED = true):
//   /community/<slug>/opengraph-image
//   /community/<slug>/story
//
// PHASE 2 RESTORE: swap the live function for the pass-through layout commented
// out at the bottom of this file.
import { redirect } from "next/navigation";

// Takes no props on purpose: it never renders its children, and naming an unused
// `children` param only earns a lint warning. A zero-arg component is still a
// valid layout.
export default function ParkedCommunitySegment() {
  redirect("/");
}

// The pass-through layout this replaced:
// export default function CommunityLayout({children}:{children:React.ReactNode}) { return children; }
