/**
 * Shared, provider-agnostic event and ticket types for Passr.
 *
 * PassrEvent contains the core identity of an event.
 * Ticket-market data is intentionally kept separate.
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
  /** Passr's internal identifier for this event. */
  id: string;

  /** Provider that supplied the event. */
  source: EventSource;

  /** Event ID in the provider's system. */
  sourceEventId: string;

  name: string;

  /** Short line under the event name. */
  subtitle?: string | undefined;

  /** Longer provider-supplied description. */
  description?: string | undefined;

  category: EventCategory;

  /** Provider-supplied genre. */
  genre?: string | undefined;

  /** Provider-supplied sub-genre. */
  subGenre?: string | undefined;

  /** Human-readable display date/time. */
  date: string;

  /** ISO 8601 start date/time. */
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
   * Lowest known starting price.
   *
   * Never fabricate this value when the provider
   * does not supply pricing.
   */
  startingAt?: number | undefined;

  /** Whether this event should surface as trending. */
  trending: boolean;

  /**
   * Actual event-specific purchase URL supplied
   * by the provider.
   *
   * This must NOT be a generic marketplace search URL.
   */
  ticketUrl?: string | undefined;

  /**
   * Marketplace that owns ticketUrl.
   *
   * Examples:
   * Ticketmaster
   * TicketWeb
   * Universe
   * Eventbrite
   * Partiful
   *
   * This is derived from the actual ticket URL.
   */
  ticketMarketplace?: string | undefined;

  /**
   * Best-effort classification of standard vs.
   * non-standard listings.
   */
  listingType?: ListingType | undefined;
};

/**
 * Ticket / resale-market data for a specific
 * listing, section, or seat.
 *
 * This is separate from PassrEvent because
 * provider event APIs generally do not provide
 * historical market averages or resale quotes.
 */
export type TicketMarketData = {
  /** Marketplace supplying this quote. */
  marketplace: string;

  section?: string | undefined;

  row?: string | undefined;

  basePrice: number;

  fees: number;

  totalPrice: number;

  /** Recent market average when known. */
  marketAverage?: number | undefined;

  /** Event/listing-specific purchase URL. */
  purchaseUrl?: string | undefined;

  /** ISO 8601 timestamp. */
  lastUpdated?: string | undefined;
};