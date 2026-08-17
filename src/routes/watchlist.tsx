import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowDownRight, ArrowUpRight, BellOff } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { AffiliateNote } from "@/components/AffiliateNote";
import { toggleNotify, useWatchlist } from "@/lib/watchlist";
import { money } from "@/lib/mock-data";

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

  return (
    <main className="mx-auto min-h-screen max-w-md bg-background pb-24">
      <header className="bg-foreground px-6 pt-10 pb-8 text-background">
        <h1 className="text-3xl font-bold lowercase tracking-tight">
          watchlist
        </h1>

        <p className="mt-2 text-sm text-background/70">
          Keep track of events you want to watch.
        </p>
      </header>

      {items.length === 0 ? (
        <section className="px-6 pt-10">
          <div className="rounded-2xl border border-border px-6 py-12 text-center">
            <BellOff
              className="mx-auto h-7 w-7 text-muted-foreground"
              strokeWidth={2}
            />

            <h2 className="mt-4 text-lg font-bold">
              Your watchlist is empty
            </h2>

            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Tap the bell on an event to save it here and keep an eye on its
              price.
            </p>

            <Link
              to="/"
              className="mt-6 inline-flex rounded-full bg-primary px-5 py-3 text-sm font-bold text-primary-foreground"
            >
              Find events
            </Link>
          </div>
        </section>
      ) : (
        <div className="space-y-3 px-6 pt-6">
          {items.map((item) => {
            const event = item.event;

            const diff = item.currentPrice - item.savedPrice;
            const down = diff < 0;

            const pct =
              item.savedPrice > 0
                ? Math.abs(
                    Math.round((diff / item.savedPrice) * 100),
                  )
                : 0;

            return (
              <article
                key={item.eventId}
                className="overflow-hidden rounded-2xl border border-border"
              >
                {event.image && (
                  <Link
                    to="/event/$eventId"
                    params={{ eventId: event.id }}
                    className="block"
                  >
                    <img
                      src={event.image}
                      alt={event.name}
                      width={1024}
                      height={640}
                      loading="lazy"
                      className="h-28 w-full object-cover"
                    />
                  </Link>
                )}

                <div className="p-5">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
                    <Link
                      to="/event/$eventId"
                      params={{ eventId: event.id }}
                      className="min-w-0"
                    >
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
                        <p className="mt-0.5 truncate text-sm text-muted-foreground">
                          {event.city}
                          {event.state ? `, ${event.state}` : ""}
                        </p>
                      )}
                    </Link>

                    <div className="shrink-0 text-right">
                      <p className="price text-2xl font-bold">
                        {money(item.currentPrice)}
                      </p>

                      {diff !== 0 && (
                        <span
                          className={`mt-1 inline-flex items-center gap-1 text-xs font-bold ${
                            down ? "text-success" : "text-primary"
                          }`}
                        >
                          {down ? (
                            <ArrowDownRight
                              className="h-3.5 w-3.5"
                              strokeWidth={3}
                            />
                          ) : (
                            <ArrowUpRight
                              className="h-3.5 w-3.5"
                              strokeWidth={3}
                            />
                          )}

                          {pct}% since saved
                        </span>
                      )}

                      {diff === 0 && (
                        <span className="mt-1 block text-xs font-semibold text-muted-foreground">
                          price unchanged
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                    <div>
                      <p className="text-sm font-semibold">
                        Price drop alerts
                      </p>

                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Saved at {money(item.savedPrice)}
                      </p>
                    </div>

                    <button
                      role="switch"
                      aria-checked={item.notify}
                      aria-label={
                        item.notify
                          ? "Turn off price drop alerts"
                          : "Turn on price drop alerts"
                      }
                      onClick={() => toggleNotify(item.eventId)}
                      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
                        item.notify ? "bg-primary" : "bg-muted"
                      }`}
                    >
                      <span
                        className={`absolute top-1 h-5 w-5 rounded-full bg-background transition-all ${
                          item.notify ? "left-6" : "left-1"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <AffiliateNote className="px-6 pb-2 pt-8" />

      <BottomNav />
    </main>
  );
}
