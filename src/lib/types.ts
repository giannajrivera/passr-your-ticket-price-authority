/**
 * Shared, provider-agnostic event and ticket types for Passr.
 *
 * `PassrEvent` is intentionally decoupled from any single data source (mock
 * data today; Ticketmaster, Eventbrite, etc. later). It only describes an
 * event's core identity — the kind of fields a real event API can actually
 * provide.
 *
 * Ticket-analysis data (marketplace quotes, sections, market averages,
 * resale pricing) is NOT part of an event's identity and does not belong
 * here — real event provider APIs don't return that. See `TicketMarketData`
 * below for that shape instead. Passr-specific mock/market data (e.g. the
 * mock app's `Section`/`Quote` types) should build on top of `PassrEvent`
 * rather than being folded into it.
 */

/** Where a `PassrEvent` originated. "mock" is Passr's current placeholder data. */
export type EventSource = "mock" | "ticketmaster" | "eventbrite";

/** Broad event category, used for filtering, icons, and venue-map layout. */
export type EventCategory = "Concert" | "Sports" | "Theater";

export type PassrEvent = {
  /** Passr's internal identifier for this event. */
  id: string;
  /** Which provider this event's data came from. */
  source: EventSource;
  /** The event's id in the source provider's own system (mirrors `id` for mock data). */
  sourceEventId: string;

  name: string;
  /** Short line under the event name, e.g. supporting act or tour name. */
  subtitle?: string | undefined;
  /** Longer free-text description, when a provider supplies one. */
  description?: string | undefined;

  category: EventCategory;
  /** Provider-supplied genre, e.g. "Rock" or "Basketball". */
  genre?: string | undefined;
  /** Provider-supplied sub-genre, e.g. "Alternative Rock". */
  subGenre?: string | undefined;

  /** Human-readable date/time for display, e.g. "Fri, Sep 18 · 8:00 PM". */
  date: string;
  /** Machine-readable ISO 8601 start date/time, when the provider gives one. */
  startDateTime?: string | undefined;

  venue: string;
  city: string;
  state?: string | undefined;
  country?: string | undefined;
  latitude?: number | undefined;
  longitude?: number | undefined;

  /** Hero/listing image URL. */
  image: string;
  /** Lowest known "starting at" price for the event, for list/card display. */
  startingAt: number;
  /** Whether this event should surface in "trending" sections. */
  trending: boolean;

  /** Deep link to view/buy the event at the source provider, when available. */
  ticketUrl?: string | undefined;
};

/**
 * Ticket / resale-market data for a specific listing, section, or seat.
 * Kept separate from `PassrEvent` on purpose: real event APIs (Ticketmaster,
 * Eventbrite) don't supply historical market averages, resale quotes, or
 * section/row-level pricing — that's Passr's own market-analysis layer,
 * sourced separately (today from mock data, eventually from a pricing
 * provider) and joined to an event by id.
 */
export type TicketMarketData = {
  /** Marketplace this quote came from, e.g. "StubHub" or "Ticketmaster". */
  marketplace: string;
  section?: string | undefined;
  row?: string | undefined;
  basePrice: number;
  fees: number;
  totalPrice: number;
  /** Recent (e.g. 30-day) average out-the-door price for this section, when known. */
  marketAverage?: number | undefined;
  /** Deep link to purchase this specific listing. */
  purchaseUrl?: string | undefined;
  /** ISO 8601 timestamp of when this quote was last refreshed. */
  lastUpdated?: string | undefined;
};
