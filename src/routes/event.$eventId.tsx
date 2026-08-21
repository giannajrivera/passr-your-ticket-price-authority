import {
  createFileRoute,
  Link,
  notFound,
} from "@tanstack/react-router";

import { useQuery } from "@tanstack/react-query";

import { useMemo } from "react";

import {
  AlertTriangle,
  ArrowLeft,
  Bell,
  BellOff,
  Check,
  ExternalLink,
  Loader2,
  ShieldCheck,
  Ticket,
} from "lucide-react";

import {
  getEvent,
  money,
  quotesFor,
} from "@/lib/mock-data";

import {
  eventsQuery,
  isTicketmasterId,
  toTicketmasterEventId,
} from "@/lib/events-client";

import type {
  PassrEvent,
} from "@/lib/types";

import {
  getVenueLayout,
} from "@/lib/venue-maps";

import {
  venueInventory,
} from "@/lib/venue-listings";

import {
  BottomNav,
} from "@/components/BottomNav";

import {
  VenueMap,
} from "@/components/VenueMap";

import {
  AffiliateNote,
} from "@/components/AffiliateNote";

import {
  isSaved,
  toggleSaved,
  useWatchlist,
} from "@/lib/watchlist";

import {
  getAvailableMarketplaceListings,
} from "@/lib/marketplace-quotes";

const FALLBACK_ANCHOR_PRICE = 75;

export const Route =
  createFileRoute(
    "/event/$eventId",
  )({
    loader: ({ params }) => {
      const event =
        getEvent(params.eventId);

      if (
        !event &&
        !isTicketmasterId(
          params.eventId,
        )
      ) {
        throw notFound();
      }

      return {
        event: event ?? null,
      };
    },

    head: ({
      loaderData,
    }) => {
      if (!loaderData) {
        return {
          meta: [
            {
              title:
                "Event unavailable — Passr",
            },
            {
              name: "robots",
              content: "noindex",
            },
          ],
        };
      }

      const { event } =
        loaderData;

      if (!event) {
        const title =
          "Event prices — Passr";

        const description =
          "Find and compare real ticket prices on Passr.";

        return {
          meta: [
            {
              title,
            },
            {
              name: "description",
              content:
                description,
            },
          ],
        };
      }

      const title =
        `${event.name} — Passr`;

      return {
        meta: [
          {
            title,
          },
          {
            name: "description",
            content:
              `${event.date} at ${event.venue}, ${event.city}. Find tickets on Passr.`,
          },
        ],
      };
    },

    component:
      EventRoute,
  });

