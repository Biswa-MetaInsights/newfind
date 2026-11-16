/**
 * Builds a link into the unified Explore page, scoped to a city (matched by name
 * on the Explore side, or by lat/lng when given) and the relevant view.
 *
 * Shared by the home carousels' "View all" and the hero's search bar, so both
 * land on Explore with the same city params.
 *
 * PARKED 2026-08-14 (MVP) — the param was `view: "events" | "communities"`;
 * narrowed to "events" while communities are deferred to Phase 2.
 */
export function exploreHref(
  view: "events",
  cityName: string,
  lat?: number,
  lng?: number,
  extra?: Record<string, string>,
): string {
  const params = new URLSearchParams({ view, city: cityName });
  if (lat != null && lng != null) {
    params.set("lat", String(lat));
    params.set("lng", String(lng));
  }
  for (const [key, value] of Object.entries(extra ?? {})) {
    if (value) params.set(key, value);
  }
  return `/explore?${params}`;
}
