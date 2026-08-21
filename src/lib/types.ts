/**
 * Provider-agnostic types used throughout Passr.
 *
 * Passr separates:
 *
 * 1. Event identity/data
 * 2. Ticket-market data
 * 3. Marketplace/provider information
 *
 * This lets Passr add Ticketmaster, SeatGeek, StubHub, Vivid Seats,
 * TickPick, AXS, Eventbrite, DICE, and future providers without
 * making Passr's core event model depend on one marketplace.
 */

/** Where an event originated. */
export type EventSource =
  | "mock"
  | "ticketmaster"
  | "eventbrite"
  | "seatgeek"
  | "stubhub"
  | "vividseats"
  | "tickpick"
  | "axs"
  | "dice"
  | "other";

/** Broad event category. */
export type EventCategory =
  | "Concert"
  | "Sports"
  | "Comedy"
  | "Theater"
  | "Festival"
  | "Family"
  | "Nightlife"
  | "Other";

/**
 * Standard purchasable event vs. provider-specific non-standard listing.
 */
export type ListingType =
  | "standard"
  | "suite"
  | "vip"
  | "parking"
  | "package"
  | "other";

/**
 * Core Passr event.
 *
 * This type intentionally does NOT contain marketplace-specific
 * ticket inventory. An event can have many marketplace sources.
 */
export type PassrEvent = {
  /** Passr's internal event identifier. */
  id: string;

  /** Provider this event came from. */
  source: EventSource;

  /** Original provider event ID. */
  sourceEventId: string;

  name: string;

  subtitle?: string | undefined;

  description?: string | undefined;

  category: EventCategory;

  genre?: string | undefined;

  subGenre?: string | undefined;

  /** Human-readable date/time used by the UI. */
  date: string;

  /** Machine-readable event start time. */
  startDateTime?: string | undefined;

  venue: string;

  city: string;

  state?: string | undefined;

  country?: string | undefined;

  latitude?: number | undefined;

  longitude?: number | undefined;

  /** Hero/listing image URL. */
  image: string;

  /**
   * Lowest known event-level starting price.
   *
   * This must remain undefined when the provider does not expose
   * a trustworthy starting price.
   */
  startingAt?: number | undefined;

  /** Whether this event should appear in trending surfaces. */
  trending: boolean;

  /** Deep link to the provider's event page. */
  ticketUrl?: string | undefined;

  /** Best-effort classification of unusual provider listings. */
  listingType?: ListingType | undefined;
};

/**
 * Marketplace/provider identity.
 *
 * This is deliberately separate from PassrEvent so one event can
 * have many marketplace sources.
 */
export type MarketplaceId =
  | "ticketmaster"
  | "seatgeek"
  | "stubhub"
  | "vividseats"
  | "tickpick"
  | "axs"
  | "eventbrite"
  | "dice"
  | "other";

export type Marketplace = {
  id: MarketplaceId;
  name: string;

  /**
   * Whether Passr currently has a real provider integration.
   *
   * false means Passr may only provide an external search/deep link.
   */
  integrated: boolean;

  /**
   * Whether the provider can supply live ticket inventory.
   */
  liveInventory: boolean;

  /**
   * Whether Passr can receive pricing from the provider.
   */
  livePricing: boolean;

  /**
   * Whether Passr can deep-link the user to the provider.
   */
  directLinks: boolean;
};

/**
 * A single ticket listing.
 *
 * This is provider-agnostic. A listing can come from Ticketmaster,
 * StubHub, SeatGeek, etc.
 */
export type TicketListing = {
  id: string;

  marketplace: MarketplaceId;

  eventId: string;

  section?: string | undefined;

  row?: string | undefined;

  quantity: number;

  basePrice: number;

  fees: number;

  totalPrice: number;

  currency?: string | undefined;

  purchaseUrl?: string | undefined;

  /**
   * ISO timestamp indicating when this listing was last refreshed.
   */
  lastUpdated?: string | undefined;

  /**
   * Whether the listing is currently available.
   */
  available: boolean;
};

/**
 * Ticket-market data associated with an event.
 *
 * This is the layer Passr will eventually populate from real
 * marketplace integrations.
 */
export type TicketMarketData = {
  eventId: string;

  listings: TicketListing[];

  /**
   * Optional recent average price for the event/section.
   */
  marketAverage?: number | undefined;

  /**
   * ISO timestamp for the market snapshot.
   */
  lastUpdated?: string | undefined;
};

/**
 * Backwards-compatible quote shape used by the current UI.
 *
 * This remains here during the migration so existing mock-data
 * and event-page code can continue to work while the marketplace
 * architecture is introduced.
 */
export type TicketQuote = {
  marketplace: string;
  base: number;
  fees: number;
  total: number;
  purchaseUrl?: string | undefined;
};

/**
 * Backwards-compatible section/zone market information.
 */
export type TicketSectionMarket = {
  marketplace?: MarketplaceId | undefined;
  section?: string | undefined;
  row?: string | undefined;
  basePrice: number;
  fees: number;
  totalPrice: number;
  marketAverage?: number | undefined;
  purchaseUrl?: string | undefined;
  lastUpdated?: string | undefined;
};