import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { getEvent, money } from "@/lib/mock-data";
import { BottomNav } from "@/components/BottomNav";
import { AffiliateNote } from "@/components/AffiliateNote";
import { toggleNotify, useWatchlist } from "@/lib/watchlist";

export const Route = createFileRoute("/watchlist")({
  head: () => ({
    meta: [
      { title: "Watchlist — Passr price alerts" },
      {
        name: "description",
        content: "Track saved events, see how the cheapest price has moved, and get alerted on drops.",
      },
      { property: "og:title", content: "Watchlist — Passr price alerts" },
      {
        property: "og:description",
        content: "Track saved events and get alerted when resale prices drop.",
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
        <h1 className="text-3xl font-bold lowercase tracking-tight">watchlist</h1>
        <p className="mt-2 text-sm text-background/70">
          Prices below are out-the-door, fees included.
        </p>
      </header>

      <div className="space-y-3 px-6 pt-6">
        {items.length === 0 && (
          <p className="py-16 text-center text-sm text-muted-foreground">
            Nothing saved yet. Tap the bell on any event to track it.
          </p>
        )}

        {items.map((item) => {
          const event = getEvent(item.eventId);
          if (!event) return null;
          const diff = item.currentPrice - item.savedPrice;
          const down = diff < 0;
          const pct = Math.abs(Math.round((diff / item.savedPrice) * 100));

          return (
            <article key={item.eventId} className="rounded-2xl border border-border p-5">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
                <Link to="/event/$eventId" params={{ eventId: event.id }} className="min-w-0">
                  <h2 className="truncate text-lg font-bold leading-tight">{event.name}</h2>
                  <p className="mt-1 truncate text-sm text-muted-foreground">
                    {event.date} · {event.venue}
                  </p>
                </Link>
                <div className="shrink-0 text-right">
                  <p className="price text-2xl font-bold">{money(item.currentPrice)}</p>
                  <span
                    className={`mt-1 inline-flex items-center gap-1 text-xs font-bold ${
                      down ? "text-success" : "text-primary"
                    }`}
                  >
                    {down ? (
                      <ArrowDownRight className="h-3.5 w-3.5" strokeWidth={3} />
                    ) : (
                      <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={3} />
                    )}
                    {pct}% since saved
                  </span>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                <span className="text-sm font-semibold">Notify me if price drops</span>
                <button
                  role="switch"
                  aria-checked={item.notify}
                  aria-label="Notify me if price drops"
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
            </article>
          );
        })}
      </div>

      <AffiliateNote className="px-6 pb-2 pt-8" />

      <BottomNav />
    </main>
  );
}
