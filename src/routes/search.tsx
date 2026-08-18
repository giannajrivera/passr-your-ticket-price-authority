import {
  createFileRoute,
  Link,
  useSearch,
} from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  ChevronLeft,
  Loader2,
  Search,
  MapPin,
  X,
} from "lucide-react";

import { money } from "@/lib/mock-data";
import {
  searchEvents,
} from "@/lib/discovery-enhanced";
import type { PassrEvent } from "@/lib/types";
import { getProfile } from "@/lib/profile";
import {
  getProfileLocation,
} from "@/lib/discovery";
import {
  EXPANDED_TAXONOMY,
} from "@/lib/taxonomy-expanded";

import logo from "@/assets/passr-logo.png.asset.json";

type TaxonomyCategory = {
  key?: unknown;
  id?: unknown;
  label?: unknown;
  name?: unknown;
  subcategories?: unknown;
};

type CategoryOption = {
  key: string;
  label: string;
};

type SubcategoryOption = {
  key: string;
  label: string;
};

function getCategories(): CategoryOption[] {
  const taxonomy =
    EXPANDED_TAXONOMY as unknown;

  if (Array.isArray(taxonomy)) {
    return taxonomy
      .map(
        (
          item: unknown,
        ): CategoryOption | null => {
          if (
            typeof item !== "object" ||
            item === null
          ) {
            return null;
          }

          const data =
            item as TaxonomyCategory;

          const key =
            typeof data.key === "string"
              ? data.key
              : typeof data.id === "string"
                ? data.id
                : undefined;

          const label =
            typeof data.label === "string"
              ? data.label
              : typeof data.name === "string"
                ? data.name
                : undefined;

          if (!key || !label) {
            return null;
          }

          return {
            key,
            label,
          };
        },
      )
      .filter(
        (
          item,
        ): item is CategoryOption =>
          item !== null,
      );
  }

  if (
    typeof taxonomy !== "object" ||
    taxonomy === null
  ) {
    return [];
  }

  return Object.entries(
    taxonomy as Record<
      string,
      unknown
    >,
  ).map(([key, value]) => {
    const data =
      value as TaxonomyCategory;

    return {
      key,
      label:
        typeof data?.label ===
        "string"
          ? data.label
          : typeof data?.name ===
              "string"
            ? data.name
            : key,
    };
  });
}

function getCategoryData(
  categoryKey: string,
): TaxonomyCategory | undefined {
  const taxonomy =
    EXPANDED_TAXONOMY as unknown;

  if (Array.isArray(taxonomy)) {
    const match =
      taxonomy.find(
        (item: unknown) => {
          if (
            typeof item !==
              "object" ||
            item === null
          ) {
            return false;
          }

          const data =
            item as TaxonomyCategory;

          return (
            data.key ===
              categoryKey ||
            data.id ===
              categoryKey
          );
        },
      );

    return match as
      | TaxonomyCategory
      | undefined;
  }

  if (
    typeof taxonomy !==
      "object" ||
    taxonomy === null
  ) {
    return undefined;
  }

  return (
    taxonomy as Record<
      string,
      unknown
    >
  )[categoryKey] as
    | TaxonomyCategory
    | undefined;
}

function getAllSubcategories(
  categoryKey: string,
): SubcategoryOption[] {
  const categoryData =
    getCategoryData(
      categoryKey,
    );

  if (!categoryData) {
    return [];
  }

  if (
    !Array.isArray(
      categoryData.subcategories,
    )
  ) {
    return [];
  }

  return categoryData.subcategories
    .map(
      (
        item: unknown,
      ): SubcategoryOption | null => {
        if (
          typeof item !==
              "object" ||
          item === null
        ) {
          return null;
        }

        const data =
          item as {
            key?: unknown;
            id?: unknown;
            label?: unknown;
            name?: unknown;
          };

        const key =
          typeof data.key ===
          "string"
            ? data.key
            : typeof data.id ===
                "string"
              ? data.id
              : undefined;

        const label =
          typeof data.label ===
          "string"
            ? data.label
            : typeof data.name ===
                "string"
              ? data.name
              : undefined;

        if (!key || !label) {
          return null;
        }

        return {
          key,
          label,
        };
      },
    )
    .filter(
      (
        item,
      ): item is SubcategoryOption =>
        item !== null,
    );
}

interface SearchParams {
  q?: string;
  category?: string;
  subcategory?: string;
  location?: string;
}

export const Route =
  createFileRoute("/search")({
    validateSearch: (
      search: Record<
        string,
        unknown
      >,
    ): SearchParams => {
      const q =
        typeof search.q ===
        "string"
          ? search.q
          : undefined;

      const category =
        typeof search.category ===
        "string"
          ? search.category
          : undefined;

      const subcategory =
        typeof search.subcategory ===
        "string"
          ? search.subcategory
          : undefined;

      const location =
        typeof search.location ===
        "string"
          ? search.location
          : undefined;

      return {
        ...(q !== undefined
          ? { q }
          : {}),
        ...(category !==
        undefined
          ? { category }
          : {}),
        ...(subcategory !==
        undefined
          ? { subcategory }
          : {}),
        ...(location !==
        undefined
          ? { location }
          : {}),
      };
    },

    component:
      SearchResults,
  });

