import type { Event } from '@eventmind/types';

type RegistrationEvent = Pick<Event, 'status' | 'start_date' | 'end_date' | 'capacity' | 'tickets_sold' | 'source'>;
export function registrationState(event: RegistrationEvent, now: number) {
  const status = event.status.toLowerCase();
  if (status === 'cancelled') return {available: false, label: 'Event cancelled'};
  const start = Date.parse(event.start_date);
  const end = Date.parse(event.end_date);
  if (status === 'completed' || (Number.isFinite(end) && end <= now)) return {available: false, label: 'Event ended'};
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return {available: false, label: 'Registration unavailable'};
  if (status === 'registration_closed' || start <= now) return {available: false, label: 'Registration closed'};
  if (status !== 'published') return {available: false, label: 'Registration unavailable'};
  if ((!event.source || event.source === 'native') && event.capacity > 0 && event.tickets_sold >= event.capacity) return {available: false, label: 'Sold Out'};
  return {available: true, label: 'Book Now'};
}
