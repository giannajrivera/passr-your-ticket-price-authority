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

export function isTicketmasterId(value: string) {
  return value.startsWith("ticketmaster-");
}

export function toTicketmasterEventId(value: string) {
  return value.startsWith("ticketmaster-")
    ? value.slice("ticketmaster-".length)
    : value;
}

export function eventsQuery(params: EventQueryParams = {}) {
  return queryOptions({
    queryKey: ["events", params],
    queryFn: async (): Promise<PassrEvent[]> => {
      const search = new URLSearchParams();

      Object.entries(params).forEach(([key, value]) => {
        if (value === undefined || value === null || value === "") {
          return;
        }

        search.set(key, String(value));
      });

      const response = await fetch(
        `/api/events/ticketmaster?${search.toString()}`,
      );

      if (!response.ok) {
        let message = "Unable to load events.";

        try {
          const payload = (await response.json()) as {
            error?: { message?: string };
          };
          message = payload.error?.message ?? message;
        } catch {
          // Ignore malformed error payloads and fall back to default message.
        }

        throw new Error(message);
      }

      const payload = (await response.json()) as {
        ok?: boolean;
        events?: PassrEvent[];
      };

      if (!payload.ok || !Array.isArray(payload.events)) {
        throw new Error("Ticketmaster response was malformed.");
      }

      return payload.events;
    },
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });
}
