import type {
  MarketplaceProvider,
  MarketplaceSearchInput,
} from "./types";

function queryFor(input: MarketplaceSearchInput) {
  return [
    input.eventName,
    input.venue,
    input.city,
    input.state,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();
}

function encodedQuery(input: MarketplaceSearchInput) {
  return encodeURIComponent(queryFor(input));
}

/**
 * Marketplace provider registry.
 *
 * IMPORTANT:
 * `live: false` means Passr does NOT currently have a direct
 * provider API integration. The provider can still have a search
 * link so users can continue to the marketplace.
 */
export const MARKETPLACE_PROVIDERS: MarketplaceProvider[] = [
  {
    id: "ticketmaster",
    displayName: "Ticketmaster",
    live: true,
    supportsPricing: true,
    supportsInventory: false,
    buildSearchUrl: (input) =>
      input.ticketUrl ??
      `https://www.ticketmaster.com/search?q=${encodedQuery(input)}`,
  },

  {
    id: "seatgeek",
    displayName: "SeatGeek",
    live: false,
    supportsPricing: false,
    supportsInventory: false,
    buildSearchUrl: (input) =>
      `https://seatgeek.com/search?search=${encodedQuery(input)}`,
  },

  {
    id: "stubhub",
    displayName: "StubHub",
    live: false,
    supportsPricing: false,
    supportsInventory: false,
    buildSearchUrl: (input) =>
      `https://www.stubhub.com/search/?q=${encodedQuery(input)}`,
  },

  {
    id: "vivid-seats",
    displayName: "Vivid Seats",
    live: false,
    supportsPricing: false,
    supportsInventory: false,
    buildSearchUrl: (input) =>
      `https://www.vividseats.com/search?search=${encodedQuery(input)}`,
  },

  {
    id: "tickpick",
    displayName: "TickPick",
    live: false,
    supportsPricing: false,
    supportsInventory: false,
    buildSearchUrl: (input) =>
      `https://www.tickpick.com/search/?query=${encodedQuery(input)}`,
  },

  {
    id: "axs",
    displayName: "AXS",
    live: false,
    supportsPricing: false,
    supportsInventory: false,
    buildSearchUrl: (input) =>
      `https://www.axs.com/search?q=${encodedQuery(input)}`,
  },

  {
    id: "eventbrite",
    displayName: "Eventbrite",
    live: false,
    supportsPricing: false,
    supportsInventory: false,
    buildSearchUrl: (input) =>
      `https://www.eventbrite.com/d/online/${encodedQuery(input)}/`,
  },

  {
    id: "dice",
    displayName: "DICE",
    live: false,
    supportsPricing: false,
    supportsInventory: false,
    buildSearchUrl: (input) =>
      `https://dice.fm/search?q=${encodedQuery(input)}`,
  },
];

export function getMarketplaceProvider(
  id: MarketplaceProvider["id"],
) {
  return MARKETPLACE_PROVIDERS.find(
    (provider) => provider.id === id,
  );
}

export function marketplaceSearchInput(
  event: {
    name: string;
    venue?: string | undefined;
    city?: string | undefined;
    state?: string | undefined;
    ticketUrl?: string | undefined;
  },
): MarketplaceSearchInput {
  return {
    eventName: event.name,
    venue: event.venue,
    city: event.city,
    state: event.state,
    ticketUrl: event.ticketUrl,
  };
}
