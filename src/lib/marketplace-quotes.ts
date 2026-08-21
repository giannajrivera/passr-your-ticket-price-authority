/**
 * Passr marketplace data layer.
 *
 * STEP 3
 *
 * This is the normalized boundary between the event page and marketplace
 * providers.
 *
 * Right now Passr only has truly live event data from Ticketmaster.
 * Therefore this file MUST NOT pretend that generic marketplace search
 * results are live inventory.
 *
 * Later:
 *
 * Proprietary Passr API
 *        ↓
 * marketplace-quotes.ts
 *        ↓
 * Event page
 *
 * That lets us replace the source without rebuilding the UI.
 */

import type {
  EventMarketplaceData,
  MarketplaceId,
  MarketplaceListing,
  PassrEvent,
} from "@/lib/types";

import {
  getMarketplace,
} from "@/lib/marketplaces";

function marketplaceName(
  id: MarketplaceId,
): string {
  return (
    getMarketplace(id)?.name ??
    id
  );
}

/**
 * Creates a verified direct marketplace listing.
 *
 * This helper is intentionally strict:
 * no URL = no listing.
 */
export function createMarketplaceListing(
  marketplace: MarketplaceId,
  purchaseUrl: string,
  options?: {
    availability?:
      | "available"
      | "limited"
      | "sold_out"
      | "unknown";

    startingPrice?: number | undefined;

    lastUpdated?: string | undefined;
  },
): MarketplaceListing | null {
  if (!purchaseUrl.trim()) {
    return null;
  }

  return {
    marketplace,

    marketplaceName:
      marketplaceName(marketplace),

    purchaseUrl,

    availability:
      options?.availability ??
      "unknown",

    startingPrice:
      options?.startingPrice,

    lastUpdated:
      options?.lastUpdated,
  };
}

/**
 * Returns marketplace data for an event.
 *
 * At the moment we only trust direct provider URLs that are actually
 * attached to the event.
 *
 * This prevents Passr from displaying fake marketplace availability.
 */
export function getMarketplaceData(
  event: PassrEvent,
): EventMarketplaceData {
  const listings: MarketplaceListing[] = [];

  /**
   * Ticketmaster is currently Passr's only live event provider.
   *
   * If Ticketmaster gave us a direct event URL, we can safely expose it.
   */
  if (
    event.source === "ticketmaster" &&
    event.ticketUrl
  ) {
    const listing =
      createMarketplaceListing(
        "ticketmaster",
        event.ticketUrl,
        {
          availability: "unknown",

          startingPrice:
            event.startingAt,
        },
      );

    if (listing) {
      listings.push(listing);
    }
  }

  return {
    eventId: event.id,

    listings,

    /**
     * The marketplace layer is considered live only when it contains
     * provider-backed data.
     */
    live: listings.length > 0,

    lastUpdated:
      listings[0]?.lastUpdated,
  };
}

/**
 * Returns only marketplaces with actual direct event URLs.
 *
 * This is what the event page should use for "Find tickets".
 */
export function getAvailableMarketplaceListings(
  event: PassrEvent,
): MarketplaceListing[] {
  return getMarketplaceData(
    event,
  ).listings.filter(
    (listing) =>
      listing.purchaseUrl &&
      listing.availability !==
        "sold_out",
  );
}