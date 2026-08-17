import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Loader2,
  Search,
  Sparkles,
} from "lucide-react";
import { money } from "@/lib/mock-data";
import { eventsQuery } from "@/lib/events-client";
import type { EventCategory, PassrEvent } from "@/lib/types";
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

/**
 * Maps Passr's onboarding taxonomy onto the event categories
 * returned by the event providers.
 */
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

const BROWSE_CATEGORIES: {
  label: string;
  value: EventCategory;
}[] = [
  { label: "Concerts", value: "Concert" },
  { label: "Sports", value: "Sports" },
  { label: "Comedy", value: "Comedy" },
  { label: "Theater", value: "Theater" },
  { label: "Festivals", value: "Festival" },
  { label: "Family", value: "Family" },
];

function Home() {
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [profile, setProfile] = useState<PassrProfile | null>(null);
  const [category, setCategory] = useState<EventCategory | null>(null);

  useEffect(() => {
    setProfile(getProfile());
  }, []);

  // Debounce search so we don't hit the API on every keystroke.
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(q.trim());
    }, 350);

    return () => clearTimeout(timer);
  }, [q]);

  // Real Ticketmaster data through Passr's server route.
  const query = useQuery(
    eventsQuery(
      debounced
        ? {
            keyword: debounced,
            size: 30,
          }
        : {
            countryCode: "US",
            size: 30,
          },
    ),
  );

  const results = query.data ?? [];

  /**
   * Filter the live results locally when the user selects
   * a browse category.
   */
  const categoryResults = useMemo(() => {
    if (!category) return results;

    return results.filter((event) => event.category === category);
  }, [results, category]);

  /**
   * Basic Tier 1 personalization:
   * use onboarding preferences to surface relevant events.
   */
  const picks = useMemo(() => {
    if (q || category) return [];

    const categories = profile?.preferences?.categories ?? [];

    if (categories.length) {
      const wanted = new Set(
        categories
          .map((item) => CATEGORY_TO_EVENT[item])
          .filter((item): item is EventCategory => Boolean(item)),
      );

      return results
        .filter((event) => wanted.has(event.category))
        .slice(0, 6);
    }

    const liked = profile?.answers["categories"] ?? [];

    if (!liked.length) return [];

    return results
      .filter((event) =>
        liked.some((item) =>
          item.toLowerCase().startsWith(event.category.toLowerCase()),
        ),
      )
      .slice(0, 6);
  }, [profile, results, q, category]);

  const visibleResults = q || category ? categoryResults : results;

  const hasSearch = Boolean(debounced);
  const hasCategory = Boolean(category);

  const clearFilters = () => {
    setQ("");
    setDebounced("");
    setCategory(null);
  };

  return (
    <main className="mx-auto min-h-screen max-w-md bg-background pb-24">
      <Onboarding
        onDone={() => setProfile(getProfile())}
      />

      <header className="bg-brand px-6 pt-8 pb-10 text-background">
        <div className="flex items-center gap-3">
          <img
            src={logo.url}
            alt=""
            aria-hidden
            className="h-9 w-9 object-contain"
          />

          <span className="text-2xl font-bold lowercase tracking-tight">
            passr
          </span>
        </div>

        <h1 className="mt-6 font-inter text-3xl font-bold leading-tight lowercase tracking-tight">
          {profile?.name
            ? `hey ${profile.name.toLowerCase()}, `
            : ""}
          what are you trying to see?
        </h1>

        <div className="mt-5 flex items-center gap-3 rounded-full bg-background px-5 py-3.5">
          <Search
            className="h-5 w-5 shrink-0 text-muted-foreground"
            strokeWidth={2.2}
          />

          <input
            value={q}
            onChange={(event) => {
              setQ(event.target.value);
              setCategory(null);
            }}
            placeholder="Artist, team, venue, or event"
            aria-label="Search events"
            className="w-full min-w-0 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>
      </header>

      {/* Personalized events */}
      {!q && !category && picks.length > 0 && (
        <section className="px-6 pt-8">
          <div className="flex items-center gap-2">
            <Sparkles
              className="h-4 w-4 text-primary"
              strokeWidth={2.4}
            />

            <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Picked for you
            </h2>
          </div>

          <div className="mt-4 space-y-3">
            {picks.map((event) => (
              <EventCard
                key={event.id}
                event={event}
              />
            ))}
          </div>
        </section>
      )}

      {/* Browse categories */}
      {!q && (
        <section className="px-6 pt-8">
          <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-muted-foreground">
            Explore
          </h2>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {BROWSE_CATEGORIES.map((item) => {
              const selected = category === item.value;

              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() =>
                    setCategory(
                      selected ? null : item.value,
                    )
                  }
                  className={`shrink-0 rounded-full border px-4 py-2.5 text-xs font-bold transition ${
                    selected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-foreground"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Live events */}
      <section className="px-6 pt-8">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-muted-foreground">
            {hasSearch
              ? "Search results"
              : hasCategory
                ? `${getCategoryLabel(category!)} events`
                : "Upcoming events"}
          </h2>

          {(hasSearch || hasCategory) && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs font-bold text-primary"
            >
              Clear
            </button>
          )}
        </div>

        {/* API error */}
        {query.isError && (
          <div className="mt-4 rounded-xl border border-border px-4 py-4">
            <div className="flex items-start gap-3">
              <AlertTriangle
                className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                strokeWidth={2.4}
              />

              <div>
                <p className="text-sm font-bold">
                  We couldn't load events right now.
                </p>

                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Passr couldn't reach the ticket provider.
                  Check your connection and try again.
                </p>

                <button
                  type="button"
                  onClick={() => query.refetch()}
                  className="mt-3 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground"
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Loading */}
        {query.isPending && (
          <p className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2
              className="h-4 w-4 animate-spin"
              strokeWidth={2.4}
            />
            Loading events…
          </p>
        )}

        {/* Results */}
        {!query.isPending &&
          !query.isError &&
          visibleResults.length > 0 && (
            <div className="mt-4 space-y-3">
              {visibleResults.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                />
              ))}
            </div>
          )}

        {/* Empty state */}
        {!query.isPending &&
          !query.isError &&
          visibleResults.length === 0 && (
            <div className="py-10 text-center">
              <p className="text-sm font-bold">
                {hasSearch
                  ? `No events match “${debounced}”.`
                  : hasCategory
                    ? `No ${getCategoryLabel(category!)} events found.`
                    : "No events to show right now."}
              </p>

              {(hasSearch || hasCategory) && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-3 text-xs font-bold text-primary"
                >
                  Browse all events
                </button>
              )}
            </div>
          )}
      </section>

      <AffiliateNote className="px-6 pb-2 pt-8" />

      <BottomNav />
    </main>
  );
}

function getCategoryLabel(category: EventCategory) {
  return (
    BROWSE_CATEGORIES.find(
      (item) => item.value === category,
    )?.label ?? category
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

          <h3 className="mt-1 truncate text-lg font-bold leading-tight">
            {event.name}
          </h3>

          <p className="mt-1 truncate text-sm text-muted-foreground">
            {event.date} · {event.venue}
          </p>
        </div>

        <div className="shrink-0 text-right">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {event.startingAt === undefined
              ? "price"
              : "from"}
          </p>

          <p className="price text-2xl font-bold">
            {event.startingAt === undefined
              ? "—"
              : money(event.startingAt)}
          </p>
        </div>
      </div>
    </Link>
  );
}
