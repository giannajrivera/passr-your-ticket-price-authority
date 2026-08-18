import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { money } from "@/lib/mock-data";
import { buildHomeRails, fetchDiscoveryPool, getPreferredCategories } from "@/lib/discovery";
import type { PassrEvent } from "@/lib/types";
import { BottomNav } from "@/components/BottomNav";
import { AffiliateNote } from "@/components/AffiliateNote";
import { Onboarding } from "@/components/Onboarding";
import { getProfile, type PassrProfile } from "@/lib/profile";

import logo from "@/assets/passr-logo.png.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Passr — Real ticket prices, fees included" },
      {
        name: "description",
        content:
          "Discover events and compare real ticket prices with Passr.",
      },
      {
        property: "og:title",
        content: "Passr — Real ticket prices, fees included",
      },
      {
        property: "og:description",
        content:
          "Find concerts, sports, comedy, theater and more with Passr.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [profile, setProfile] = useState<PassrProfile | null>(null);

  useEffect(() => {
    setProfile(getProfile());
  }, []);

  const handleSearchClick = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (q.trim()) {
      navigate({ to: "/search", search: { q: q.trim() } });
    } else {
      navigate({ to: "/search" });
    }
  };

  const query = useQuery({
    queryKey: [
      "discovery",
      { countryCode: "US" },
      profile ? { profile: profile.preferences ?? profile.answers } : { profile: null },
    ],
    queryFn: () => fetchDiscoveryPool(profile),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });

  const results = query.data ?? [];
  const rails = useMemo(() => buildHomeRails(results, profile), [profile, results]);
  const hasPreferences = getPreferredCategories(profile).size > 0;
  const hasSearch = q.trim().length > 0;

  const visibleResults = useMemo(() => {
    if (!hasSearch) return [] as PassrEvent[];

    const term = q.trim().toLowerCase();
    return results.filter((event) => {
      const haystack = [
        event.name,
        event.category,
        event.genre,
        event.subGenre,
        event.venue,
        event.city,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(term);
    });
  }, [hasSearch, q, results]);

  const clearFilters = () => setQ("");

  return (
    <main className="mx-auto min-h-screen max-w-7xl bg-background pb-28 text-foreground">
      <Onboarding onDone={() => setProfile(getProfile())} />

      <div className="mx-auto max-w-6xl px-4 pb-2 pt-5 sm:px-6 lg:px-8">
        <header className="pt-2">
          <div className="flex items-center gap-3">
            <img
              src={logo.url}
              alt=""
              aria-hidden
              className="h-10 w-10 object-contain"
            />

            <span className="font-sans text-3xl font-bold lowercase tracking-tight text-foreground">
              passr
            </span>
          </div>

          <form onSubmit={handleSearchClick} className="relative mt-6">
            <Search
              className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
              strokeWidth={2.1}
            />

            <input
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="Search events, artists, venues..."
              aria-label="Search events"
              className="w-full rounded-full border border-border bg-muted px-12 py-4 font-inter text-base text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary"
            />
          </form>
        </header>

        {query.isPending && (
          <div className="mt-10 flex items-center justify-center gap-2 rounded-2xl border border-border bg-muted/50 px-6 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.2} />
            Loading live events...
          </div>
        )}

        {query.isError && (
          <div className="mt-10 rounded-3xl border border-border bg-muted/50 px-6 py-8 text-center">
            <p className="font-sans text-2xl font-bold tracking-tight text-foreground">
              Live events are temporarily unavailable.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              We couldn't reach the live event provider right now. Please try again in a moment.
            </p>
            <button
              type="button"
              onClick={() => query.refetch()}
              className="mt-5 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
            >
              Try again
            </button>
          </div>
        )}

        {!query.isPending && !query.isError && (
          <>
            {hasSearch && (
              <section className="mt-8">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className="font-sans text-2xl font-bold tracking-tight text-foreground">
                    Search results
                  </h2>
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground"
                  >
                    Clear
                  </button>
                </div>
                {visibleResults.length > 0 ? (
                  <EventRail events={visibleResults.slice(0, 12)} />
                ) : (
                  <div className="rounded-2xl border border-dashed border-border bg-muted/40 px-6 py-8 text-center text-sm text-muted-foreground">
                    No events match “{q.trim()}”.
                  </div>
                )}
              </section>
            )}

            {!hasSearch && rails.trending.length > 0 && (
              <EventRail title="Trending near you" events={rails.trending} />
            )}

            {!hasSearch && rails.suggested.length > 0 && (
              <EventRail title="Suggested for you" events={rails.suggested} />
            )}

            {!hasSearch &&
              rails.categories.map((rail) => (
                <EventRail key={rail.id} title={rail.title} events={rail.events} />
              ))}

            {!hasSearch && !hasPreferences && results.length > 0 && rails.categories.length === 0 && (
              <EventRail title="More events" events={results.slice(0, 8)} />
            )}

            {!hasSearch && results.length === 0 && (
              <div className="mt-8 rounded-3xl border border-border bg-muted/50 px-6 py-8 text-center">
                <p className="font-sans text-2xl font-bold tracking-tight text-foreground">
                  No live events right now.
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Live events are temporarily unavailable in this market.
                </p>
              </div>
            )}
          </>
        )}
      </div>

      <AffiliateNote className="px-4 pb-2 pt-8 sm:px-6" />
      <BottomNav />
    </main>
  );
}

function EventRail({
  title,
  events,
}: {
  title?: string;
  events: PassrEvent[];
}) {
  if (!events.length) return null;

  return (
    <section className="mt-8">
      {title && (
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-sans text-2xl font-bold tracking-tight text-foreground">
            {title}
          </h2>
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Scroll
          </span>
        </div>
      )}

      <div className="-mx-1 flex gap-4 overflow-x-auto pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {events.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>
    </section>
  );
}

function EventCard({ event }: { event: PassrEvent }) {
  return (
    <Link
      to="/event/$eventId"
      params={{ eventId: event.id }}
      className="group block w-[240px] shrink-0 overflow-hidden rounded-[1.5rem] border border-border bg-card shadow-[0_1px_0_rgba(0,0,0,0.02)] transition hover:-translate-y-0.5 hover:border-primary/30"
    >
      <div className="relative overflow-hidden">
        {event.image ? (
          <img
            src={event.image}
            alt={event.name}
            loading="lazy"
            width={1024}
            height={640}
            className="h-40 w-full object-cover transition duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="h-40 w-full bg-accent-soft" />
        )}
      </div>

      <div className="space-y-3 p-4">
        <div className="flex items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          <span>{event.category}</span>
          <span>{event.city}</span>
        </div>

        <div>
          <h3 className="line-clamp-2 font-sans text-xl font-bold leading-tight text-foreground">
            {event.name}
          </h3>
        </div>

        <div className="space-y-1 text-sm text-muted-foreground">
          <p>{event.date}</p>
          <p>{event.venue}</p>
        </div>

        <div className="flex items-center justify-between border-t border-border pt-3">
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Starting at
          </span>
          <span className="price text-lg font-bold text-foreground">
            {event.startingAt === undefined ? "—" : `from ${money(event.startingAt)}`}
          </span>
        </div>
      </div>
    </Link>
  );
}
