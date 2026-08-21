/**
 * Shared provider-agnostic types for Passr.
 *
 * Event identity and marketplace/ticket data are intentionally separated.
 * A provider can tell Passr that an event exists without providing
 * marketplace-level ticket inventory.
 */

export type EventSource =
  | "mock"
  | "ticketmaster"
  | "eventbrite";

export type EventCategory =
  | "Concert"
  | "Sports"
  | "Comedy"
  | "Theater"
  | "Festival"
  | "Family"
  | "Nightlife"
  | "Other";

export type ListingType =
  | "standard"
  | "suite"
  | "vip"
  | "parking"
  | "package"
  | "other";

export type PassrEvent = {
  id: string;

  source: EventSource;

  sourceEventId: string;

  name: string;

  subtitle?: string | undefined;

  description?: string | undefined;

  category: EventCategory;

  genre?: string | undefined;

  subGenre?: string | undefined;

  date: string;

  startDateTime?: string | undefined;

  venue: string;

  city: string;

  state?: string | undefined;

  country?: string | undefined;

  latitude?: number | undefined;

  longitude?: number | undefined;

  image: string;

  /**
   * Lowest known provider price.
   *
   * This is NOT a marketplace quote.
   */
  startingAt?: number | undefined;

  trending: boolean;

  /**
   * Provider's direct event/ticket URL.
   *
   * This should only be displayed when it is actually a usable
   * destination for the event.
   */
  ticketUrl?: string | undefined;

  ticketMarketplace?: string | undefined;

  listingType?: ListingType | undefined;
};

/**
 * Marketplace identity.
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

/**
 * A direct marketplace listing for this specific event.
 *
 * This is intentionally different from a generic marketplace search URL.
 *
 * `purchaseUrl` should point to the actual event/listing page.
 */
export type MarketplaceListing = {
  marketplace: MarketplaceId;

  /**
   * Human-readable marketplace name.
   */
  marketplaceName: string;

  /**
   * Direct event/listing URL.
   *
   * This should only exist when Passr knows that the marketplace
   * actually has this event.
   */
  purchaseUrl: string;

  /**
   * Whether this listing is currently believed to have inventory.
   *
   * This can eventually become a real-time inventory state.
   */
  availability:
    | "available"
    | "limited"
    | "sold_out"
    | "unknown";

  /**
   * Lowest known ticket price from this marketplace.
   */
  startingPrice?: number | undefined;

  /**
   * When this marketplace information was last checked.
   */
  lastUpdated?: string | undefined;
};

/**
 * Marketplace comparison data attached to an event.
 *
 * This is Passr's normalized marketplace layer.
 */
export type EventMarketplaceData = {
  eventId: string;

  listings: MarketplaceListing[];

  /**
   * True when the data came from a live/verified marketplace source.
   */
  live: boolean;

  /**
   * Timestamp for the marketplace dataset itself.
   */
  lastUpdated?: string | undefined;
};

/**
 * Normalized ticket quote.
 *
 * Used by the pricing/comparison UI.
 */
export type TicketMarketData = {
  marketplace: string;

  section?: string | undefined;

  row?: string | undefined;

  basePrice: number;

  fees: number;

  totalPrice: number;

  marketAverage?: number | undefined;

  purchaseUrl?: string | undefined;

  lastUpdated?: string | undefined;
};