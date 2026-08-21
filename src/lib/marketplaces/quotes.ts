import { quotesFor } from "@/lib/mock-data";
import type { PassrEvent } from "@/lib/types";

import {
  MARKETPLACE_PROVIDERS,
  marketplaceSearchInput,
} from "./providers";

import type {
  MarketplaceQuote,
  MarketplaceQuoteResponse,
} from "./types";

function now() {
  return new Date().toISOString();
}

/**
 * Converts Passr's existing simulated comparison quotes into
 * the new provider-agnostic marketplace format.
 *
 * This is deliberately labeled as fallback data.
 * It is NOT presented as live provider inventory.
 */
function fallbackQuotes(
  event: PassrEvent,
  anchorPrice: number,
): MarketplaceQuote[] {
  const quotes = quotesFor(anchorPrice);
  const timestamp = now();

  return quotes.map((quote) => {
    const provider = MARKETPLACE_PROVIDERS.find(
      (item) =>
        item.displayName.toLowerCase() ===
        quote.marketplace.toLowerCase(),
    );

    return {
      marketplace:
        provider?.id ?? "ticketmaster",
      displayName: quote.marketplace,
      basePrice: quote.base,
      fees: quote.fees,
      totalPrice: quote.total,
      purchaseUrl: provider
        ? provider.buildSearchUrl(
            marketplaceSearchInput(event),
          )
        : event.ticketUrl,
      status: "fallback",
      lastUpdated: timestamp,
      note: "Passr comparison estimate. Direct provider inventory is not connected yet.",
    };
  });
}

/**
 * Gets normalized marketplace data for an event.
 *
 * Phase 1 behavior:
 * - Use real Ticketmaster event pricing when it exists.
 * - Use Passr's existing comparison layer as fallback.
 *
 * Future provider adapters plug into this function without requiring
 * changes to the Event page.
 */
export async function getMarketplaceQuotes(
  event: PassrEvent,
): Promise<MarketplaceQuoteResponse> {
  const anchorPrice = event.startingAt;

  /**
   * Ticketmaster's Discovery API may provide an event starting price,
   * but it does not provide the full resale marketplace comparison layer.
   *
   * Therefore we use the Passr comparison layer whenever we don't have
   * a direct marketplace pricing integration.
   */
  const quotes = fallbackQuotes(
    event,
    anchorPrice ?? 75,
  );

  return {
    eventId: event.id,
    quotes,
    hasLiveData: false,
    usedFallback: true,
    fetchedAt: now(),
  };
}

/**
 * Build marketplace search links independently of pricing.
 *
 * This lets Passr provide useful outbound marketplace links even when
 * Passr doesn't have a direct provider API integration yet.
 */
export function getMarketplaceSearchLinks(
  event: PassrEvent,
) {
  const input = marketplaceSearchInput(event);

  return MARKETPLACE_PROVIDERS.map(
    (provider) => ({
      id: provider.id,
      name: provider.displayName,
      url: provider.buildSearchUrl(input),
      live: provider.live,
      supportsPricing:
        provider.supportsPricing,
      supportsInventory:
        provider.supportsInventory,
    }),
  );
}