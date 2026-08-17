/**
 * Ticketmaster Discovery API provider.
 *
 * This module is server-only: it must never be imported by a React
 * component or any other code path that ends up in the client bundle. It
 * does not read `process.env` itself — the caller (a server route/function,
 * evaluated per-request) reads `TICKETMASTER_API_KEY` and passes it in. This
 * matches TanStack Start's guidance: env vars should be read inside a
 * per-request handler, not at module scope, since on some server runtimes
 * env isn't available until request time, and module-scope reads risk
 * getting inlined into a client bundle if this file is ever imported from
 * one by mistake.
 *
 * Nothing in here throws a raw fetch/HTTP error out to the caller — every
 * failure mode (missing key, auth errors, rate limits, network failure,
 * malformed payloads) is captured in `TicketmasterResult` instead, so a
 * route handler can turn it into a clean response rather than leaking
 * provider internals to the browser.
 */

import { classifyListingType, deduplicateEvents } from "@/lib/event-utils";
import type { EventCategory, PassrEvent } from "@/lib/types";

const TICKETMASTER_EVENTS_ENDPOINT = "https://app.ticketmaster.com/discovery/v2/events.json";

export type TicketmasterSearchParams = {
  /** Ticketmaster event id — Discovery's `id` filter, used for single-event lookups. */
  id?: string | undefined;
  city?: string | undefined;
  stateCode?: string | undefined;
  countryCode?: string | undefined;
  /** ISO 8601, e.g. "2026-09-01T00:00:00Z" */
  startDateTime?: string | undefined;
  /** ISO 8601, e.g. "2026-09-30T00:00:00Z" */
  endDateTime?: string | undefined;
  keyword?: string | undefined;
  /** Ticketmaster "segment" name, e.g. "Music", "Sports", "Arts & Theatre" */
  classificationName?: string | undefined;
  /** Ticketmaster genre ID (sent to Ticketmaster as `genreId`), not a free-text genre name. */
  genre?: string | undefined;
  page?: number | undefined;
  size?: number | undefined;
};

export type TicketmasterErrorKind =
  | "missing_api_key"
  | "unauthorized"
  | "forbidden"
  | "rate_limited"
  | "server_error"
  | "network_error"
  | "malformed_response"
  | "unknown";

export type TicketmasterError = {
  kind: TicketmasterErrorKind;
  message: string;
  status?: number | undefined;
};

export type TicketmasterResult =
  | { ok: true; events: PassrEvent[] }
  | { ok: false; error: TicketmasterError };

/**
 * Ticketmaster's classification info for one event, pulled out of whichever
 * classification `pickPrimaryClassification` selected. Segment is the
 * top-level bucket (Music, Sports, Arts & Theatre, Family, Film,
 * Miscellaneous); genre/subGenre/type get more specific within it (e.g.
 * genre "Comedy" under segment "Arts & Theatre", genre "Festival" under
 * segment "Music").
 */
type ClassificationInfo = {
  segment?: string | undefined;
  genre?: string | undefined;
  subGenre?: string | undefined;
  type?: string | undefined;
};

/**
 * Maps Ticketmaster classification info onto Passr's provider-agnostic
 * `EventCategory`. Intentionally a small set of explicit, conservative
 * rules rather than a straight segment-name lookup, since categories like
 * Comedy and Festival live at the genre/subGenre level in Ticketmaster's
 * data, not the segment level.
 *
 * Always returns a category — falls back to "Other" rather than ever
 * skipping/dropping an event just because it doesn't confidently fit one of
 * the more specific buckets (e.g. Ticketmaster's "Film" or "Miscellaneous"
 * segments).
 */
function mapCategory(info: ClassificationInfo): EventCategory {
  const segment = info.segment?.trim().toLowerCase();
  const genre = info.genre?.trim().toLowerCase();
  const subGenre = info.subGenre?.trim().toLowerCase();
  const type = info.type?.trim().toLowerCase();

  const mentions = (needle: string) => segment === needle || genre === needle || subGenre === needle || type === needle;

  // Festivals show up under several segments (usually Music) but are
  // identified by genre/subGenre/type, not by having their own segment.
  if (mentions("festival")) return "Festival";

  // Comedy is typically a genre under "Arts & Theatre" or "Miscellaneous",
  // not its own segment — check before the segment-based rules below.
  if (mentions("comedy")) return "Comedy";

  if (segment === "music") return "Concert";
  if (segment === "sports") return "Sports";
  if (segment === "arts & theatre" || segment === "theatre" || segment === "theater") return "Theater";
  if (segment === "family") return "Family";
  if (mentions("nightlife")) return "Nightlife";

  return "Other";
}

