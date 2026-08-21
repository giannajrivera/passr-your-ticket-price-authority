import type { PassrEvent } from "@/lib/types";
import {
  getEvent,
} from "@/lib/mock-data";
import {
  getMarketplaceQuotes,
} from "@/lib/marketplaces/quotes";

/**
 * Marketplace comparison API.
 *
 * This endpoint intentionally keeps provider logic behind Passr's
 * normalized marketplace layer.
 *
 * Future:
 * Ticketmaster / SeatGeek / StubHub / other provider adapters
 * can be called here without changing the React Event page.
 */

export default async function handler(
  request: Request,
) {
  const url =
    new URL(request.url);

  const eventId =
    url.searchParams.get(
      "eventId",
    );

  if (!eventId) {
    return Response.json(
      {
        ok: false,
        error: {
          message:
            "eventId is required.",
        },
      },
      { status: 400 },
    );
  }

  const event =
    getEvent(eventId);

  /**
   * Mock events can be resolved directly.
   *
   * Live Ticketmaster events are handled by the client-side
   * event lookup and will eventually be passed through here
   * once the server-side event resolver is shared.
   */
  if (!event) {
    return Response.json(
      {
        ok: false,
        error: {
          message:
            "Marketplace quotes are not available for this event yet.",
        },
      },
      { status: 404 },
    );
  }

  const result =
    await getMarketplaceQuotes(
      event as PassrEvent,
    );

  return Response.json({
    ok: true,
    ...result,
  });
}