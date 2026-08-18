/**
 * Eventbrite provider stub for future integration.
 *
 * Passr currently connects to Ticketmaster for live event discovery. This file
 * intentionally does not fabricate data or simulate a live provider. It exists
 * as a clean, provider-shaped contract for when Eventbrite credentials and an
 * approved access model are available.
 */

import type { PassrEvent } from "@/lib/types";

export type EventbriteSearchParams = {
  keyword?: string | undefined;
  city?: string | undefined;
  stateCode?: string | undefined;
  countryCode?: string | undefined;
  startDateTime?: string | undefined;
  endDateTime?: string | undefined;
  page?: number | undefined;
  size?: number | undefined;
};

export type EventbriteErrorKind =
  | "missing_api_key"
  | "unauthorized"
  | "forbidden"
  | "rate_limited"
  | "server_error"
  | "network_error"
  | "malformed_response"
  | "unknown";

export type EventbriteResult =
  | { ok: true; events: PassrEvent[] }
  | { ok: false; error: { kind: EventbriteErrorKind; message: string; status?: number | undefined } };

export async function fetchEventbriteEvents(
  _params: EventbriteSearchParams,
  apiKey: string | undefined,
): Promise<EventbriteResult> {
  if (!apiKey) {
    return {
      ok: false,
      error: {
        kind: "missing_api_key",
        message: "Eventbrite is not configured for this Passr deployment.",
      },
    };
  }

  // This is a stub, not a live implementation. Real Eventbrite integration
  // would require a verified API access model, OAuth or app credentials, and
  // a server-side normalization layer that emits PassrEvent[] exactly like the
  // Ticketmaster provider already does.
  return {
    ok: false,
    error: {
      kind: "unknown",
      message: "Eventbrite integration is not yet connected to Passr.",
    },
  };
}
