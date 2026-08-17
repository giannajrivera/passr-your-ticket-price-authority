import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Loader2, Search, Sparkles, TrendingUp } from "lucide-react";
import { events as mockEvents, money } from "@/lib/mock-data";
import { eventsQuery } from "@/lib/events-client";
import type { PassrEvent } from "@/lib/types";
import { BottomNav } from "@/components/BottomNav";
import { AffiliateNote } from "@/components/AffiliateNote";
import { Onboarding } from "@/components/Onboarding";
import { getProfile, type PassrProfile } from "@/lib/profile";
import type { EventCategory } from "@/lib/types";

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

/** Maps Passr's internal taxonomy categories onto event categories. */
const CATEGORY_TO_EVENT: Record<string, EventCategory | undefined> = {
  music: "Concert",
  sports: "Sports",
  comedy: "Comedy",
  theater: "Theater",
  dance: "Theater",
  festivals: "Festival",
  family: "Family",
  nightlife: "Nightlife",
};

function Home() {

  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [profile, setProfile] = useState<PassrProfile | null>(null);

  useEffect(() => setProfile(getProfile()), []);

  // Debounce keystrokes so we don't hit the Ticketmaster route per character.
  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 350);
    return () => clearTimeout(t);
  }, [q]);

  // Live Ticketmaster data via Passr's own server route. Browsing (no
  // keyword) and searching use the same endpoint and the same PassrEvent
  // shape — only the params differ.
  const query = useQuery(
    eventsQuery(debounced ? { keyword: debounced, size: 30 } : { countryCode: "US", size: 30 }),
  );

  const live = query.data;
  // A failed request falls back to mock data (dev fallback). A successful
  // request that legitimately returned nothing does NOT — that's a real
  // zero-result search and should read as such.
  const failed = query.isError;
  const usingMock = failed;

  const results: PassrEvent[] = useMemo(() => {
    if (live) return live;
    if (!failed) return [];
    const t = debounced.toLowerCase();
    if (!t) return mockEvents;
    return mockEvents.filter((e) =>
      [e.name, e.venue, e.city, e.category, e.subtitle].join(" ").toLowerCase().includes(t),
    );
  }, [live, failed, debounced]);

  const picks = useMemo(() => {
    // Prefer the structured preference model; fall back to legacy answers.
    const cats = profile?.preferences?.categories ?? [];
    if (cats.length) {
      const wanted = new Set(cats.map((c) => CATEGORY_TO_EVENT[c]).filter(Boolean));
      return results.filter((e) => wanted.has(e.category)).slice(0, 6);
    }
    const liked = profile?.answers["categories"] ?? [];
    if (!liked.length) return [];
    return results
      .filter((e) => liked.some((c) => c.toLowerCase().startsWith(e.category.toLowerCase())))
      .slice(0, 6);
  }, [profile, results]);

  const flagged = results.filter((e) => e.trending);
  // Real provider data has no "trending" flag, so the top slice stands in.
  const trending = flagged.length ? flagged : results.slice(0, 8);
  const rest = flagged.length ? results.filter((e) => !e.trending) : results.slice(8);

  return (
    <main className="mx-auto min-h-screen max-w-md bg-background pb-24">
      <Onboarding onDone={() => setProfile(getProfile())} />

      <header className="bg-brand px-6 pt-8 pb-10 text-background">
        <div className="flex items-center gap-3">
          <img src={logo.url} alt="" aria-hidden className="h-9 w-9 object-contain" />
          <span className="text-2xl font-bold lowercase tracking-tight">passr</span>
        </div>
        <h1 className="mt-6 font-inter text-3xl leading-tight font-bold lowercase tracking-tight">
          {profile?.name ? `hey ${profile.name.toLowerCase()}, ` : ""}what are you trying to see?
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

      {!q && picks.length > 0 && (
        <section className="px-6 pt-8">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" strokeWidth={2.4} />
            <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Picked for you
            </h2>
          </div>
          <div className="mt-4 space-y-3">
            {picks.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        </section>
      )}


      <section className="px-6 pt-8">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" strokeWidth={2.4} />
          <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-muted-foreground">
            {q ? "Results" : "Trending now"}
          </h2>
        </div>

        {usingMock && (
          <p className="mt-3 flex items-start gap-2 rounded-xl border border-border px-3.5 py-3 text-xs text-muted-foreground">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" strokeWidth={2.4} />
            Live ticket data is unavailable right now, so you’re seeing Passr’s sample events.
          </p>
        )}

        <div className="mt-4 space-y-3">
          {query.isPending && (
            <p className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.4} />
              Loading events…
            </p>
          )}
          {!query.isPending &&
            (q ? results : trending).map((e) => <EventCard key={e.id} event={e} />)}
          {!query.isPending && results.length === 0 && (
            <p className="py-10 text-center text-sm text-muted-foreground">
              {debounced ? `No events match “${debounced}”.` : "No events to show right now."}
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

      <AffiliateNote className="px-6 pb-2 pt-8" />

      <BottomNav />
    </main>
  );
}

function EventCard({ event }: { event: PassrEvent }) {
  return (
    <Link
      to="/event/$eventId"
      params={{ eventId: event.id }}
      className="block overflow-hidden rounded-2xl border border-border"
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
            {event.startingAt === undefined ? "price" : "from"}
          </p>
          <p className="price text-2xl font-bold">
            {event.startingAt === undefined ? "—" : money(event.startingAt)}
          </p>
        </div>
      </div>
    </Link>
  );
}