export async function fetchTicketmasterEvents(
  params: TicketmasterSearchParams,
  apiKey: string | undefined,
): Promise<TicketmasterResult> {
  if (!apiKey) {
    return {
      ok: false,
      error: {
        kind: "missing_api_key",
        message: "Ticketmaster is not configured (TICKETMASTER_API_KEY is not set).",
      },
    };
  }

  const url = buildRequestUrl(params, apiKey);

  let response: Response;
  try {
    response = await fetch(url);
  } catch {
    return {
      ok: false,
      error: { kind: "network_error", message: "Could not reach Ticketmaster." },
    };
  }

  if (!response.ok) {
    return { ok: false, error: mapHttpError(response.status) };
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return {
      ok: false,
      error: { kind: "malformed_response", message: "Ticketmaster returned a response that wasn't valid JSON." },
    };
  }

  const rawEvents = extractRawEvents(payload);
  if (rawEvents === undefined) {
    return {
      ok: false,
      error: { kind: "malformed_response", message: "Ticketmaster's response wasn't in the expected shape." },
    };
  }

  const events: PassrEvent[] = [];
  for (const raw of rawEvents) {
    const normalized = normalizeEvent(raw);
    if (normalized) events.push(normalized);
  }

  // Ticketmaster frequently returns multiple listings for one underlying
  // event (a normal listing plus a suite/VIP/parking variant). Collapse
  // those conservatively before handing events back to the caller.
  return { ok: true, events: deduplicateEvents(events) };
}

function buildRequestUrl(params: TicketmasterSearchParams, apiKey: string): string {
  const url = new URL(TICKETMASTER_EVENTS_ENDPOINT);
  url.searchParams.set("apikey", apiKey);
  if (params.city) url.searchParams.set("city", params.city);
  if (params.stateCode) url.searchParams.set("stateCode", params.stateCode);
  if (params.countryCode) url.searchParams.set("countryCode", params.countryCode);
  if (params.startDateTime) url.searchParams.set("startDateTime", params.startDateTime);
  if (params.endDateTime) url.searchParams.set("endDateTime", params.endDateTime);
  if (params.keyword) url.searchParams.set("keyword", params.keyword);
  if (params.classificationName) url.searchParams.set("classificationName", params.classificationName);
  // Ticketmaster's own query param for this is `genreId` (it expects a
  // Ticketmaster genre ID, not a free-text genre name) — `genre` here is
  // just Passr's route's param name, kept stable for callers.
  if (params.genre) url.searchParams.set("genreId", params.genre);
  if (params.page !== undefined) url.searchParams.set("page", String(params.page));
  if (params.size !== undefined) url.searchParams.set("size", String(params.size));
  return url.toString();
}

function mapHttpError(status: number): TicketmasterError {
  if (status === 401) return { kind: "unauthorized", message: "Ticketmaster rejected the API key.", status };
  if (status === 403) return { kind: "forbidden", message: "Ticketmaster denied access to this request.", status };
  if (status === 429) return { kind: "rate_limited", message: "Ticketmaster rate limit was exceeded.", status };
  if (status >= 500) return { kind: "server_error", message: "Ticketmaster is currently unavailable.", status };
  return { kind: "unknown", message: `Ticketmaster returned an unexpected status (${status}).`, status };
}

