/**
 * Shared, provider-agnostic event and ticket types for Passr.
 *
 * Passr separates:
 *
 * 1. The provider that discovered the event
 * 2. The actual places where tickets for that specific event can be bought
 *
 * These are NOT necessarily the same thing.
 *
 * Example:
 * Ticketmaster may return an event whose actual ticket URL points to
 * TicketWeb. In that case:
 *
 *   event.source = "ticketmaster"
 *   event.ticketSources = [{ provider: "TicketWeb", ... }]
 *
 * Passr should never assume that the event's discovery provider is the
 * place where tickets are actually sold.
 */

/** Where Passr originally obtained the event record. */
export type EventSource =
  | "mock"
  | "ticketmaster"
  | "eventbrite"
  | "partiful"
  | "posh"
  | "dice"
  | "axs"
  | "other";

/** Broad event category, used for filtering, icons, and venue-map layout. */
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
 * Whether a Passr event is a normal purchasable event or a special listing
 * returned by a provider.
 */
export type ListingType =
  | "standard"
  | "suite"
  | "vip"
  | "parking"
  | "package"
  | "other";

/**
 * Type of actual ticket destination.
 *
 * `primary` = official/primary ticket seller
 * `resale` = verified resale marketplace
 * `discovery` = provider where the event can be discovered but is not
 * necessarily the primary seller
 */
export type TicketSourceType =
  | "primary"
  | "resale"
  | "discovery";

/**
 * A direct ticket destination for THIS specific event.
 *
 * This must be an actual event/listing URL.
 *
 * Do NOT populate this with generic marketplace search URLs.
 */
export type TicketSource = {
  /** Human-readable provider name, e.g. "TicketWeb", "Partiful", "Posh". */
  provider: string;

  /** Provider-specific identifier when known. */
  providerEventId?: string | undefined;

  /**
   * Direct URL to this specific event/listing.
   *
   * Example:
   * https://www.ticketweb.com/event/some-event-123
   *
   * This should NEVER be a generic marketplace search URL.
   */
  url: string;

  /** Whether this is the primary/official ticket source, resale source, etc. */
  type: TicketSourceType;

  /**
   * Whether Passr has confirmed that this URL corresponds to this event.
   *
   * Only verified sources should normally be displayed in "Find tickets".
   */
  verified: boolean;

  /** Optional timestamp for when Passr last verified the destination. */
  lastVerifiedAt?: string | undefined;
};

/**
 * A provider-agnostic event.
 *
 * `source` tells us where Passr discovered the event.
 *
 * `ticketSources` tells us where the user can actually get tickets.
 *
 * Those two fields intentionally remain separate.
 */
export type PassrEvent = {
  /** Passr's internal identifier for this event. */
  id: string;

  /** Provider from which Passr originally obtained this event record. */
  source: EventSource;

  /** Event ID in the original provider's system. */
  sourceEventId: string;

  name: string;

  /** Short line under the event name, e.g. supporting act or tour name. */
  subtitle?: string | undefined;

  /** Longer free-text description, when available. */
  description?: string | undefined;

  category: EventCategory;

  /** Provider-supplied genre, e.g. "Rock" or "Basketball". */
  genre?: string | undefined;

  /** Provider-supplied sub-genre, e.g. "Alternative Rock". */
  subGenre?: string | undefined;

  /** Human-readable date/time for display. */
  date: string;

  /** Machine-readable ISO 8601 start date/time. */
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
   * Undefined when the source provider does not expose pricing.
   * Never fabricate a number here.
   */
  startingAt?: number | undefined;

  /** Whether this event should surface in trending sections. */
  trending: boolean;

  /**
   * Legacy/source-level ticket URL.
   *
   * This may come directly from the event provider.
   *
   * New UI should prefer `ticketSources`.
   */
  ticketUrl?: string | undefined;

  /**
   * Actual ticket destinations for this specific event.
   *
   * The Event page should render these instead of generating generic
   * marketplace search URLs.
   */
  ticketSources?: TicketSource[] | undefined;

  /**
   * Best-effort classification of standard vs. non-standard listing.
   */
  listingType?: ListingType | undefined;
};

/**
 * Ticket / resale-market data for a specific listing, section, or seat.
 *
 * This is separate from PassrEvent because event identity and ticket-market
 * analysis are different data domains.
 */
export type TicketMarketData = {
  /** Marketplace this quote came from, e.g. "StubHub" or "Ticketmaster". */
  marketplace: string;

  section?: string | undefined;

  row?: string | undefined;

  basePrice: number;

  fees: number;

  totalPrice: number;

  /** Recent market average when known. */
  marketAverage?: number | undefined;

  /** Deep link to purchase this specific listing. */
  purchaseUrl?: string | undefined;

  /** ISO 8601 timestamp of when this quote was last refreshed. */
  lastUpdated?: string | undefined;
};