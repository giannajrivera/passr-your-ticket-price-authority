
import { queryOptions } from "@tanstack/react-query";
import type { MarketplaceQuoteResponse } from "./types";

export type MarketplaceQuoteParams = {
  eventId: string;
};

export function marketplaceQuotesQuery(
  params: MarketplaceQuoteParams,
) {
  return queryOptions({
    queryKey: [
      "marketplace-quotes",
      params,
    ],

    queryFn: async (): Promise<MarketplaceQuoteResponse> => {
      const search =
        new URLSearchParams();

      search.set(
        "eventId",
        params.eventId,
      );

      const response = await fetch(
        `/api/marketplaces/quotes?${search.toString()}`,
      );

      if (!response.ok) {
        let message =
          "Unable to load marketplace prices.";

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
          // Keep the default error.
        }

        throw new Error(message);
      }

      const payload =
        (await response.json()) as MarketplaceQuoteResponse & {
          ok?: boolean;
        };

      if (
        payload.ok === false ||
        !Array.isArray(payload.quotes)
      ) {
        throw new Error(
          "Marketplace response was malformed.",
        );
      }

      return payload;
    },

    staleTime: 60_000,

    gcTime:
      5 * 60_000,
  });
}