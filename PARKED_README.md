# NewFind: parked features

> **Parked = commented out or switched off, NOT deleted.** Each item is meant to come back, usually
> in a later phase. **Never delete parked code, and never "clean it up".** Every parked block carries a
> `PARKED <date> (<reason>)` marker, so `grep -rn "PARKED" frontend_react/` finds all of them.
>
> To bring one back: follow its **Re-enable** cell, remove the marker, run
> `pnpm --filter @eventmind/web type-check`, update `STATUS.md`, and add a `CHANGELOG.md` line.
> Why each one was parked: `DESIGN_NOTES.md` §1.
>
> **Status column:** `planned` means the decision is made but the code has not been changed yet
> (`Eventmind_files/review_resolution_plan.md` says which phase). Change it to `parked` when done.

| Feature | What is parked | Where | Parked | Why | Re-enable | Status |
|---|---|---|---|---|---|---|
| **Communities** | Everything user-visible: nav entry, `/communities`, `/community/**` pages (served as a redirect to `/`), OG/story images, and the "add this event to my community" section of the create form | `components/navbar/Navbar.tsx` (Participants menu), `app/community/layout.tsx` (redirect), `community/[slug]/opengraph-image.tsx` and `story/route.tsx` (`PARKED = true`), `app/communities/page.tsx`, `app/organizer/create/page.tsx`. Home/Explore/Footer were already parked on 2026-08-14. API and types (`packages/api`, `packages/types`) are untouched. | 2026-11-17 (earlier 2026-08-14) | Not part of the MVP / phase 1; decided by Gautham to hide from users | Swap `community/layout.tsx` back to the pass-through layout commented at its foot, set the two `PARKED` flags to `false`, replace the `/communities` redirect with the page body commented below it, uncomment the nav entry and the create form's four community pieces (state, lookup, `community_id`, section) plus `communityApi` in its import. Old page's parking is the model (`eventmind-newbackend`, same files). | parked |
| **Footer social icons** | X, Instagram and LinkedIn links (all `href="#"` for now) | `components/Footer.tsx`, in the `{/* Social icons */}` div | 2026-11-17 | Gautham: keep the code, don't show it; no real accounts to link yet | Uncomment the block and point the three links at the real profiles. Copied from Old page's `Footer.tsx`. | parked |
| **Visibility selector** (Public / Unlisted / Private) | The whole field on the create form; the form still sends `visibility: "public"` | `app/organizer/create/page.tsx` (Visibility `FormField`) | 2026-11-17 | Private events are not part of MVP / phase 1 and will be added in a later phase if needed. Unlisted parked with it. Backend and types still support all three. | Uncomment the field. Decide first whether Unlisted conflicts with the "all events are public" decision. | parked |
| **Explore map** | "Show map" button and the Leaflet/OpenStreetMap map | `app/explore/page.tsx` (results-count line); `components/EventMap.tsx` and the `leaflet` dependency are kept | 2026-11-17 | To keep city picking simple for users: Explore now uses the same city dropdown as the home page | Uncomment the `EventMap` import, the `mapOpen` state and the button/`<EventMap/>` block; the block needs moving out of the inline `<span>` it sat in. The sidebar's old `<details>` + `LocationSelector` control is commented beside its `CityPicker` replacement if the map's pin-drop comes back with it. | parked |
| **Hero "Tonight" quick pick** | One of four quick picks in the hero search | `components/HeroChatCollage.tsx` (`quickPicks`) | 2026-11-17 | It returned no results (backend `date_to` bug, `Eventmind_files/backend_to-do.md` §1) | Re-add the entry once the backend treats a date-only `date_to` as end of day. | parked |

## Dev-only tooling (not parked, never delete)
- **`frontend_testing/` (repo root) and `frontend_react/apps/web/src/frontend_testing/`** hold the dev flags, the organiser-setup bypass strip, the dev banner and the dummy-mode fixtures. They are switched off in production by `NODE_ENV`, not by commenting out, so they carry no `PARKED` marker. Do not delete or "clean up" either folder; `type-check` fails if they go. Rules: `frontend_testing/README.md`.

## Removed on purpose (not parked)
- **Photo on the sign-in / sign-up page.** The left panel keeps its solid green and logo link; `hero-3.png` stays in `public/hero`. Reason in `DESIGN_NOTES.md` §1.
- **Year on event cards.** The event page keeps the year. Reason in `DESIGN_NOTES.md` §1.
