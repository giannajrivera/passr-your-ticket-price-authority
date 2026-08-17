import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowDownRight, ArrowUpRight, Bell, Loader2 } from "lucide-react";
import { getEvent, money } from "@/lib/mock-data";
import {
  eventsQuery,
  isTicketmasterId,
  toTicketmasterEventId,
} from "@/lib/events-client";
import { BottomNav } from "@/components/BottomNav";
import { AffiliateNote } from "@/components/AffiliateNote";
import { toggleNotify, useWatchlist } from "@/lib/watchlist";
import type { PassrEvent } from "@/lib/types";

export const Route = createFileRoute("/watchlist")({
  head: () => ({
    meta: [
      { title: "Watchlist — Passr price alerts" },
      {
        name: "description",
        content:
          "Track saved events, see how the cheapest price has moved, and get alerted on drops.",
      },
      {
        property: "og:title",
        content: "Watchlist — Passr price alerts",
      },
      {
        property: "og:description",
        content:
          "Track saved events and get alerted when resale prices drop.",
      },
    ],
  }),
  component: Watchlist,
});

function Watchlist() {
  const items = useWatchlist();

  /*
   * Resolve saved live Ticketmaster events.
   *
   * Mock events still come directly from mock-data.
   * Ticketmaster events are fetched through Passr's existing server route.
   */
  const liveIds = items
    .map((item) => item.eventId)
    .filter(isTicketmasterId);

  const liveQueries = liveIds.map((id) =>
    useQuery({
      ...eventsQuery({
        id: toTicketmasterEventId(id),
        size: 1,
      }),
      enabled: true,
    }),
  );

  const liveEvents = new Map<string, PassrEvent>();

  liveQueries.forEach((query, index) => {
    const event = query.data?.[0];

    if (event) {
      liveEvents.set(liveIds[index], event);
    }
  });

  const loadingLiveEvents = liveQueries.some(
    (query) => query.isPending,
  );

  return (
    <main className="mx-auto min-h-screen max-w-md bg-background pb-24">
      <header className="bg-foreground px-6 pt-10 pb-8 text-background">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5" strokeWidth={2.2} />
          <h1 className="text-3xl font-bold lowercase tracking-tight">
            watchlist
          </h1>
        </div>

        <p className="mt-2 text-sm text-background/70">
          Prices below are out-the-door, fees included.
        </p>
      </header>

      <div className="space-y-3 px-6 pt-6">
        {items.length === 0 && (
          <div className="py-16 text-center">
            <Bell className="mx-auto h-7 w-7 text-muted-foreground" />

            <p className="mt-4 text-sm font-semibold">
              Nothing saved yet.
            </p>

            <p className="mt-1 text-sm text-muted-foreground">
              Tap the bell on any event to track it.
            </p>
          </div>
        )}

        {items.map((item) => {
          /*
           * First try the mock event system.
           */
          const mockEvent = getEvent(item.eventId);

          /*
           * If it isn't a mock event, check the live Ticketmaster events
           * we fetched above.
           */
          const event =
            mockEvent ??
            liveEvents.get(item.eventId);

          /*
           * Live event is still loading.
           */
          if (!event && isTicketmasterId(item.eventId) && loadingLiveEvents) {
            return (
              <article
                key={item.eventId}
                className="rounded-2xl border border-border p-5"
              >
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Loader2
                    className="h-4 w-4 animate-spin"
                    strokeWidth={2.4}
                  />
                  Loading saved event…
                </div>
              </article>
            );
          }

          /*
           * The provider no longer has this event.
           * Don't silently make the whole Watchlist disappear.
           */
          if (!event) {
            return (
              <article
                key={item.eventId}
                className="rounded-2xl border border-border p-5"
              >
                <p className="text-sm font-bold">
                  Saved event unavailable
                </p>

                <p className="mt-1 text-xs text-muted-foreground">
                  This event is no longer available from the ticket provider.
                </p>
              </article>
            );
          }

          const diff = item.currentPrice - item.savedPrice;

          const down = diff < 0;

          const pct =
            item.savedPrice > 0
              ? Math.abs(
                  Math.round(
                    (diff / item.savedPrice) * 100,
                  ),
                )
              : 0;

          return (
            <article
              key={item.eventId}
              className="overflow-hidden rounded-2xl border border-border"
            >
              <Link
                to="/event/$eventId"
                params={{ eventId: event.id }}
                className="block"
              >
                {event.image ? (
                  <img
                    src={event.image}
                    alt={event.name}
                    loading="lazy"
                    width={1024}
                    height={640}
                    className="h-28 w-full object-cover"
                  />
                ) : (
                  <div className="h-28 w-full bg-accent-soft" />
                )}

                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 p-5">
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary">
                      {event.category}
                    </p>

                    <h2 className="mt-1 truncate text-lg font-bold leading-tight">
                      {event.name}
                    </h2>

                    <p className="mt-1 truncate text-sm text-muted-foreground">
                      {event.date} · {event.venue}
                    </p>

                    {event.city && (
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {event.city}
                        {event.state ? `, ${event.state}` : ""}
                      </p>
                    )}
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      saved
                    </p>

                    <p className="price text-2xl font-bold">
                      {money(item.savedPrice)}
                    </p>
                  </div>
                </div>
              </Link>

              <div className="border-t border-border px-5 py-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Price movement
                    </p>

                    <span
                      className={`mt-1 inline-flex items-center gap-1 text-sm font-bold ${
                        down
                          ? "text-success"
                          : diff > 0
                            ? "text-primary"
                            : "text-muted-foreground"
                      }`}
                    >
                      {diff === 0 ? (
                        "No change"
                      ) : down ? (
                        <>
                          <ArrowDownRight
                            className="h-4 w-4"
                            strokeWidth={3}
                          />
                          {pct}% lower
                        </>
                      ) : (
                        <>
                          <ArrowUpRight
                            className="h-4 w-4"
                            strokeWidth={3}
                          />
                          {pct}% higher
                        </>
                      )}
                    </span>
                  </div>

                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">
                      current
                    </p>

                    <p className="price text-lg font-bold">
                      {money(item.currentPrice)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-border px-5 py-4">
                <span className="text-sm font-semibold">
                  Notify me if price drops
                </span>

                <button
                  role="switch"
                  aria-checked={item.notify}
                  aria-label={`Notify me if ${event.name} price drops`}
                  onClick={() => toggleNotify(item.eventId)}
                  className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
                    item.notify
                      ? "bg-primary"
                      : "bg-muted"
                  }`}
                >
                  <span
                    className={`absolute top-1 h-5 w-5 rounded-full bg-background transition-all ${
                      item.notify
                        ? "left-6"
                        : "left-1"
                    }`}
                  />
                </button>
              </div>
            </article>
          );
        })}
      </div>

      <AffiliateNote className="px-6 pb-2 pt-8" />

      <BottomNav />
    </main>
  );
}
