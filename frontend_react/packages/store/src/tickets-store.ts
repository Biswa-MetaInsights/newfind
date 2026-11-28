import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface StoredTicket {
  id: string;
  event_id: string;
  event_title: string;
  eventUnavailable?: boolean;
  start_date: string;
  /** The event's IANA zone, so a ticket card shows the VENUE's clock time, not the browser's.
   *  Optional: tickets persisted before this field existed have none and fall back to browser time. */
  timezone?: string;
  price_paid: number;
  /** Currency the ticket was actually paid in — stored per ticket, NOT looked
   *  up from the event later. Optional because tickets persisted to
   *  localStorage before this field existed have no value; those fall back to
   *  the platform default when rendered. */
  currency?: string;
  seat_info: string;
  qr_hash: string;
  claimed_at: string;
}

interface TicketsState {
  tickets: StoredTicket[];
  addTicket: (ticket: StoredTicket) => void;
  clearTickets: () => void;
}

export const useTicketsStore = create<TicketsState>()(
  persist(
    (set) => ({
      tickets: [],
      addTicket: (ticket) =>
        set((s) => ({ tickets: [ticket, ...s.tickets] })),
      clearTickets: () => set({ tickets: [] }),
    }),
    { name: "eventmind-tickets" }
  )
);
