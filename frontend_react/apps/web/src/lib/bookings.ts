import { apiClient, authApi, eventsApi } from "@eventmind/api";
import type { StoredTicket } from "@eventmind/store";
import type { Event } from "@eventmind/types";

type TicketEvent = Pick<Event, "title" | "start_date" | "timezone" | "currency">;

interface TicketRecord {
  id: string;
  event_id: string;
  price_paid: number;
  qr_code_hash: string;
  purchased_at: string;
  event?: TicketEvent | null;
}

function storedTicket(ticket: TicketRecord, event: TicketEvent | null): StoredTicket {
  return {
    id: ticket.id, event_id: ticket.event_id, event_title: event?.title ?? "Event unavailable",
    start_date: event?.start_date ?? "", timezone: event?.timezone, currency: event?.currency,
    eventUnavailable: event === null,
    price_paid: ticket.price_paid, seat_info: "General Admission",
    qr_hash: ticket.qr_code_hash, claimed_at: ticket.purchased_at,
  };
}

export async function loadBookings(): Promise<StoredTicket[]> {
  const { data: user } = await authApi.me();
  const { data } = await apiClient.get<TicketRecord[]>(`/ticket/user/${user.id}`);
  // Older backends omit summaries. Share one fallback lookup per event.
  const lookups = new Map<string, Promise<TicketEvent | null>>();
  return Promise.all(data.map(async (ticket) => {
    if (ticket.event !== undefined) return storedTicket(ticket, ticket.event);
    let lookup = lookups.get(ticket.event_id);
    if (!lookup) {
      lookup = eventsApi.get(ticket.event_id).then(({data}) => data).catch(() => null);
      lookups.set(ticket.event_id, lookup);
    }
    return storedTicket(ticket, await lookup);
  }));
}

export async function bookFreeEvent(eventId: string, quantity: number, requestId: string) {
  const { data: user } = await authApi.me();
  const { data } = await apiClient.post<TicketRecord[]>("/ticket/book", {
    event_id: eventId, user_id: user.id, quantity, request_id: requestId,
  });
  const event = await eventsApi.get(eventId).then(({data}) => data).catch(() => null);
  return data.map(ticket => storedTicket(ticket, event));
}
