/**
 * Browser-side client for Passr's own Ticketmaster endpoint.
 *
 * The browser never talks to Ticketmaster directly — it calls the
 * same-origin server route at /api/events/ticketmaster, which owns the API
 * key and returns already-normalized `PassrEvent[]`.
 *
 * Nothing here creates a second event model: the route's contract is
 * `{ ok: true, events: PassrEvent[] }` or `{ ok: false, error }`, and that
 * is exactly what we surface upward. A genuine API failure throws (so the
 * UI can show an error + mock fallback); a legitimate zero-result search
 * resolves to an empty array.
 */

import { queryOptions } from "@tanstack/react-query";
import type { PassrEvent } from "@/lib/types";

export type EventQueryParams = {
  keyword?: string | undefined;
  id?: string | undefined;
  city?: string | undefined;
  countryCode?: string | undefined;
  size?: number | undefined;
};

export class TicketmasterUnavailableError extends Error {
  readonly kind: string;
  constructor(kind: string, message: string) {
    super(message);
    this.name = "TicketmasterUnavailableError";
    this.kind = kind;
  }
}

function toSearch(params: EventQueryParams): string {
  const sp = new URLSearchParams();
  if (params.keyword) sp.set("keyword", params.keyword);
  if (params.id) sp.set("id", params.id);
  if (params.city) sp.set("city", params.city);
  if (params.countryCode) sp.set("countryCode", params.countryCode);
  if (params.size !== undefined) sp.set("size", String(params.size));
  return sp.toString();
}

export async function fetchPassrEvents(
  params: EventQueryParams,
  signal?: AbortSignal,
): Promise<PassrEvent[]> {
  const res = await fetch(`/api/events/ticketmaster?${toSearch(params)}`, signal ? { signal } : {});
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    throw new TicketmasterUnavailableError("malformed_response", "Ticket data came back unreadable.");
  }

  if (
    typeof body === "object" &&
    body !== null &&
    (body as { ok?: unknown }).ok === true &&
    Array.isArray((body as { events?: unknown }).events)
  ) {
    return (body as { events: PassrEvent[] }).events;
  }

  const err = (body as { error?: { kind?: string; message?: string } } | null)?.error;
  throw new TicketmasterUnavailableError(
    err?.kind ?? "unknown",
    err?.message ?? "Live ticket data is unavailable right now.",
  );
}

export const eventsQuery = (params: EventQueryParams) =>
  queryOptions({
    queryKey: ["tm-events", params] as const,
    queryFn: ({ signal }) => fetchPassrEvents(params, signal),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

/** Ticketmaster-backed PassrEvent ids are prefixed by the provider. */
export const TICKETMASTER_ID_PREFIX = "ticketmaster-";

export const isTicketmasterId = (id: string) => id.startsWith(TICKETMASTER_ID_PREFIX);

export const toTicketmasterEventId = (id: string) => id.slice(TICKETMASTER_ID_PREFIX.length);
