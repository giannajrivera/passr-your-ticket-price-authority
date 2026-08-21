/**
 * Provider-agnostic marketplace types for Passr.
 *
 * This is the contract every ticket marketplace must eventually implement.
 * The UI should never need to know whether data came from Ticketmaster,
 * SeatGeek, StubHub, or a Passr fallback.
 */

export type MarketplaceId =
  | "ticketmaster"
  | "seatgeek"
  | "stubhub"
  | "vivid-seats"
  | "tickpick"
  | "axs"
  | "eventbrite"
  | "dice";

export type MarketplaceStatus =
  | "live"
  | "fallback"
  | "unavailable"
  | "error";

export type MarketplaceQuote = {
  marketplace: MarketplaceId;

  /**
   * Human-readable marketplace name for the UI.
   */
  displayName: string;

  /**
   * Lowest known ticket price before fees.
   */
  basePrice?: number;

  /**
   * Fees associated with the listing.
   */
  fees?: number;

  /**
   * Final estimated or confirmed out-the-door price.
   */
  totalPrice?: number;

  /**
   * Section/zone when the provider exposes it.
   */
  section?: string;

  /**
   * Row when the provider exposes it.
   */
  row?: string;

  /**
   * Number of tickets represented by this listing.
   */
  quantity?: number;

  /**
   * URL where the user can continue to the provider.
   */
  purchaseUrl?: string;

  /**
   * Whether this quote represents actual provider data
   * or Passr's fallback comparison layer.
   */
  status: MarketplaceStatus;

  /**
   * When the quote was last refreshed.
   */
  lastUpdated?: string;

  /**
   * Optional explanation when the provider isn't live.
   */
  note?: string;
};

export type MarketplaceProvider = {
  id: MarketplaceId;
  displayName: string;

  /**
   * Whether Passr currently has a real API/data integration.
   */
  live: boolean;

  /**
   * Whether the provider can currently return pricing.
   */
  supportsPricing: boolean;

  /**
   * Whether the provider can currently return inventory.
   */
  supportsInventory: boolean;

  /**
   * Build a user-facing search URL for the event.
   */
  buildSearchUrl: (input: MarketplaceSearchInput) => string;
};

export type MarketplaceSearchInput = {
  eventName: string;
  venue?: string | undefined;
  city?: string | undefined;
  state?: string | undefined;
  ticketUrl?: string | undefined;
};

export type MarketplaceQuoteResponse = {
  eventId: string;
  quotes: MarketplaceQuote[];

  /**
   * True when at least one quote came from a live provider.
   */
  hasLiveData: boolean;

  /**
   * True when Passr had to use its comparison fallback.
   */
  usedFallback: boolean;

  fetchedAt: string;
};
