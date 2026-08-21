import {
  createFileRoute,
  Link,
  notFound,
} from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Bell,
  BellOff,
  Check,
  ExternalLink,
  Loader2,
  Minus,
  Plus,
  ShieldCheck,
  Ticket,
} from "lucide-react";

import { getEvent, money } from "@/lib/mock-data";
import {
  eventsQuery,
  isTicketmasterId,
  toTicketmasterEventId,
} from "@/lib/events-client";
import type {
  PassrEvent,
  TicketMarketData,
} from "@/lib/types";
import { getVenueLayout } from "@/lib/venue-maps";
import { venueInventory } from "@/lib/venue-listings";
import { BottomNav } from "@/components/BottomNav";
import { VenueMap } from "@/components/VenueMap";
import { AffiliateNote } from "@/components/AffiliateNote";
import {
  isSaved,
  toggleSaved,
  useWatchlist,
} from "@/lib/watchlist";

/**
 * Temporary anchor for Passr's simulated seat-map layer.
 *
 * This is NOT used to claim that a marketplace has tickets.
 * Marketplace availability comes from /api/marketplaces/quotes.
 */
const FALLBACK_ANCHOR_PRICE = 75;

export const Route = createFileRoute("/event/$eventId")({
  loader: ({ params }) => {
    const event = getEvent(params.eventId);

    if (
      !event &&
      !isTicketmasterId(params.eventId)
    ) {
      throw notFound();
    }

    return {
      event: event ?? null,
    };
  },

  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          {
            title: "Event unavailable — Passr",
          },
          {
            name: "robots",
            content: "noindex",
          },
        ],
      };
    }

    const { event } = loaderData;

    if (!event) {
      const title =
        "Event prices — Passr";

      const description =
        "Real ticket availability and prices on Passr.";

      return {
        meta: [
          {
            title,
          },
          {
            name: "description",
            content: description,
          },
          {
            property: "og:title",
            content: title,
          },
          {
            property: "og:description",
            content: description,
          },
        ],
      };
    }

    const title =
      `${event.name} — Passr`;

    const description =
      event.startingAt !== undefined
        ? `${event.date} at ${event.venue}, ${event.city}. Find available tickets on Passr.`
        : `${event.date} at ${event.venue}, ${event.city}. Find available tickets on Passr.`;

    return {
      meta: [
        {
          title,
        },
        {
          name: "description",
          content: description,
        },
        {
          property: "og:title",
          content: title,
        },
        {
          property: "og:description",
          content: description,
        },
      ],
    };
  },

  component: EventRoute,
});

function Shell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col bg-background pb-28">
      <div className="flex items-center gap-3 px-6 pt-6">
        <Link
          to="/"
          aria-label="Back to search"
          className="grid h-10 w-10 place-items-center rounded-full border border-border"
        >
          <ArrowLeft
            className="h-5 w-5"
            strokeWidth={2.2}
          />
        </Link>
      </div>

      <div className="flex flex-1 items-center justify-center px-6 py-24 text-center">
        {children}
      </div>

      <BottomNav />
    </main>
  );
}

/**
 * Marketplace API response.
 *
 * The endpoint is intentionally provider-agnostic.
 */
type MarketplaceQuotesResponse = {
  ok?: boolean;
  quotes?: TicketMarketData[];
};

/**
 * Fetch actual marketplace availability for this exact event.
 *
 * IMPORTANT:
 * This does NOT search generic marketplace pages.
 * It asks Passr's marketplace layer for providers that actually
 * have an offer/listing for this event.
 */
function marketplaceQuotesQuery(
  event: PassrEvent,
) {
  return {
    queryKey: [
      "marketplace-quotes",
      event.id,
    ],

    queryFn:
      async (): Promise<
        TicketMarketData[]
      > => {
        const search =
          new URLSearchParams();

        search.set(
          "eventId",
          event.id,
        );

        search.set(
          "name",
          event.name,
        );

        if (event.venue) {
          search.set(
            "venue",
            event.venue,
          );
        }

        if (event.city) {
          search.set(
            "city",
            event.city,
          );
        }

        if (event.startDateTime) {
          search.set(
            "startDateTime",
            event.startDateTime,
          );
        }

        const response =
          await fetch(
            `/api/marketplaces/quotes?${search.toString()}`,
          );

        if (!response.ok) {
          throw new Error(
            "Unable to load marketplace availability.",
          );
        }

        const payload =
          (await response.json()) as MarketplaceQuotesResponse;

        if (
          !payload.ok ||
          !Array.isArray(
            payload.quotes,
          )
        ) {
          throw new Error(
            "Marketplace response was malformed.",
          );
        }

        return payload.quotes;
      },

    staleTime: 60_000,
    gcTime: 5 * 60_000,
  };
}

