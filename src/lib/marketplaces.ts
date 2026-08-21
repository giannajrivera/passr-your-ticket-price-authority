/**
 * Passr marketplace registry.
 *
 * This file defines the marketplaces Passr understands.
 *
 * IMPORTANT:
 * A marketplace being listed here does NOT mean Passr has live inventory
 * from that marketplace.
 *
 * `searchUrl` is only used when Passr does not yet have a direct listing URL.
 * Live marketplace inventory should eventually come from Passr's own
 * marketplace data API.
 */

export type MarketplaceId =
  | "ticketmaster"
  | "seatgeek"
  | "stubhub"
  | "vividseats"
  | "tickpick"
  | "ticketweb"
  | "axs"
  | "eventbrite"
  | "dice"
  | "partiful"
  | "posh";

export type MarketplaceDefinition = {
  id: MarketplaceId;
  name: string;
  website: string;

  /**
   * Used only as a fallback when Passr does not have a direct event URL.
   */
  buildSearchUrl?: (query: string) => string;
};

export const MARKETPLACES: MarketplaceDefinition[] = [
  {
    id: "ticketmaster",
    name: "Ticketmaster",
    website: "https://www.ticketmaster.com",
  },
  {
    id: "seatgeek",
    name: "SeatGeek",
    website: "https://seatgeek.com",
    buildSearchUrl: (query) =>
      `https://seatgeek.com/search?search=${encodeURIComponent(query)}`,
  },
  {
    id: "stubhub",
    name: "StubHub",
    website: "https://www.stubhub.com",
    buildSearchUrl: (query) =>
      `https://www.stubhub.com/search/?q=${encodeURIComponent(query)}`,
  },
  {
    id: "vividseats",
    name: "Vivid Seats",
    website: "https://www.vividseats.com",
    buildSearchUrl: (query) =>
      `https://www.vividseats.com/search?search=${encodeURIComponent(query)}`,
  },
  {
    id: "tickpick",
    name: "TickPick",
    website: "https://www.tickpick.com",
    buildSearchUrl: (query) =>
      `https://www.tickpick.com/search/?query=${encodeURIComponent(query)}`,
  },
  {
    id: "ticketweb",
    name: "TicketWeb",
    website: "https://www.ticketweb.com",
    buildSearchUrl: (query) =>
      `https://www.ticketweb.com/search?q=${encodeURIComponent(query)}`,
  },
  {
    id: "axs",
    name: "AXS",
    website: "https://www.axs.com",
    buildSearchUrl: (query) =>
      `https://www.axs.com/search?q=${encodeURIComponent(query)}`,
  },
  {
    id: "eventbrite",
    name: "Eventbrite",
    website: "https://www.eventbrite.com",
    buildSearchUrl: (query) =>
      `https://www.eventbrite.com/d/online/${encodeURIComponent(query)}/`,
  },
  {
    id: "dice",
    name: "DICE",
    website: "https://dice.fm",
    buildSearchUrl: (query) =>
      `https://dice.fm/search?q=${encodeURIComponent(query)}`,
  },
  {
    id: "partiful",
    name: "Partiful",
    website: "https://partiful.com",
  },
  {
    id: "posh",
    name: "Posh",
    website: "https://posh.vip",
  },
];

export function getMarketplace(
  id: MarketplaceId,
): MarketplaceDefinition | undefined {
  return MARKETPLACES.find(
    (marketplace) => marketplace.id === id,
  );
}

/**
 * Marketplace hostname patterns used to identify the actual
 * marketplace behind a provider's event URL.
 */
const MARKETPLACE_HOSTS: Array<{
  id: MarketplaceId;
  match: string[];
}> = [
  { id: "ticketmaster", match: ["ticketmaster.", "livenation."] },
  { id: "ticketweb", match: ["ticketweb."] },
  { id: "seatgeek", match: ["seatgeek."] },
  { id: "stubhub", match: ["stubhub."] },
  { id: "vividseats", match: ["vividseats."] },
  { id: "tickpick", match: ["tickpick."] },
  { id: "axs", match: ["axs."] },
  { id: "eventbrite", match: ["eventbrite."] },
  { id: "dice", match: ["dice.fm"] },
  { id: "partiful", match: ["partiful."] },
  { id: "posh", match: ["posh.vip"] },
];

/**
 * Identify the marketplace that owns a given event URL.
 * Returns undefined when the URL is missing or unrecognized.
 */
export function marketplaceLinkFromUrl(
  url: string | undefined,
): MarketplaceDefinition | undefined {
  if (!url) return undefined;

  let host = "";
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return undefined;
  }

  const entry = MARKETPLACE_HOSTS.find((candidate) =>
    candidate.match.some((fragment) => host.includes(fragment)),
  );

  return entry ? getMarketplace(entry.id) : undefined;
}

/**
 * A marketplace with a direct link for a specific event,
 * shaped for the UI.
 */
export type EventMarketplace = {
  id: MarketplaceId;
  name: string;
  url: string;
  startingPrice?: number | undefined;
};

/**
 * Build the direct-listing marketplace rows for an event.
 * Passr never fabricates generic marketplace search links here.
 */
export function marketplacesForEvent(event: {
  ticketUrl?: string | undefined;
  startingAt?: number | undefined;
}): EventMarketplace[] {
  const marketplace = marketplaceLinkFromUrl(event.ticketUrl);

  if (!marketplace || !event.ticketUrl) return [];

  return [
    {
      id: marketplace.id,
      name: marketplace.name,
      url: event.ticketUrl,
      startingPrice: event.startingAt,
    },
  ];
}