function SearchResults() {
  const search =
    useSearch({
      from: Route.fullPath,
    });

  const profile =
    getProfile();

  const profileLocation =
    getProfileLocation(
      profile,
    );

  const [q, setQ] =
    useState(
      search.q ?? "",
    );

  const [category, setCategory] =
    useState<
      string | undefined
    >(
      search.category,
    );

  const [subcategory, setSubcategory] =
    useState<
      string | undefined
    >(
      search.subcategory,
    );

  const [location, setLocation] =
    useState(
      search.location ??
        profileLocation ??
        "",
    );

  const [
    showSuggestions,
    setShowSuggestions,
  ] = useState(false);

  const query =
    useQuery({
      queryKey: [
        "search",
        {
          term: q,
          category,
          subcategory,
          location,
        },
      ],

      queryFn:
        async () => {
          return searchEvents({
            term:
              q.trim() ||
              undefined,

            category,

            subcategory,

            location:
              location.trim() ||
              undefined,

            profile,
          });
        },

      enabled:
        Boolean(
          q.trim() ||
            category ||
            subcategory ||
            location.trim(),
        ),
    });

  const categories =
    getCategories();

  const subcategories =
    category
      ? getAllSubcategories(
          category,
        )
      : [];

  const events: PassrEvent[] =
    query.data?.events ??
    [];

  /**
   * Live suggestions are derived from the
   * same real provider results we're already
   * retrieving.
   *
   * This gives the user immediate entity-like
   * suggestions without inventing a second
   * search system.
   */
  const suggestions =
    useMemo(() => {
      const term =
        q.trim().toLowerCase();

      if (
        term.length < 2 ||
        !query.data
      ) {
        return [];
      }

      const seen =
        new Set<string>();

      return query.data.events
        .filter((event) => {
          const name =
            event.name
              ?.toLowerCase() ??
            "";

          const venue =
            event.venue
              ?.toLowerCase() ??
            "";

          const genre =
            event.genre
              ?.toLowerCase() ??
            "";

          return (
            name.includes(term) ||
            venue.includes(term) ||
            genre.includes(term)
          );
        })
        .filter((event) => {
          const key =
            event.name
              .trim()
              .toLowerCase();

          if (
            seen.has(key)
          ) {
            return false;
          }

          seen.add(key);

          return true;
        })
        .slice(0, 6);
    }, [
      q,
      query.data,
    ]);

  const clearFilters =
    () => {
      setCategory(
        undefined,
      );

      setSubcategory(
        undefined,
      );

      setLocation("");
    };

  return (
    <div className="mx-auto min-h-screen max-w-7xl bg-background pb-24 text-foreground">
      <div className="mx-auto max-w-6xl px-4 pt-4 sm:px-6 lg:px-8">

        <header className="mb-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:opacity-80"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </Link>

          <div className="mt-4 flex items-center gap-3">
            <img
              src={logo.url}
              alt=""
              aria-hidden
              className="h-8 w-8 object-contain"
            />

            <span className="font-sans text-2xl font-bold lowercase tracking-tight">
              passr
            </span>
          </div>

          {/* Search */}
          <div className="relative mt-4">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />

            <input
              value={q}
              onFocus={() =>
                setShowSuggestions(
                  true,
                )
              }
              onChange={(event) => {
                setQ(
                  event.target
                    .value,
                );

                setShowSuggestions(
                  true,
                );
              }}
              placeholder="Search events, artists, venues..."
              className="w-full rounded-full border border-border bg-muted px-12 py-3 font-inter text-base text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary"
            />

            {q && (
              <button
                type="button"
                onClick={() => {
                  setQ("");
                  setShowSuggestions(
                    false,
                  );
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}

            {showSuggestions &&
              suggestions.length >
                0 && (
                <div className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
                  {suggestions.map(
                    (event) => (
                      <button
                        key={event.id}
                        type="button"
                        onClick={() => {
                          setQ(
                            event.name,
                          );

                          setShowSuggestions(
                            false,
                          );
                        }}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-muted"
                      >
                        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />

                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold">
                            {event.name}
                          </span>

                          <span className="block truncate text-xs text-muted-foreground">
                            {event.venue ??
                              event.genre ??
                              event.category}
                          </span>
                        </span>
                      </button>
                    ),
                  )}
                </div>
              )}
          </div>

          {/* Search filters */}
          <div className="mt-4 space-y-4">

            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
                Categories
              </p>

              <div className="flex gap-2 overflow-x-auto pb-1">
                {categories.map(
                  (item) => (
                    <button
                      key={
                        item.key
                      }
                      type="button"
                      onClick={() => {
                        setCategory(
                          category ===
                            item.key
                            ? undefined
                            : item.key,
                        );

                        setSubcategory(
                          undefined,
                        );
                      }}
                      className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                        category ===
                        item.key
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-foreground hover:border-primary/50"
                      }`}
                    >
                      {
                        item.label
                      }
                    </button>
                  ),
                )}
              </div>
            </div>

            {subcategories.length >
              0 && (
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
                  {
                    getCategoryData(
                      category!,
                    )?.label ??
                    getCategoryData(
                      category!,
                    )?.name ??
                    "More filters"
                  }
                </p>

                <div className="flex gap-2 overflow-x-auto pb-1">
                  {subcategories.map(
                    (
                      sub,
                    ) => (
                      <button
                        key={
                          sub.key
                        }
                        type="button"
                        onClick={() => {
                          setSubcategory(
                            subcategory ===
                              sub.key
                              ? undefined
                              : sub.key,
                          );
                        }}
                        className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                          subcategory ===
                          sub.key
                            ? "border-primary/60 bg-primary/10 text-primary"
                            : "border-border bg-muted text-foreground hover:border-primary/30"
                        }`}
                      >
                        {
                          sub.label
                        }
                      </button>
                    ),
                  )}
                </div>
              </div>
            )}

            {/* Location */}
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
                Location
              </p>

              <div className="relative">
                <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                <input
                  value={
                    location
                  }
                  onChange={(
                    event,
                  ) =>
                    setLocation(
                      event
                        .target
                        .value,
                    )
                  }
                  placeholder="City, state, or ZIP"
                  className="w-full rounded-xl border border-border bg-background px-10 py-2.5 text-sm outline-none focus:border-primary"
                />
              </div>

              {profileLocation &&
                !location && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Using your profile
                    location:
                    {" "}
                    {
                      profileLocation
                    }
                  </p>
                )}
            </div>

            {(category ||
              subcategory ||
              location) && (
              <button
                type="button"
                onClick={
                  clearFilters
                }
                className="text-xs font-semibold text-primary hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        </header>

        {/* Results */}
        {query.isPending && (
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-muted/50 px-6 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Searching...
          </div>
        )}

        {query.isError && (
          <div className="rounded-2xl border border-border bg-muted/50 px-6 py-8 text-center text-sm text-muted-foreground">
            Could not load results.
          </div>
        )}

        {!query.isPending &&
          !query.isError &&
          query.data && (
            <>
              {events.length >
              0 ? (
                <div className="space-y-6">
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-sm text-muted-foreground">
                      Found{" "}
                      {
                        query
                          .data
                          .totalCount
                      }{" "}
                      {q
                        ? `results for "${q}"`
                        : "results"}
                    </p>

                    {location && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {location}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {events.map(
                      (
                        event,
                      ) => (
                        <SearchEventCard
                          key={
                            event.id
                          }
                          event={
                            event
                          }
                        />
                      ),
                    )}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-border bg-muted/40 px-6 py-8 text-center text-sm text-muted-foreground">
                  No events found. Try another search, category, or location.
                </div>
              )}
            </>
          )}

        {!query.isPending &&
          !query.isError &&
          !query.data &&
          !q &&
          !category &&
          !subcategory &&
          !location && (
            <div className="rounded-2xl border border-border bg-muted/50 px-6 py-8 text-center text-sm text-muted-foreground">
              Search for an artist, event, venue, or choose a category to explore.
            </div>
          )}
      </div>
    </div>
  );
}

function SearchEventCard({
  event,
}: {
  event: PassrEvent;
}) {
  return (
    <Link
      to="/event/$eventId"
      params={{
        eventId: event.id,
      }}
      className="group block overflow-hidden rounded-2xl border border-border bg-card transition hover:border-primary/30 hover:shadow-lg"
    >
      {event.image ? (
        <img
          src={event.image}
          alt={event.name}
          loading="lazy"
          className="h-40 w-full object-cover transition group-hover:scale-105"
        />
      ) : (
        <div className="h-40 w-full bg-accent-soft" />
      )}

      <div className="space-y-3 p-4">
        <div className="flex items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          <span>
            {event.category}
          </span>

          <span>
            {event.city}
          </span>
        </div>

        <h3 className="line-clamp-2 font-sans text-sm font-bold leading-tight">
          {event.name}
        </h3>

        <div className="space-y-0.5 text-xs text-muted-foreground">
          <p>{event.date}</p>
          <p>{event.venue}</p>
        </div>

        <div className="flex items-center justify-between border-t border-border pt-2">
          <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            From
          </span>

          <span className="price text-sm font-bold">
            {event.startingAt ===
            undefined
              ? "—"
              : money(
                  event.startingAt,
                )}
          </span>
        </div>
      </div>
    </Link>
  );
}