// ---- Response parsing -------------------------------------------------
// Everything below treats the Ticketmaster payload as untrusted `unknown`
// data and fails safe (skipping a field, or the whole event) rather than
// throwing, per the "malformed responses shouldn't crash" requirement.

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function str(v: unknown): string | undefined {
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

function num(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

/** Ticketmaster omits `_embedded` entirely when a search has zero results. */
function extractRawEvents(payload: unknown): unknown[] | undefined {
  if (!isRecord(payload)) return undefined;
  if (payload['_embedded'] === undefined) return []; // empty results, not malformed
  if (!isRecord(payload['_embedded'])) return undefined;
  const events = payload['_embedded']['events'];
  if (events === undefined) return [];
  return Array.isArray(events) ? events : undefined;
}

function pickPrimaryClassification(
  classifications: Record<string, unknown>[],
): Record<string, unknown> | undefined {
  return classifications.find((c) => c['primary'] === true) ?? classifications[0];
}

function pickBestImage(images: unknown[]): string | undefined {
  let best: { url: string; width: number } | undefined;
  for (const img of images) {
    if (!isRecord(img)) continue;
    const url = str(img['url']);
    if (!url) continue;
    const width = num(img['width']) ?? 0;
    if (!best || width > best.width) best = { url, width };
  }
  return best?.url;
}

/** Lowest `min` across all price ranges Ticketmaster provided, if any. Never fabricated. */
function pickStartingPrice(priceRanges: unknown[]): number | undefined {
  let lowest: number | undefined;
  for (const range of priceRanges) {
    if (!isRecord(range)) continue;
    const min = num(range['min']);
    if (min === undefined) continue;
    if (lowest === undefined || min < lowest) lowest = min;
  }
  return lowest;
}

/** Best-effort "Fri, Sep 18 · 8:00 PM" style string; falls back gracefully. */
function formatDisplayDate(localDate: string | undefined, localTime: string | undefined): string | undefined {
  if (!localDate) return undefined;
  const parsed = new Date(localTime ? `${localDate}T${localTime}` : `${localDate}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return localDate;
  const datePart = parsed.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  if (!localTime) return datePart;
  const timePart = parsed.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${datePart} · ${timePart}`;
}

function normalizeEvent(raw: unknown): PassrEvent | undefined {
  if (!isRecord(raw)) return undefined;

  const id = str(raw['id']);
  const name = str(raw['name']);
  if (!id || !name) return undefined; // not enough to build a usable event

  const classificationsRaw = Array.isArray(raw['classifications']) ? raw['classifications'] : [];
  const classifications = classificationsRaw.filter(isRecord);
  const classification = pickPrimaryClassification(classifications);
  const segmentName = classification && isRecord(classification['segment']) ? str(classification['segment']['name']) : undefined;
  const genre = classification && isRecord(classification['genre']) ? str(classification['genre']['name']) : undefined;
  const subGenre = classification && isRecord(classification['subGenre']) ? str(classification['subGenre']['name']) : undefined;
  const classificationType = classification ? classification["type"] : undefined;
  const typeName = isRecord(classificationType) ? str(classificationType["name"]) : undefined;

  // Never skip an event just because its classification doesn't confidently
  // map onto one of Passr's more specific categories — mapCategory falls
  // back to "Other" rather than returning undefined.
  const category = mapCategory({ segment: segmentName, genre, subGenre, type: typeName });

  const embedded = isRecord(raw['_embedded']) ? raw['_embedded'] : undefined;
  const venues = embedded && Array.isArray(embedded['venues']) ? embedded['venues'].filter(isRecord) : [];
  const venue = venues[0];
  const attractions = embedded && Array.isArray(embedded['attractions']) ? embedded['attractions'].filter(isRecord) : [];
  const attraction = attractions[0];

  const venueName = venue ? str(venue['name']) : undefined;
  const venueCity = venue && isRecord(venue['city']) ? str(venue['city']['name']) : undefined;
  const venueState = venue && isRecord(venue['state']) ? (str(venue['state']['stateCode']) ?? str(venue['state']['name'])) : undefined;
  const venueCountry =
    venue && isRecord(venue['country']) ? (str(venue['country']['countryCode']) ?? str(venue['country']['name'])) : undefined;
  const location = venue && isRecord(venue['location']) ? venue['location'] : undefined;
  const latitude = location ? num(location['latitude']) : undefined;
  const longitude = location ? num(location['longitude']) : undefined;

  const dates = isRecord(raw['dates']) ? raw['dates'] : undefined;
  const start = dates && isRecord(dates['start']) ? dates['start'] : undefined;
  const startDateTime = start ? str(start['dateTime']) : undefined;
  const localDate = start ? str(start['localDate']) : undefined;
  const localTime = start ? str(start['localTime']) : undefined;
  const date = formatDisplayDate(localDate, localTime) ?? localDate ?? "Date to be announced";

  const images = Array.isArray(raw['images']) ? raw['images'] : [];
  const image = pickBestImage(images) ?? "";

  const priceRanges = Array.isArray(raw['priceRanges']) ? raw['priceRanges'] : [];
  const startingAt = pickStartingPrice(priceRanges);

  const description = str(raw['info']) ?? str(raw['pleaseNote']);
  const ticketUrl = str(raw['url']);

  const event: PassrEvent = {
    id: `ticketmaster-${id}`,
    source: "ticketmaster",
    sourceEventId: id,
    name,
    subtitle: attraction ? str(attraction['name']) : undefined,
    description,
    category,
    genre,
    subGenre,
    date,
    startDateTime,
    venue: venueName ?? "Venue to be announced",
    city: venueCity ?? "",
    state: venueState,
    country: venueCountry,
    latitude,
    longitude,
    image,
    startingAt,
    trending: false,
    ticketUrl,
    listingType: classifyListingType(name),
  };

  return event;
}
