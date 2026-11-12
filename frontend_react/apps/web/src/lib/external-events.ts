import type { Event } from "@eventmind/types";

const PROVIDER_DOMAINS = new Set([
  "ticketmaster.com", "ticketmaster.be", "ticketmaster.nl", "ticketmaster.lu",
  "ticketmaster.de", "ticketmaster.fr", "ticketmaster.co.uk", "ticketmaster.ie",
  "ticketmaster.es", "ticketmaster.at", "ticketmaster.ch", "ticketmaster.se",
  "ticketmaster.dk", "ticketmaster.no", "ticketmaster.fi", "ticketmaster.it",
  "ticketmaster.pl", "ticketmaster.cz", "ticketmaster.co.nz", "ticketmaster.com.au",
  "ticketmaster.ca", "ticketmaster.com.mx", "ticketmaster.sg",
]);

export const isExternalEvent = (event: Pick<Event, "source">): boolean =>
  !!event.source && event.source !== "native";

export const externalProviderName = (event: Pick<Event, "source">): string =>
  event.source === "openagenda" ? "OpenAgenda" : event.source === "ticketmaster" ? "Ticketmaster" : "original provider";

export function externalTicketUrl(event: Pick<Event, "source" | "event_website">): string | undefined {
  if (!["ticketmaster", "openagenda"].includes(event.source || "") || !event.event_website) return undefined;
  try {
    const url = new URL(event.event_website);
    if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443")) return undefined;
    const host = url.hostname.toLowerCase();
    const domains = event.source === "openagenda" ? ["openagenda.com"] : [...PROVIDER_DOMAINS];
    return domains.some(domain => host === domain || host.endsWith(`.${domain}`))
      ? url.href : undefined;
  } catch { return undefined; }
}
