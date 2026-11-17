/**
 * Local-date helpers shared by /explore's date presets and the home hero's quick
 * picks, so the two cannot disagree about what "today" or "this weekend" means.
 */

// Local-date ISO (YYYY-MM-DD). toISOString() would shift the day for anyone
// east/west of UTC, which is exactly the bug that makes "Today" return nothing.
export const isoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const addDays = (d: Date, n: number) => {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
};

/**
 * [from, to] for "this weekend" as ISO dates. Saturday–Sunday of the coming
 * weekend; on a Saturday or Sunday it starts today, so the range is never in the
 * past (matching Explore's presets, which all start at today).
 */
export function weekendRange(now: Date = new Date()): [string, string] {
  const dow = now.getDay(); // 0 = Sunday
  const sunday = addDays(now, (7 - dow) % 7);
  const saturday = dow === 0 ? now : addDays(sunday, -1);
  const from = dow === 6 || dow === 0 ? now : saturday;
  return [isoDate(from), isoDate(sunday)];
}
