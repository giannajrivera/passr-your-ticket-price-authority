import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, TrendingUp } from "lucide-react";
import { events, money } from "@/lib/mock-data";
import { BottomNav } from "@/components/BottomNav";
import { Onboarding } from "@/components/Onboarding";
import logo from "@/assets/passr-logo.png.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Passr — Real ticket prices, fees included" },
      {
        name: "description",
        content:
          "Compare out-the-door resale ticket prices across StubHub, SeatGeek, Vivid Seats and Ticketmaster, with 30-day market averages.",
      },
      { property: "og:title", content: "Passr — Real ticket prices, fees included" },
      {
        property: "og:description",
        content: "Find the true lowest price for concert, sports and theater tickets before you buy.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const [q, setQ] = useState("");

  const results = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return events;
    return events.filter((e) =>
      [e.name, e.venue, e.city, e.category, e.subtitle].join(" ").toLowerCase().includes(t),
    );
  }, [q]);

  const trending = results.filter((e) => e.trending);
  const rest = results.filter((e) => !e.trending);

  return (
    <main className="mx-auto min-h-screen max-w-md bg-background pb-24">
      <Onboarding />

      <header className="bg-foreground px-6 pt-8 pb-10 text-background">
        <div className="flex items-center gap-3">
          <img src={logo.url} alt="" aria-hidden className="h-9 w-9 object-contain" />
          <span className="text-2xl font-bold lowercase tracking-tight">passr</span>
        </div>
        <h1 className="mt-6 text-3xl leading-tight font-bold lowercase tracking-tight">
          what are you trying to see?
        </h1>
        <div className="mt-5 flex items-center gap-3 rounded-full bg-background px-5 py-3.5">
          <Search className="h-5 w-5 shrink-0 text-muted-foreground" strokeWidth={2.2} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Artist, team, or event"
            aria-label="Search events"
            className="w-full min-w-0 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>
      </header>

      <section className="px-6 pt-8">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" strokeWidth={2.4} />
          <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-muted-foreground">
            {q ? "Results" : "Trending now"}
          </h2>
        </div>

        <div className="mt-4 space-y-3">
          {(q ? results : trending).map((e) => (
            <EventCard key={e.id} event={e} />
          ))}
          {results.length === 0 && (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No events match “{q}”.
            </p>
          )}
        </div>
      </section>

      {!q && rest.length > 0 && (
        <section className="px-6 pt-8">
          <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-muted-foreground">
            Recently viewed
          </h2>
          <div className="mt-4 space-y-3">
            {rest.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        </section>
      )}

      <BottomNav />
    </main>
  );
}

function EventCard({ event }: { event: (typeof events)[number] }) {
  return (
    <Link
      to="/event/$eventId"
      params={{ eventId: event.id }}
      className="block overflow-hidden rounded-2xl border border-border"
    >
      <img
        src={event.image}
        alt={event.name}
        loading="lazy"
        width={1024}
        height={640}
        className="h-28 w-full object-cover"
      />
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4 p-4">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary">
            {event.category}
          </p>
          <h3 className="mt-1 truncate text-lg font-bold leading-tight">{event.name}</h3>
          <p className="mt-1 truncate text-sm text-muted-foreground">
            {event.date} · {event.venue}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            from
          </p>
          <p className="price text-2xl font-bold">{money(event.startingAt)}</p>
        </div>
      </div>
    </Link>
  );
}
