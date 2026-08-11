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

import type { EventCategory, PassrEvent } from "@/lib/types";

const TICKETMASTER_EVENTS_ENDPOINT = "https://app.ticketmaster.com/discovery/v2/events.json";

export type TicketmasterSearchParams = {
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
 * Small, explicit provider → Passr category mapping. Ticketmaster's
 * "segment" classification strings don't line up 1:1 with Passr's
 * categories, so this is intentionally a lookup table rather than an
 * assumption that the strings match.
 */
const SEGMENT_TO_CATEGORY: Record<string, EventCategory> = {
  music: "Concert",
  sports: "Sports",
  "arts & theatre": "Theater",
  theatre: "Theater",
  theater: "Theater",
};

function mapCategory(segmentName: string | undefined): EventCategory | undefined {
  if (!segmentName) return undefined;
  return SEGMENT_TO_CATEGORY[segmentName.trim().toLowerCase()];
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

  return { ok: true, events };
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
  if (params.genre) url.searchParams.set("genre", params.genre);
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
  if (payload["_embedded"] === undefined) return []; // empty results, not malformed
  if (!isRecord(payload["_embedded"])) return undefined;
  const events = payload["_embedded"]["events"];
  if (events === undefined) return [];
  return Array.isArray(events) ? events : undefined;
}

function pickPrimaryClassification(
  classifications: Record<string, unknown>[],
): Record<string, unknown> | undefined {
  return classifications.find((c) => c["primary"] === true) ?? classifications[0];
}

function pickBestImage(images: unknown[]): string | undefined {
  let best: { url: string; width: number } | undefined;
  for (const img of images) {
    if (!isRecord(img)) continue;
    const url = str(img["url"]);
    if (!url) continue;
    const width = num(img["width"]) ?? 0;
    if (!best || width > best.width) best = { url, width };
  }
  return best?.url;
}

/** Lowest `min` across all price ranges Ticketmaster provided, if any. Never fabricated. */
function pickStartingPrice(priceRanges: unknown[]): number | undefined {
  let lowest: number | undefined;
  for (const range of priceRanges) {
    if (!isRecord(range)) continue;
    const min = num(range["min"]);
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

  const id = str(raw["id"]);
  const name = str(raw["name"]);
  if (!id || !name) return undefined; // not enough to build a usable event

  const classificationsRaw = Array.isArray(raw["classifications"]) ? raw["classifications"] : [];
  const classifications = classificationsRaw.filter(isRecord);
  const classification = pickPrimaryClassification(classifications);
  const segmentName = classification && isRecord(classification["segment"]) ? str(classification["segment"]["name"]) : undefined;

  const category = mapCategory(segmentName);
  // Ticketmaster's classification doesn't map confidently onto one of
  // Passr's three categories (e.g. "Film", "Miscellaneous") — skip this
  // event rather than mislabel it.
  if (!category) return undefined;

  const genre = classification && isRecord(classification["genre"]) ? str(classification["genre"]["name"]) : undefined;
  const subGenre = classification && isRecord(classification["subGenre"]) ? str(classification["subGenre"]["name"]) : undefined;

  const embedded = isRecord(raw["_embedded"]) ? raw["_embedded"] : undefined;
  const venues = embedded && Array.isArray(embedded["venues"]) ? embedded["venues"].filter(isRecord) : [];
  const venue = venues[0];
  const attractions = embedded && Array.isArray(embedded["attractions"]) ? embedded["attractions"].filter(isRecord) : [];
  const attraction = attractions[0];

  const venueName = venue ? str(venue["name"]) : undefined;
  const venueCity = venue && isRecord(venue["city"]) ? str(venue["city"]["name"]) : undefined;
  const venueState = venue && isRecord(venue["state"]) ? (str(venue["state"]["stateCode"]) ?? str(venue["state"]["name"])) : undefined;
  const venueCountry =
    venue && isRecord(venue["country"]) ? (str(venue["country"]["countryCode"]) ?? str(venue["country"]["name"])) : undefined;
  const location = venue && isRecord(venue["location"]) ? venue["location"] : undefined;
  const latitude = location ? num(location["latitude"]) : undefined;
  const longitude = location ? num(location["longitude"]) : undefined;

  const dates = isRecord(raw["dates"]) ? raw["dates"] : undefined;
  const start = dates && isRecord(dates["start"]) ? dates["start"] : undefined;
  const startDateTime = start ? str(start["dateTime"]) : undefined;
  const localDate = start ? str(start["localDate"]) : undefined;
  const localTime = start ? str(start["localTime"]) : undefined;
  const date = formatDisplayDate(localDate, localTime) ?? localDate ?? "Date to be announced";

  const images = Array.isArray(raw["images"]) ? raw["images"] : [];
  const image = pickBestImage(images) ?? "";

  const priceRanges = Array.isArray(raw["priceRanges"]) ? raw["priceRanges"] : [];
  const startingAt = pickStartingPrice(priceRanges);

  const description = str(raw["info"]) ?? str(raw["pleaseNote"]);
  const ticketUrl = str(raw["url"]);

  const event: PassrEvent = {
    id: `ticketmaster-${id}`,
    source: "ticketmaster",
    sourceEventId: id,
    name,
    subtitle: attraction ? str(attraction["name"]) : undefined,
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
  };

  return event;
}
