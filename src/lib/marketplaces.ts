import type { PassrEvent, TicketMarketData } from "@/lib/types";

/**
 * Passr marketplace/provider definitions.
 *
 * This file is intentionally provider-agnostic.
 *
 * A marketplace should only be treated as "available" for an event when
 * Passr has a legitimate event/listing URL or real market data for it.
 *
 * Do NOT add generic marketplace search URLs here.
 */

export type MarketplaceId =
  | "ticketmaster"
  | "seatgeek"
  | "stubhub"
  | "vivid-seats"
  | "tickpick"
  | "axs"
  | "eventbrite"
  | "dice"
  | "partiful"
  | "posh";

export type MarketplaceDefinition = {
  id: MarketplaceId;
  name: string;
  connected: boolean;
};

export type EventMarketplace = {
  id: MarketplaceId;
  name: string;
  url?: string;
  startingPrice?: number | undefined;
  currency?: string;
  available: boolean;
  lastUpdated?: string | undefined;
};

/**
 * Providers Passr knows about.
 *
 * `connected` means Passr currently has a real integration capable of
 * supplying event data. A provider being listed here does NOT mean that
 * provider should automatically appear on an event page.
 */
export const MARKETPLACES: MarketplaceDefinition[] = [
  {
    id: "ticketmaster",
    name: "Ticketmaster",
    connected: true,
  },
  {
    id: "seatgeek",
    name: "SeatGeek",
    connected: false,
  },
  {
    id: "stubhub",
    name: "StubHub",
    connected: false,
  },
  {
    id: "vivid-seats",
    name: "Vivid Seats",
    connected: false,
  },
  {
    id: "tickpick",
    name: "TickPick",
    connected: false,
  },
  {
    id: "axs",
    name: "AXS",
    connected: false,
  },
  {
    id: "eventbrite",
    name: "Eventbrite",
    connected: false,
  },
  {
    id: "dice",
    name: "DICE",
    connected: false,
  },
  {
    id: "partiful",
    name: "Partiful",
    connected: false,
  },
  {
    id: "posh",
    name: "POSH",
    connected: false,
  },
];

/**
 * Returns a marketplace definition by provider id.
 */
export function getMarketplace(
  id: MarketplaceId,
): MarketplaceDefinition | undefined {
  return MARKETPLACES.find(
    (marketplace) => marketplace.id === id,
  );
}

/**
 * Converts Passr's current event-level Ticketmaster URL and price into
 * marketplace data.
 *
 * This is deliberately conservative:
 *
 * - If Ticketmaster gives us a URL, it is a valid direct source.
 * - If Ticketmaster gives us a starting price, we preserve it.
 * - If either value is missing, we do not invent one.
 */
export function ticketmasterMarketplaceForEvent(
  event: PassrEvent,
): EventMarketplace | undefined {
  if (event.source !== "ticketmaster") {
    return undefined;
  }

  if (!event.ticketUrl) {
    return undefined;
  }

  return {
    id: "ticketmaster",
    name: "Ticketmaster",
    url: event.ticketUrl,
    startingPrice: event.startingAt,
    available: true,
  };
}

/**
 * Builds the direct ticket sources that Passr can legitimately show for
 * an event.
 *
 * IMPORTANT:
 * This function only returns sources for which Passr has actual data.
 *
 * It does NOT generate:
 *
 *   seatgeek.com/search/...
 *   stubhub.com/search/...
 *   vividseats.com/search/...
 *
 * Those are not proof that the specific event is available there.
 */
export function marketplacesForEvent(
  event: PassrEvent,
  marketData: TicketMarketData[] = [],
): EventMarketplace[] {
  const sources: EventMarketplace[] = [];

  const ticketmaster =
    ticketmasterMarketplaceForEvent(event);

  if (ticketmaster) {
    sources.push(ticketmaster);
  }

  /*
   * Additional providers can be added here once Passr has a legitimate
   * provider integration that returns an event/listing URL.
   *
   * Example future adapter:
   *
   * const seatGeek = ...
   *
   * if (seatGeek) {
   *   sources.push(seatGeek);
   * }
   *
   * Do not add a provider merely because its website exists.
   */

  for (const quote of marketData) {
    const marketplaceId =
      marketplaceIdFromName(quote.marketplace);

    if (!marketplaceId) {
      continue;
    }

    /*
     * A quote without a purchase URL is market data, not a direct
     * ticket source. It should not create a "Buy tickets" marketplace
     * button.
     */
    if (!quote.purchaseUrl) {
      continue;
    }

    const existing =
      sources.find(
        (source) =>
          source.id === marketplaceId,
      );

    if (existing) {
      continue;
    }

    sources.push({
      id: marketplaceId,
      name:
        getMarketplace(
          marketplaceId,
        )?.name ?? quote.marketplace,
      url: quote.purchaseUrl,
      startingPrice: quote.totalPrice,
      available: true,
      lastUpdated:
        quote.lastUpdated,
    });
  }

  return sources.filter(
    (source) =>
      source.available &&
      Boolean(source.url),
  );
}

/**
 * Converts a provider name returned by market data into Passr's
 * canonical marketplace id.
 */
function marketplaceIdFromName(
  value: string,
): MarketplaceId | undefined {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

  switch (normalized) {
    case "ticketmaster":
      return "ticketmaster";

    case "seatgeek":
      return "seatgeek";

    case "stubhub":
      return "stubhub";

    case "vivid seats":
    case "vividseats":
      return "vivid-seats";

    case "tickpick":
      return "tickpick";

    case "axs":
      return "axs";

    case "eventbrite":
      return "eventbrite";

    case "dice":
      return "dice";

    case "partiful":
      return "partiful";

    case "posh":
      return "posh";

    default:
      return undefined;
  }
}

/**
 * Returns the cheapest real quote from market data.
 *
 * Quotes without a total price are ignored.
 */
export function cheapestMarketQuote(
  marketData: TicketMarketData[],
): TicketMarketData | undefined {
  return marketData
    .filter(
      (quote) =>
        Number.isFinite(
          quote.totalPrice,
        ),
    )
    .sort(
      (a, b) =>
        a.totalPrice -
        b.totalPrice,
    )[0];
}