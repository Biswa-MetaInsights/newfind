/** Venue wall times are converted explicitly; browser time zones never decide the event time. */
export function localEventTime(iso: string, zone: string): string {
  const parts = new Intl.DateTimeFormat('en-GB', {timeZone: zone, year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(iso));
  const get=(type:string)=>parts.find(p=>p.type===type)?.value??'';
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
}
export function eventTimeUtc(value: string, zone: string): Date {
  if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) throw new Error('Enter a valid event date and time.');
  const [date,time]=value.split('T'),[y,m,d]=date.split('-').map(Number),[h,min]=time.split(':').map(Number);
  const target=Date.UTC(y,m-1,d,h,min);
  let guess=target;
  for(let i=0;i<4;i++){
    const represented=localEventTime(new Date(guess).toISOString(),zone);
    if(represented===value)return new Date(guess);
    const [rd,rt]=represented.split('T'),[ry,rm,rday]=rd.split('-').map(Number),[rh,rmin]=rt.split(':').map(Number);
    guess-=Date.UTC(ry,rm-1,rday,rh,rmin)-target;
  }
  throw new Error('This local time does not exist because the clocks change. Please choose another time.');
}

// English short zone names differ by locale: en-US gives "EST" for New York but "GMT+1" for Brussels,
// en-GB gives "CET"/"CEST", en-IN "IST", en-AU "AEDT". Try each until one is a real abbreviation
// (it follows the date, so Brussels reads CET in winter and CEST in summer); zones with no common
// English abbreviation (Tokyo) fall back to the "GMT+9" offset form.
const ZONE_LOCALES = ['en-US', 'en-GB', 'en-AU', 'en-IN', 'en-NZ', 'en-ZA', 'en-CA'];
export function zoneAbbreviation(date: Date, timeZone: string): string {
  let offsetForm = '';
  for (const locale of ZONE_LOCALES) {
    const name = new Intl.DateTimeFormat(locale, { timeZone, timeZoneName: 'short' }).formatToParts(date).find(p => p.type === 'timeZoneName')?.value ?? '';
    if (!offsetForm) offsetForm = name;
    if (name && !/^(GMT|UTC)[+\-\u2212]/.test(name)) return name;
  }
  return offsetForm;
}

/**
 * One moment as organiser-console text: "04 Dec 2026, 19:00 CET", in the EVENT's own time zone
 * (never the browser's, Gautham 2026-11-17). Used for every raw ISO the console used to print.
 * No zone (the event is not in the list, or a legacy row) falls back to the browser's zone with no
 * label; a value that is not a date (dummy fixtures hold ready-made text) is returned unchanged.
 */
export function formatEventMoment(value: string, zone?: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  let timeZone = zone || undefined;
  if (timeZone) { try { new Intl.DateTimeFormat('en-GB', { timeZone }); } catch { timeZone = undefined; } }
  const text = date.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone });
  return timeZone ? `${text} ${zoneAbbreviation(date, timeZone)}` : text;
}