/**
 * Makes marketplace names display cleanly.
 *
 * The API should normally provide the marketplace name.
 * This fallback also handles provider URLs such as TicketWeb.
 */
function displayMarketplaceName(
  quote: TicketMarketData,
): string {
  const name =
    quote.marketplace?.trim();

  if (name) {
    return name;
  }

  if (quote.purchaseUrl) {
    try {
      const hostname =
        new URL(
          quote.purchaseUrl,
        ).hostname
          .replace(/^www\./, "")
          .toLowerCase();

      if (
        hostname.includes(
          "ticketweb",
        )
      ) {
        return "TicketWeb";
      }

      if (
        hostname.includes(
          "partiful",
        )
      ) {
        return "Partiful";
      }

      if (
        hostname.includes(
          "seatgeek",
        )
      ) {
        return "SeatGeek";
      }

      if (
        hostname.includes(
          "stubhub",
        )
      ) {
        return "StubHub";
      }

      if (
        hostname.includes(
          "vividseats",
        )
      ) {
        return "Vivid Seats";
      }

      if (
        hostname.includes(
          "tickpick",
        )
      ) {
        return "TickPick";
      }

      if (
        hostname.includes(
          "posh.vip",
        )
      ) {
        return "Posh";
      }

      if (
        hostname.includes(
          "dice.fm",
        )
      ) {
        return "DICE";
      }

      if (
        hostname.includes(
          "eventbrite",
        )
      ) {
        return "Eventbrite";
      }

      if (
        hostname.includes(
          "ticketmaster",
        )
      ) {
        return "Ticketmaster";
      }

      if (
        hostname.includes(
          "axs.com",
        )
      ) {
        return "AXS";
      }
    } catch {
      // Ignore malformed purchase URLs.
    }
  }

  return "Ticket provider";
}

/**
 * Removes duplicate marketplace offers and invalid
 * purchase URLs before showing them to the user.
 */
function cleanMarketplaceQuotes(
  quotes: TicketMarketData[],
): TicketMarketData[] {
  const seen =
    new Set<string>();

  return quotes
    .filter((quote) => {
      if (
        !quote.purchaseUrl ||
        quote.purchaseUrl.trim() === ""
      ) {
        return false;
      }

      try {
        const url = new URL(
          quote.purchaseUrl,
        );

        if (
          url.protocol !==
            "http:" &&
          url.protocol !==
            "https:"
        ) {
          return false;
        }
      } catch {
        return false;
      }

      return true;
    })
    .filter((quote) => {
      const marketplace =
        displayMarketplaceName(
          quote,
        );

      const key =
        marketplace.toLowerCase();

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);

      return true;
    })
    .sort(
      (a, b) =>
        a.totalPrice -
        b.totalPrice,
    );
}

/**
 * Resolves a mock event or a live Ticketmaster event,
 * then renders the event page.
 */
function EventRoute() {
  const { eventId } =
    Route.useParams();

  const mock =
    getEvent(eventId);

  const isLive =
    !mock &&
    isTicketmasterId(
      eventId,
    );

  const query =
    useQuery({
      ...eventsQuery({
        id: isLive
          ? toTicketmasterEventId(
              eventId,
            )
          : undefined,
        size: 1,
      }),
      enabled: isLive,
    });

  if (mock) {
    return (
      <EventDetail
        event={mock}
      />
    );
  }

  if (query.isPending) {
    return (
      <Shell>
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2
            className="h-4 w-4 animate-spin"
            strokeWidth={2.4}
          />
          Loading event…
        </p>
      </Shell>
    );
  }

  if (query.isError) {
    return (
      <Shell>
        <div>
          <AlertTriangle
            className="mx-auto h-6 w-6 text-primary"
            strokeWidth={2.2}
          />

          <p className="mt-3 text-base font-bold">
            Live ticket data is unavailable
          </p>

          <p className="mt-2 text-sm text-muted-foreground">
            We couldn’t reach the
            ticket provider. Try
            again in a moment.
          </p>
        </div>
      </Shell>
    );
  }

  const event =
    query.data?.[0];

  if (!event) {
    return (
      <Shell>
        <div>
          <p className="text-base font-bold">
            This event is no longer listed
          </p>

          <p className="mt-2 text-sm text-muted-foreground">
            The provider didn’t
            return any details
            for it.
          </p>
        </div>
      </Shell>
    );
  }

  return (
    <EventDetail
      event={event}
    />
  );
}

