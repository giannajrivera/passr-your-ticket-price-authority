/**
 * Provider-agnostic helpers for cleaning up normalized `PassrEvent[]` lists.
 *
 * These operate purely on `PassrEvent` (and plain strings) — nothing here
 * knows about Ticketmaster's payload shape. That keeps them reusable across
 * providers (Ticketmaster today, Eventbrite/etc. later) and easy to unit
 * test in isolation from any HTTP/parsing concerns.
 */

import type { ListingType, PassrEvent } from "@/lib/types";

// ---- Listing-type classification --------------------------------------

// Checked in this order — most specific/unambiguous patterns first, since a
// name can technically match more than one (e.g. "VIP Parking").
const SUITE_PATTERN = /\b(suite|suites|skybox|sky box|loge box)\b/i;
const PARKING_PATTERN = /\bparking\b/i;
const VIP_PATTERN = /\b(vip|meet\s*(&|and)\s*greet|backstage pass)\b/i;
const PACKAGE_PATTERN = /\b(package|hospitality|bundle|add[-\s]?on)\b/i;
const OTHER_NON_STANDARD_PATTERN = /\b(reservation|premium seating|upgrade)\b/i;

/**
 * Conservatively classifies a listing as standard or non-standard purely
 * from its display name (the only signal Ticketmaster's search response
 * reliably gives us for this). Errs toward "standard": a name has to
 * actually contain one of the known non-standard markers to be flagged, so
 * ordinary events are never miscategorized just because we're unsure.
 */
export function classifyListingType(name: string): ListingType {
  const normalized = name.toLowerCase();
  if (SUITE_PATTERN.test(normalized)) return "suite";
  if (PARKING_PATTERN.test(normalized)) return "parking";
  if (VIP_PATTERN.test(normalized)) return "vip";
  if (PACKAGE_PATTERN.test(normalized)) return "package";
  if (OTHER_NON_STANDARD_PATTERN.test(normalized)) return "other";
  return "standard";
}

// ---- Deduplication -------------------------------------------------------

/**
 * Normalizes free text (an event/attraction name, a venue name) into a
 * comparable identity string: lowercased, diacritics stripped, punctuation
 * collapsed to single spaces. Used only for *comparing* events — never for
 * display.
 */
export function normalizeEventIdentity(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents
    .replace(/[^\p{L}\p{N}]+/gu, " ") // punctuation/symbols -> space
    .trim()
    .replace(/\s+/g, " ");
}

function isTicketmasterUrl(url: string | undefined): boolean {
  if (!url) return false;
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === "ticketmaster.com" || host.endsWith(".ticketmaster.com");
  } catch {
    return false;
  }
}

/**
 * Builds the key used to group potential duplicates: same normalized
 * event/attraction identity, same normalized venue, same exact start
 * date/time. All three must be present and match — if any is missing (e.g.
 * a TBD event with no `startDateTime`), the event is never merged with
 * anything, per the "conservative" dedup requirement.
 *
 * Prefers `subtitle` (the provider's attraction/artist name) over `name`
 * for the identity component when available, since it's more stable across
 * variant listings of the same underlying event ("Eagles Live at Sphere"
 * vs. "Eagles - Suite Reservation" share an attraction even though their
 * event names differ).
 */
function buildDedupKey(event: PassrEvent): string | undefined {
  const identitySource = event.subtitle?.trim() || event.name.trim();
  const identity = normalizeEventIdentity(identitySource);
  const venue = normalizeEventIdentity(event.venue);
  const start = event.startDateTime;

  if (!identity || !venue || !start) return undefined;
  return `${identity}::${venue}::${start}`;
}

/** Lower = more preferred when choosing which duplicate to keep. */
function listingTypeRank(listingType: ListingType | undefined): number {
  return listingType === "standard" || listingType === undefined ? 0 : 1;
}

/**
 * Decides whether `candidate` should replace `existing` as the kept
 * representative for a dedup group. Conservative, ordered tie-breaks:
 *  1. Prefer a "standard" listing over suite/vip/parking/package/other.
 *  2. Prefer a ticketmaster.com URL over a third-party one (e.g. a resale
 *     or suite-reservation partner site).
 *  3. Prefer whichever has real price data, since that's more useful to show.
 *  4. Otherwise keep whichever was seen first (stable — no replacement).
 */
function shouldPreferReplacement(existing: PassrEvent, candidate: PassrEvent): boolean {
  const existingRank = listingTypeRank(existing.listingType);
  const candidateRank = listingTypeRank(candidate.listingType);
  if (candidateRank !== existingRank) return candidateRank < existingRank;

  const existingIsTm = isTicketmasterUrl(existing.ticketUrl);
  const candidateIsTm = isTicketmasterUrl(candidate.ticketUrl);
  if (candidateIsTm !== existingIsTm) return candidateIsTm;

  if (existing.startingAt === undefined && candidate.startingAt !== undefined) return true;

  return false;
}

/**
 * Collapses duplicate listings of the same underlying event (e.g. a normal
 * Ticketmaster listing plus a "Suite Reservation" / third-party listing for
 * the same artist, venue, and start time) down to a single representative.
 *
 * Deliberately conservative: two events are only ever merged when they
 * share the same normalized event/attraction identity, the same normalized
 * venue, AND the exact same `startDateTime`. Events for the same
 * artist/venue on different dates are always kept separate. Events missing
 * venue or start-time data are never merged with anything.
 *
 * Preserves the input order of first-seen events; never drops a group down
 * to zero events.
 */
export function deduplicateEvents(events: PassrEvent[]): PassrEvent[] {
  const result: PassrEvent[] = [];
  const indexByKey = new Map<string, number>();

  for (const event of events) {
    const key = buildDedupKey(event);
    if (key === undefined) {
      result.push(event);
      continue;
    }

    const existingIndex = indexByKey.get(key);
    if (existingIndex === undefined) {
      indexByKey.set(key, result.length);
      result.push(event);
      continue;
    }

    const existing = result[existingIndex];
    if (existing && shouldPreferReplacement(existing, event)) {
      result[existingIndex] = event;
    }
    // else: `event` is a duplicate of `existing` and is dropped.
  }

  return result;
}
