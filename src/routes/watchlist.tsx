import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bell,
  BellOff,
  CalendarDays,
  ChevronLeft,
  MapPin,
  Trash2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import { BottomNav } from "@/components/BottomNav";
import { money } from "@/lib/mock-data";
import {
  toggleNotify,
  toggleSaved,
  useWatchlist,
  type WatchItem,
} from "@/lib/watchlist";

export const Route = createFileRoute("/watchlist")({
  component: Watchlist,
});

function Watchlist() {
  const items = useWatchlist();

  return (
    <main className="min-h-screen bg-background pb-28 text-foreground">
      <div className="mx-auto max-w-3xl px-4 pb-10 pt-6 sm:px-6">
        <header className="mb-8">
          <Link
            to="/"
            className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </Link>

          <div className="flex items-end justify-between gap-4">
            <div>
              <h1 className="font-sans text-4xl font-bold tracking-tight">
                Watchlist
              </h1>

              <p className="mt-2 text-sm text-muted-foreground">
                Keep an eye on events and get notified when prices move.
              </p>
            </div>

            {items.length > 0 && (
              <span className="shrink-0 rounded-full bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground">
                {items.length}{" "}
                {items.length === 1 ? "event" : "events"}
              </span>
            )}
          </div>
        </header>

        {items.length === 0 ? (
          <EmptyWatchlist />
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <WatchlistCard key={item.eventId} item={item} />
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </main>
  );
}

function EmptyWatchlist() {
  return (
    <section className="rounded-3xl border border-dashed border-border bg-muted/30 px-6 py-12 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
        <Bell className="h-6 w-6 text-primary" />
      </div>

      <h2 className="mt-5 font-sans text-2xl font-bold tracking-tight">
        Your watchlist is empty
      </h2>

      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
        Save events you're interested in and Passr will keep them here so
        you can watch prices and stay on top of ticket changes.
      </p>

      <Link
        to="/"
        className="mt-6 inline-flex rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
      >
        Discover events
      </Link>
    </section>
  );
}

function WatchlistCard({ item }: { item: WatchItem }) {
  const { event } = item;

  const priceDifference = item.currentPrice - item.savedPrice;
  const hasPriceChange = priceDifference !== 0;
  const priceDropped = priceDifference < 0;
  const priceIncreased = priceDifference > 0;

  const savedPriceLabel = money(item.savedPrice);
  const currentPriceLabel = money(item.currentPrice);

  function handleRemove() {
    toggleSaved(
      {
        id: event.id,
        name: event.name,
        date: event.date,
        venue: event.venue,
        city: event.city,
        state: event.state,
        category: event.category,
        subtitle: event.subtitle,
        image: event.image,
        ticketUrl: event.ticketUrl,
      },
      item.currentPrice,
    );
  }

  return (
    <article className="overflow-hidden rounded-3xl border border-border bg-card">
      <Link
        to="/event/$eventId"
        params={{ eventId: event.id }}
        className="group block"
      >
        <div className="flex gap-4 p-4 sm:p-5">
          <div className="h-28 w-28 shrink-0 overflow-hidden rounded-2xl bg-accent-soft sm:h-32 sm:w-32">
            {event.image ? (
              <img
                src={event.image}
                alt={event.name}
                loading="lazy"
                className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="h-full w-full bg-accent-soft" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {event.category}
                </p>

                <h2 className="mt-1 line-clamp-2 font-sans text-xl font-bold leading-tight transition group-hover:text-primary">
                  {event.name}
                </h2>
              </div>
            </div>

            <div className="mt-3 space-y-1 text-xs text-muted-foreground">
              <p className="flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{event.date}</span>
              </p>

              <p className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">
                  {[event.venue, event.city, event.state]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </p>
            </div>
          </div>
        </div>
      </Link>

      <div className="border-t border-border bg-muted/20 px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Current price
            </p>

            <div className="mt-1 flex items-baseline gap-2">
              <span className="price text-2xl font-bold text-foreground">
                {currentPriceLabel}
              </span>

              {hasPriceChange && (
                <span
                  className={`inline-flex items-center gap-1 text-xs font-bold ${
                    priceDropped
                      ? "text-primary"
                      : "text-destructive"
                  }`}
                >
                  {priceDropped ? (
                    <TrendingDown className="h-3.5 w-3.5" />
                  ) : (
                    <TrendingUp className="h-3.5 w-3.5" />
                  )}

                  {money(Math.abs(priceDifference))}
                </span>
              )}
            </div>

            <p className="mt-1 text-xs text-muted-foreground">
              Saved at {savedPriceLabel}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => toggleNotify(item.eventId)}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition ${
                item.notify
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "border-border bg-background text-muted-foreground hover:text-foreground"
              }`}
              aria-label={
                item.notify
                  ? "Turn off price notifications"
                  : "Turn on price notifications"
              }
            >
              {item.notify ? (
                <Bell className="h-3.5 w-3.5" />
              ) : (
                <BellOff className="h-3.5 w-3.5" />
              )}

              {item.notify ? "Alerts on" : "Alerts off"}
            </button>

            <button
              type="button"
              onClick={handleRemove}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition hover:border-destructive/30 hover:text-destructive"
              aria-label={`Remove ${event.name} from watchlist`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {priceDropped && (
          <div className="mt-4 flex items-center gap-2 rounded-2xl border border-primary/20 bg-primary/5 px-3 py-2.5 text-xs font-semibold text-primary">
            <TrendingDown className="h-4 w-4 shrink-0" />
            <span>
              This ticket is {money(Math.abs(priceDifference))} cheaper
              than when you saved it.
            </span>
          </div>
        )}

        {priceIncreased && (
          <div className="mt-4 flex items-center gap-2 rounded-2xl border border-border bg-background px-3 py-2.5 text-xs font-semibold text-muted-foreground">
            <TrendingUp className="h-4 w-4 shrink-0" />
            <span>
              Price is {money(Math.abs(priceDifference))} higher than when
              you saved it.
            </span>
          </div>
        )}
      </div>
    </article>
  );
}
