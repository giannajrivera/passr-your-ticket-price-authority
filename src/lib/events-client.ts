import { queryOptions } from "@tanstack/react-query";
import type { PassrEvent } from "@/lib/types";

type EventQueryParams = {
  id?: string | undefined;
  city?: string | undefined;
  stateCode?: string | undefined;
  countryCode?: string | undefined;
  startDateTime?: string | undefined;
  endDateTime?: string | undefined;
  keyword?: string | undefined;
  classificationName?: string | undefined;
  genre?: string | undefined;
  page?: number | undefined;
  size?: number | undefined;
};

/**
 * Passr's internal ID convention for live Ticketmaster events.
 *
 * Keeping the provider prefix means Passr can later support:
 *
 * ticketmaster-ABC123
 * seatgeek-ABC123
 * stubhub-ABC123
 *
 * without collisions between providers.
 */
export function isTicketmasterId(value: string) {
  return value.startsWith("ticketmaster-");
}

/**
 * Extract the original Ticketmaster event ID from Passr's
 * provider-prefixed ID.
 */
export function toTicketmasterEventId(value: string) {
  return value.startsWith("ticketmaster-")
    ? value.slice("ticketmaster-".length)
    : value;
}

/**
 * Build the query used by Passr's Ticketmaster event endpoint.
 *
 * This remains provider-specific for now. The returned PassrEvent
 * objects are provider-agnostic, so the rest of the application
 * does not need to know about Ticketmaster's response shape.
 */
export function eventsQuery(
  params: EventQueryParams = {},
) {
  return queryOptions({
    queryKey: ["events", "ticketmaster", params],

    queryFn: async (): Promise<PassrEvent[]> => {
      const search = new URLSearchParams();

      Object.entries(params).forEach(
        ([key, value]) => {
          if (
            value === undefined ||
            value === null ||
            value === ""
          ) {
            return;
          }

          search.set(
            key,
            String(value),
          );
        },
      );

      const queryString =
        search.toString();

      const response = await fetch(
        `/api/events/ticketmaster${
          queryString
            ? `?${queryString}`
            : ""
        }`,
      );

      if (!response.ok) {
        let message =
          "Unable to load events.";

        try {
          const payload =
            (await response.json()) as {
              error?: {
                message?: string;
              };
            };

          message =
            payload.error?.message ??
            message;
        } catch {
          // Ignore malformed error payloads.
        }

        throw new Error(message);
      }

      const payload =
        (await response.json()) as {
          ok?: boolean;
          events?: PassrEvent[];
        };

      if (
        !payload.ok ||
        !Array.isArray(
          payload.events,
        )
      ) {
        throw new Error(
          "Ticketmaster response was malformed.",
        );
      }

      return payload.events;
    },

    staleTime: 60_000,

    gcTime:
      5 * 60_000,
  });
}