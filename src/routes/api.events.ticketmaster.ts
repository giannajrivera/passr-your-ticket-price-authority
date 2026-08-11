// Server route (not a page): GET /api/events/ticketmaster
//
// This is the only place allowed to call Ticketmaster directly. The browser
// never talks to Ticketmaster — it calls this same-origin endpoint, which
// runs server-side, reads TICKETMASTER_API_KEY from the server environment,
// and returns normalized PassrEvent[] as JSON.
//
//   Browser → GET /api/events/ticketmaster → Ticketmaster Discovery API
//           → normalized PassrEvent[] → Browser
//
// See https://tanstack.com/start/latest/docs/framework/react/guide/server-routes
// for the `server.handlers` file-route convention used here.

import { createFileRoute } from "@tanstack/react-router";

import {
  fetchTicketmasterEvents,
  type TicketmasterErrorKind,
  type TicketmasterSearchParams,
} from "@/lib/providers/ticketmaster";

function parseSearchParams(url: URL): TicketmasterSearchParams {
  const sp = url.searchParams;
  const page = sp.get("page");
  const size = sp.get("size");
  return {
    city: sp.get("city") ?? undefined,
    stateCode: sp.get("stateCode") ?? undefined,
    countryCode: sp.get("countryCode") ?? undefined,
    startDateTime: sp.get("startDateTime") ?? undefined,
    endDateTime: sp.get("endDateTime") ?? undefined,
    keyword: sp.get("keyword") ?? undefined,
    classificationName: sp.get("classificationName") ?? undefined,
    genre: sp.get("genre") ?? undefined,
    page: page !== null && page !== "" ? Number(page) : undefined,
    size: size !== null && size !== "" ? Number(size) : undefined,
  };
}

// Maps a provider-error kind to the HTTP status this endpoint hands back to
// the browser. The browser only ever sees this clean status + JSON body —
// never Ticketmaster's raw error response.
function statusForErrorKind(kind: TicketmasterErrorKind): number {
  switch (kind) {
    case "missing_api_key":
      return 503; // Passr itself isn't configured
    case "unauthorized":
    case "forbidden":
      return 502; // Passr's credentials/request are the problem, not the caller's
    case "rate_limited":
      return 429;
    case "server_error":
    case "network_error":
    case "malformed_response":
      return 502;
    case "unknown":
    default:
      return 500;
  }
}

export const Route = createFileRoute("/api/events/ticketmaster")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const params = parseSearchParams(url);

        // Read the secret here, per-request, inside the handler — not at
        // module scope. See src/lib/providers/ticketmaster.ts for why.
        const apiKey = process.env["TICKETMASTER_API_KEY"];

        const result = await fetchTicketmasterEvents(params, apiKey);

        if (!result.ok) {
          return Response.json(
            { ok: false, error: result.error },
            { status: statusForErrorKind(result.error.kind) },
          );
        }

        return Response.json({ ok: true, events: result.events });
      },
    },
  },
});
