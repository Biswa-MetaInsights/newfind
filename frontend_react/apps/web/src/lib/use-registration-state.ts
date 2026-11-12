'use client';
import { useEffect, useState } from 'react';
import type { Event } from '@eventmind/types';
import { registrationState } from './registration-state';

/** Recheck when a page crosses the event's start/end, without requiring a reload. */
export function useRegistrationState(event?: Event) {
  const [now, setNow] = useState(() => Date.now());
  const start = event?.start_date;
  const end = event?.end_date;
  useEffect(() => {
    const boundaries = [Date.parse(start ?? ''), Date.parse(end ?? '')].filter(time => Number.isFinite(time) && time > now);
    if (!boundaries.length) return;
    const timer = window.setTimeout(() => setNow(Date.now()), Math.min(2_147_483_647, Math.max(0, Math.min(...boundaries) - Date.now() + 1)));
    return () => window.clearTimeout(timer);
  }, [start, end, now]);
  return event ? registrationState(event, now) : {available: false, label: 'Loading event…'};
}