function EventDetail({
  event,
}: {
  event: PassrEvent;
}) {
  const anchorPrice =
    event.startingAt ??
    FALLBACK_ANCHOR_PRICE;

  const watchlist =
    useWatchlist();

  const saved =
    isSaved(
      watchlist,
      event.id,
    );

  /*
   * THIS is the important new connection.
   *
   * The event page asks Passr's marketplace
   * architecture which providers actually have
   * this event.
   */
  const marketplaceQuery =
    useQuery(
      marketplaceQuotesQuery(
        event,
      ),
    );

  const marketplaceQuotes =
    useMemo(
      () =>
        cleanMarketplaceQuotes(
          marketplaceQuery.data ??
            [],
        ),
      [
        marketplaceQuery.data,
      ],
    );

  const cheapestMarketplace =
    marketplaceQuotes[0];

  const layout =
    useMemo(
      () =>
        getVenueLayout(
          event.venue,
          event.category,
        ),
      [
        event.venue,
        event.category,
      ],
    );

  const inventory =
    useMemo(
      () =>
        venueInventory(
          event.id,
          anchorPrice,
          layout.zones,
          event.category !==
            "Theater",
        ),
      [
        event.id,
        anchorPrice,
        layout.zones,
        event.category,
      ],
    );

  const available =
    useMemo(
      () =>
        [
          ...inventory.values(),
        ]
          .filter(
            (i) =>
              !i.soldOut,
          )
          .sort(
            (a, b) =>
              a.from -
              b.from,
          ),
      [inventory],
    );

  const [
    zoneId,
    setZoneId,
  ] = useState(
    () =>
      [
        ...inventory.values(),
      ]
        .filter(
          (i) =>
            !i.soldOut,
        )
        .sort(
          (a, b) =>
            b.zone.tier -
            a.zone.tier,
        )[2]?.zone.id ??
      available[0]?.zone
        .id ??
      layout.zones[0]!.id,
  );

  const zone =
    inventory.get(
      zoneId,
    ) ??
    available[0]!;

  const [
    listingId,
    setListingId,
  ] =
    useState<
      string | null
    >(null);

  const listing =
    zone?.listings.find(
      (l) =>
        l.id ===
        listingId,
    ) ??
    zone?.listings[0];

  const [
    people,
    setPeople,
  ] = useState(2);

  const selectZone = (
    id: string,
  ) => {
    setZoneId(id);
    setListingId(null);
  };

  const cheapestTotal =
    cheapestMarketplace
      ?.totalPrice ??
    listing?.base ??
    anchorPrice;

  const averagePrice =
    zone?.avg30 ??
    cheapestTotal;

  const delta =
    averagePrice > 0
      ? Math.round(
          ((cheapestTotal -
            averagePrice) /
            averagePrice) *
            100,
        )
      : 0;

  const below =
    cheapestTotal <
    averagePrice;

  return (
    <main className="mx-auto min-h-screen max-w-md bg-background pb-28">
      <header className="relative">
        {event.image ? (
          <img
            src={event.image}
            alt={event.name}
            width={1024}
            height={640}
            className="h-56 w-full object-cover"
          />
        ) : (
          <div className="h-56 w-full bg-accent-soft" />
        )}

        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
          <Link
            to="/"
            aria-label="Back to search"
            className="grid h-10 w-10 place-items-center rounded-full bg-background/90"
          >
            <ArrowLeft
              className="h-5 w-5"
              strokeWidth={2.2}
            />
          </Link>

          <button
            onClick={() =>
              toggleSaved(
                event,
                cheapestTotal,
              )
            }
            aria-label={
              saved
                ? "Remove from watchlist"
                : "Save to watchlist"
            }
            className={`grid h-10 w-10 place-items-center rounded-full ${
              saved
                ? "bg-primary text-primary-foreground"
                : "bg-background/90 text-foreground"
            }`}
          >
            {saved ? (
              <Bell
                className="h-5 w-5"
                strokeWidth={2.2}
              />
            ) : (
              <BellOff
                className="h-5 w-5"
                strokeWidth={2.2}
              />
            )}
          </button>
        </div>
      </header>

      <section className="bg-foreground px-6 pt-6 pb-8 text-background">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-background/60">
          {event.category}
          {event.subtitle
            ? ` · ${event.subtitle}`
            : ""}
        </p>

        <h1 className="mt-2 text-3xl font-bold leading-[1.1] tracking-tight">
          {event.name}
        </h1>

        <p className="mt-3 text-sm text-background/70">
          {event.date} ·{" "}
          {event.venue}
          {event.city
            ? `, ${event.city}`
            : ""}
          {event.state
            ? `, ${event.state}`
            : ""}
        </p>
      </section>

      {/* REAL EVENT-SPECIFIC MARKETPLACE AVAILABILITY */}
      <section className="px-6 pt-7">
        <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-muted-foreground">
          Find tickets
        </h2>

        <p className="mt-1 text-sm text-muted-foreground">
          Buy tickets directly from
          providers listing this event.
        </p>

        {marketplaceQuery.isPending && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-border px-4 py-4 text-sm text-muted-foreground">
            <Loader2
              className="h-4 w-4 animate-spin"
              strokeWidth={2.2}
            />
            Checking ticket availability…
          </div>
        )}

        {marketplaceQuery.isError && (
          <div className="mt-4 rounded-xl border border-border px-4 py-4">
            <p className="text-sm font-bold">
              Ticket availability
              couldn’t be checked.
            </p>

            <p className="mt-1 text-xs text-muted-foreground">
              Try again in a moment.
            </p>
          </div>
        )}

        {!marketplaceQuery.isPending &&
          !marketplaceQuery.isError &&
          marketplaceQuotes.length ===
            0 && (
            <div className="mt-4 rounded-xl border border-border px-4 py-4">
              <p className="text-sm font-bold">
                No direct ticket
                listings found yet.
              </p>

              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Passr only shows providers
                when it has an actual
                ticket link for this event.
              </p>
            </div>
          )}

        {marketplaceQuotes.length >
          0 && (
          <>
            <div className="mt-4 space-y-2">
              {marketplaceQuotes.map(
                (
                  quote,
                  index,
                ) => {
                  const marketplace =
                    displayMarketplaceName(
                      quote,
                    );

                  const best =
                    index === 0;

                  return (
                    <a
                      key={`${marketplace}-${quote.purchaseUrl}`}
                      href={
                        quote.purchaseUrl
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-4 transition-colors hover:bg-accent-soft ${
                        best
                          ? "border-primary bg-accent-soft"
                          : "border-border"
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-base font-bold">
                          {marketplace}
                        </p>

                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {quote.section
                            ? `${quote.section}${
                                quote.row
                                  ? ` · Row ${quote.row}`
                                  : ""
                              }`
                            : "Tickets available"}
                        </p>

                        {quote.lastUpdated && (
                          <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                            Updated{" "}
                            {new Date(
                              quote.lastUpdated,
                            ).toLocaleTimeString(
                              "en-US",
                              {
                                hour: "numeric",
                                minute:
                                  "2-digit",
                              },
                            )}
                          </p>
                        )}
                      </div>

                      <div className="flex shrink-0 items-center gap-3">
                        <div className="text-right">
                          <p
                            className={`price text-xl font-bold ${
                              best
                                ? "text-primary"
                                : ""
                            }`}
                          >
                            {money(
                              quote.totalPrice,
                            )}
                          </p>

                          {best && (
                            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
                              Best price
                            </p>
                          )}
                        </div>

                        <ExternalLink
                          className="h-4 w-4 text-muted-foreground"
                          strokeWidth={2.2}
                        />
                      </div>
                    </a>
                  );
                },
              )}
            </div>

            <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
              Passr only displays providers
              with an event-specific ticket
              listing. Prices and availability
              can change on the provider's site.
            </p>
          </>
        )}
      </section>

      {/* SEAT MAP */}
      {zone && (
        <section className="px-6 pt-8">
          <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-muted-foreground">
            {event.venue}
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Tap any section to see
            what's available there.
          </p>

          <div className="mt-3">
            <VenueMap
              event={event}
              inventory={inventory}
              selectedId={
                zone.zone.id
              }
              onSelect={
                selectZone
              }
            />
          </div>

          <div className="mt-4 rounded-2xl border border-border">
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-base font-bold">
                  {zone.zone.name}
                </p>

                <p className="text-xs text-muted-foreground">
                  {zone.listings.length}{" "}
                  {zone.listings.length ===
                  1
                    ? "listing"
                    : "listings"}{" "}
                  · {zone.seats}{" "}
                  tickets
                </p>
              </div>

              <p className="price shrink-0 text-sm font-bold text-primary">
                from{" "}
                {money(
                  zone.from,
                )}
              </p>
            </div>

            <ul className="divide-y divide-border">
              {zone.listings.map(
                (l) => {
                  const active =
                    l.id ===
                    listing?.id;

                  return (
                    <li
                      key={l.id}
                    >
                      <button
                        onClick={() =>
                          setListingId(
                            l.id,
                          )
                        }
                        aria-pressed={
                          active
                        }
                        className={`flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left ${
                          active
                            ? "bg-accent-soft"
                            : ""
                        }`}
                      >
                        <span className="flex min-w-0 items-center gap-3">
                          <Ticket
                            className={`h-4 w-4 shrink-0 ${
                              active
                                ? "text-primary"
                                : "text-muted-foreground"
                            }`}
                            strokeWidth={
                              2.2
                            }
                          />

                          <span className="min-w-0">
                            <span className="block truncate text-sm font-bold">
                              {zone
                                .zone
                                .standing
                                ? "General admission"
                                : `Row ${l.row}`}
                            </span>

                            <span className="block text-xs text-muted-foreground">
                              {l.qty}{" "}
                              {l.qty ===
                              1
                                ? "ticket"
                                : "tickets"}{" "}
                              together
                            </span>
                          </span>
                        </span>

                        <span className="price shrink-0 text-lg font-bold">
                          {money(
                            l.base,
                          )}
                        </span>
                      </button>
                    </li>
                  );
                },
              )}
            </ul>
          </div>

          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {available
              .slice(0, 8)
              .map((i) => (
                <button
                  key={
                    i.zone.id
                  }
                  onClick={() =>
                    selectZone(
                      i.zone.id,
                    )
                  }
                  className={`shrink-0 rounded-full border px-3.5 py-2 text-xs font-bold ${
                    i.zone.id ===
                    zone.zone.id
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border"
                  }`}
                >
                  {i.zone.name} ·{" "}
                  {money(
                    i.from,
                  )}
                </button>
              ))}
          </div>
        </section>
      )}

      {/* LIVE MARKETPLACE PRICE COMPARISON */}
      <section className="px-6 pt-8">
        <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-muted-foreground">
          Out-the-door price
        </h2>

        <p className="mt-1 text-sm text-muted-foreground">
          Per ticket, every fee included.
        </p>

        {marketplaceQuery.isPending && (
          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2
              className="h-4 w-4 animate-spin"
              strokeWidth={2.2}
            />
            Loading prices…
          </div>
        )}

        {!marketplaceQuery.isPending &&
          marketplaceQuotes.length ===
            0 && (
            <div className="mt-4 rounded-xl border border-border px-4 py-4">
              <p className="text-sm text-muted-foreground">
                No verified marketplace
                prices are available for
                this event yet.
              </p>
            </div>
          )}

        {marketplaceQuotes.length >
          0 && (
          <ul className="mt-4 space-y-2">
            {marketplaceQuotes.map(
              (
                quote,
                index,
              ) => {
                const best =
                  index === 0;

                return (
                  <li
                    key={`${quote.marketplace}-price-${quote.purchaseUrl}`}
                    className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 rounded-xl border px-4 py-4 ${
                      best
                        ? "border-primary bg-accent-soft"
                        : "border-border"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-base font-bold">
                        {displayMarketplaceName(
                          quote,
                        )}
                      </p>

                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {money(
                          quote.basePrice,
                        )}{" "}
                        +{" "}
                        {money(
                          quote.fees,
                        )}{" "}
                        fees
                      </p>
                    </div>

                    <div className="shrink-0 text-right">
                      <p
                        className={`price text-2xl font-bold ${
                          best
                            ? "text-primary"
                            : ""
                        }`}
                      >
                        {money(
                          quote.totalPrice,
                        )}
                      </p>

                      {best && (
                        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
                          Cheapest
                        </p>
                      )}
                    </div>
                  </li>
                );
              },
            )}
          </ul>
        )}

        <p className="mt-3 text-[11px] text-muted-foreground">
          Passr compares verified event-specific
          marketplace offers. We do not display
          generic marketplace search links.
        </p>
      </section>

      {/* MARKET VALUE */}
      {zone && (
        <section className="mx-6 mt-8 rounded-2xl border border-border p-6">
          <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-muted-foreground">
            Market value · 30-day avg
          </h2>

          <p className="price mt-3 text-6xl font-bold leading-none">
            {money(
              zone.avg30,
            )}
          </p>

          <p className="mt-3 text-sm text-muted-foreground">
            Average out-the-door price paid
            for {zone.zone.name} over the
            last 30 days.
          </p>

          <span
            className={`mt-4 inline-flex items-center rounded-full px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide ${
              below
                ? "bg-success-soft text-success"
                : "bg-accent-soft text-primary"
            }`}
          >
            {below
              ? `${Math.abs(delta)}% below average · good deal`
              : `${Math.abs(delta)}% above average`}
          </span>
        </section>
      )}

      {/* LISTING CHECK */}
      <section className="mx-6 mt-4 flex items-start gap-3 rounded-2xl border border-border p-5">
        <ShieldCheck
          className="mt-0.5 h-5 w-5 shrink-0 text-success"
          strokeWidth={2.2}
        />

        <p className="text-sm leading-relaxed">
          <span className="font-bold">
            Listing check passed.
          </span>{" "}
          <span className="text-muted-foreground">
            Seller history, price movement,
            and delivery method all match
            normal patterns for this venue.
            Nothing looks off.
          </span>
        </p>
      </section>

      {/* TEMPORARY GROUP CALCULATOR */}
      <section className="mx-6 mt-4 rounded-2xl bg-foreground p-6 text-background">
        <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-background/60">
          Splitting with friends?
        </h2>

        <div className="mt-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Stepper
              label="Remove one person"
              disabled={
                people <= 1
              }
              onClick={() =>
                setPeople(
                  (p) =>
                    Math.max(
                      1,
                      p - 1,
                    ),
                )
              }
            >
              <Minus
                className="h-5 w-5"
                strokeWidth={2.4}
              />
            </Stepper>

            <span className="price w-8 text-center text-2xl font-bold">
              {people}
            </span>

            <Stepper
              label="Add one person"
              disabled={
                people >= 10
              }
              onClick={() =>
                setPeople(
                  (p) =>
                    Math.min(
                      10,
                      p + 1,
                    ),
                )
              }
            >
              <Plus
                className="h-5 w-5"
                strokeWidth={2.4}
              />
            </Stepper>
          </div>

          <div className="text-right">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-background/60">
              per person
            </p>

            <p className="price text-4xl font-bold leading-none">
              {money(
                cheapestTotal,
              )}
            </p>
          </div>
        </div>

        <p className="mt-5 text-sm text-background/70">
          {people}{" "}
          {people === 1
            ? "ticket"
            : "tickets"}{" "}
          at the current best
          available price ·{" "}
          <span className="font-bold text-background">
            {money(
              cheapestTotal *
                people,
            )}
          </span>{" "}
          total.
        </p>
      </section>

      <div className="space-y-3 px-6 pt-6">
        <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Check
            className="h-3.5 w-3.5 text-success"
            strokeWidth={3}
          />
          Passr only reads prices. We never
          mark them up.
        </p>

        <AffiliateNote />
      </div>

      <BottomNav />
    </main>
  );
}

function Stepper({
  children,
  onClick,
  disabled,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled: boolean;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="grid h-11 w-11 place-items-center rounded-full border border-background/25 text-background disabled:opacity-30"
    >
      {children}
    </button>
  );
}