function Shell({
  children,
}: {
  children:
    React.ReactNode;
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

function EventRoute() {
  const {
    eventId,
  } = Route.useParams();

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
            We couldn't reach the
            ticket provider.
            Try again in a moment.
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
            The provider didn't
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

  /**
   * STEP 3:
   *
   * This is now the single source of truth for the "Find tickets" section.
   *
   * No generic marketplace search links.
   * No fake availability.
   *
   * If Passr doesn't have a direct event URL for a marketplace,
   * that marketplace does not appear.
   */
  const marketplaceListings =
    useMemo(
      () =>
        getAvailableMarketplaceListings(
          event,
        ),
      [event],
    );

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
            (item) =>
              !item.soldOut,
          )
          .sort(
            (a, b) =>
              a.from - b.from,
          ),
      [inventory],
    );

  const zone =
    available[0];

  const quotes =
    useMemo(
      () =>
        zone
          ? quotesFor(
              zone.listings[0]
                ?.base ??
                zone.from,
            )
          : [],
      [zone],
    );

  const cheapest =
    quotes[0];

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
                cheapest?.total ??
                  anchorPrice,
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

      {/* REAL MARKETPLACE LINKS */}
      {marketplaceListings.length >
        0 && (
        <section className="px-6 pt-7">
          <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-muted-foreground">
            Find tickets
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Direct ticket links for
            this event.
          </p>

          <div className="mt-4 space-y-2">
            {marketplaceListings.map(
              (listing) => (
                <a
                  key={
                    listing.marketplace
                  }
                  href={
                    listing.purchaseUrl
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-4 transition-colors hover:bg-accent-soft"
                >
                  <span>
                    <span className="block text-sm font-bold">
                      {
                        listing.marketplaceName
                      }
                    </span>

                    <span className="mt-0.5 block text-[10px] uppercase tracking-wide text-muted-foreground">
                      Direct event tickets
                    </span>
                  </span>

                  <ExternalLink
                    className="h-4 w-4 shrink-0 text-muted-foreground"
                    strokeWidth={2.2}
                  />
                </a>
              ),
            )}
          </div>

          <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
            Passr only shows direct
            ticket destinations that
            are connected to this
            event.
          </p>
        </section>
      )}

      <section className="px-6 pt-8">
        <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-muted-foreground">
          {event.venue}
        </h2>

        <p className="mt-1 text-sm text-muted-foreground">
          Explore available sections.
        </p>

        <div className="mt-3">
          {zone && (
            <VenueMap
              event={event}
              inventory={inventory}
              selectedId={
                zone.zone.id
              }
              onSelect={() => {}}
            />
          )}
        </div>

        {zone && (
          <div className="mt-4 rounded-2xl border border-border">
            <div className="flex items-center justify-between gap-3 px-4 py-4">
              <div>
                <p className="text-base font-bold">
                  {zone.zone.name}
                </p>

                <p className="text-xs text-muted-foreground">
                  {zone.seats} tickets
                </p>
              </div>

              <p className="price text-sm font-bold text-primary">
                from{" "}
                {money(
                  zone.from,
                )}
              </p>
            </div>
          </div>
        )}
      </section>

      {quotes.length >
        0 && (
        <section className="px-6 pt-8">
          <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-muted-foreground">
            Price comparison
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Current Passr comparison
            data.
          </p>

          <ul className="mt-4 space-y-2">
            {quotes.map(
              (quote, index) => (
                <li
                  key={
                    quote.marketplace
                  }
                  className={`flex items-center justify-between rounded-xl border px-4 py-4 ${
                    index === 0
                      ? "border-primary bg-accent-soft"
                      : "border-border"
                  }`}
                >
                  <div>
                    <p className="text-base font-bold">
                      {
                        quote.marketplace
                      }
                    </p>

                    <p className="text-xs text-muted-foreground">
                      {money(
                        quote.base,
                      )}{" "}
                      +{" "}
                      {money(
                        quote.fees,
                      )}{" "}
                      fees
                    </p>
                  </div>

                  <p className="price text-2xl font-bold">
                    {money(
                      quote.total,
                    )}
                  </p>
                </li>
              ),
            )}
          </ul>

          <p className="mt-3 text-[11px] text-muted-foreground">
            Marketplace pricing will
            become live as Passr connects
            verified marketplace inventory.
          </p>
        </section>
      )}

      <section className="mx-6 mt-8 rounded-2xl border border-border p-6">
        <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-muted-foreground">
          Passr ticket protection
        </h2>

        <div className="mt-4 flex items-start gap-3">
          <ShieldCheck
            className="mt-0.5 h-5 w-5 shrink-0 text-success"
            strokeWidth={2.2}
          />

          <p className="text-sm leading-relaxed">
            <span className="font-bold">
              Passr doesn't mark up
              ticket prices.
            </span>{" "}
            <span className="text-muted-foreground">
              Ticket availability,
              pricing, fees, and seller
              terms are controlled by
              each ticket provider.
            </span>
          </p>
        </div>
      </section>

      <div className="space-y-3 px-6 pt-6">
        <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Check
            className="h-3.5 w-3.5 text-success"
            strokeWidth={3}
          />

          Passr only reads prices.
          We never mark them up.
        </p>

        <AffiliateNote />
      </div>

      <BottomNav />
    </main>
  );
}