import type { Event } from "@eventmind/types";

const PROVIDER_DOMAINS = new Set([
  "ticketmaster.com", "ticketmaster.be", "ticketmaster.nl", "ticketmaster.lu",
  "ticketmaster.de", "ticketmaster.fr", "ticketmaster.co.uk", "ticketmaster.ie",
  "ticketmaster.es", "ticketmaster.at", "ticketmaster.ch", "ticketmaster.se",
  "ticketmaster.dk", "ticketmaster.no", "ticketmaster.fi", "ticketmaster.it",
  "ticketmaster.pl", "ticketmaster.cz", "ticketmaster.co.nz", "ticketmaster.com.au",
  "ticketmaster.ca", "ticketmaster.com.mx", "ticketmaster.sg",
]);

const AGENDA_BRUSSELS_DOMAINS = ["agenda.brussels", "agenda.be", "visit.brussels"];

export const isExternalEvent = (event: Pick<Event, "source">): boolean =>
  !!event.source && event.source !== "native";

export const externalProviderName = (event: Pick<Event, "source">): string =>
  event.source === "openagenda" ? "OpenAgenda" : event.source === "ticketmaster" ? "Ticketmaster" : event.source === "agenda_brussels" ? "visit.brussels" : "original provider";

export function externalTicketUrl(event: Pick<Event, "source" | "event_website">): string | undefined {
  if (!["ticketmaster", "openagenda", "agenda_brussels"].includes(event.source || "") || !event.event_website) return undefined;
  try {
    const url = new URL(event.event_website);
    if (url.username || url.password || (url.port && url.port !== "443" && url.protocol === "https:")) return undefined;
    const host = url.hostname.toLowerCase();
    const domains = event.source === "openagenda"
      ? ["openagenda.com"]
      : event.source === "agenda_brussels"
        ? AGENDA_BRUSSELS_DOMAINS
        : [...PROVIDER_DOMAINS];
    const trustedHost = domains.some(domain => host === domain || host.endsWith(`.${domain}`));
    if (!trustedHost) return undefined;
    // The API documentation shows HTTP endpoints. Upgrade known provider event
    // links to HTTPS rather than sending users to an unencrypted provider page.
    if (url.protocol === "http:") {
      url.protocol = "https:";
      url.port = "";
    }
    if (url.protocol !== "https:" || (url.port && url.port !== "443")) return undefined;
    return url.href;
  } catch { return undefined; }
}
