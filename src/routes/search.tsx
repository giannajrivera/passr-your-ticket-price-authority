import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ChevronLeft, Loader2, Search } from "lucide-react";
import { money } from "@/lib/mock-data";
import { searchEvents } from "@/lib/discovery-enhanced";
import type { PassrEvent } from "@/lib/types";
import { EXPANDED_TAXONOMY } from "@/lib/taxonomy-expanded";

import logo from "@/assets/passr-logo.png.asset.json";

/**
 * Keep the search route category as a string.
 *
 * EXPANDED_TAXONOMY is currently typed as an array in the project,
 * so using `keyof typeof EXPANDED_TAXONOMY` here can incorrectly
 * produce `number` as a possible key.
 */
type CategoryKey = string;

type Subcategory = {
  key: string;
  label: string;
};

type CategoryEntry = {
  key: string;
  label: string;
};

/**
 * Convert the existing taxonomy into a simple list that this route
 * can safely consume regardless of whether the taxonomy is represented
 * as an array or object.
 */
function getCategoryEntries(): CategoryEntry[] {
  const taxonomy = EXPANDED_TAXONOMY as unknown;

  if (Array.isArray(taxonomy)) {
    return taxonomy
      .map((item: unknown): CategoryEntry | null => {
        if (
          typeof item !== "object" ||
          item === null
        ) {
          return null;
        }

        const category = item as {
          key?: unknown;
          id?: unknown;
          slug?: unknown;
          label?: unknown;
          name?: unknown;
        };

        const key =
          typeof category.key === "string"
            ? category.key
            : typeof category.id === "string"
              ? category.id
              : typeof category.slug === "string"
                ? category.slug
                : undefined;

        const label =
          typeof category.label === "string"
            ? category.label
            : typeof category.name === "string"
              ? category.name
              : undefined;

        if (!key) {
          return null;
        }

        return {
          key,
          label: label ?? key,
        };
      })
      .filter(
        (item): item is CategoryEntry =>
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
    taxonomy as Record<string, unknown>,
  )
    .map(
      ([key, value]): CategoryEntry | null => {
        if (
          typeof value !== "object" ||
          value === null
        ) {
          return {
            key,
            label: key,
          };
        }

        const category = value as {
          label?: unknown;
          name?: unknown;
        };

        const label =
          typeof category.label === "string"
            ? category.label
            : typeof category.name === "string"
              ? category.name
              : key;

        return {
          key,
          label,
        };
      },
    )
    .filter(
      (item): item is CategoryEntry =>
        item !== null,
    );
}

/**
 * Get subcategories for a selected category.
 */
function getAllSubcategories(
  categoryKey: CategoryKey,
): Subcategory[] {
  const taxonomy = EXPANDED_TAXONOMY as unknown;

  let categoryData: unknown;

  if (Array.isArray(taxonomy)) {
    const found = taxonomy.find(
      (item: unknown) => {
        if (
          typeof item !== "object" ||
          item === null
        ) {
          return false;
        }

        const category = item as {
          key?: unknown;
          id?: unknown;
          slug?: unknown;
        };

        return (
          category.key === categoryKey ||
          category.id === categoryKey ||
          category.slug === categoryKey
        );
      },
    );

    categoryData = found;
  } else if (
    typeof taxonomy === "object" &&
    taxonomy !== null
  ) {
    categoryData = (
      taxonomy as Record<string, unknown>
    )[categoryKey];
  }

  if (
    typeof categoryData !== "object" ||
    categoryData === null
  ) {
    return [];
  }

  const data = categoryData as {
    subcategories?: unknown;
  };

  if (!Array.isArray(data.subcategories)) {
    return [];
  }

  return data.subcategories
    .map(
      (sub: unknown): Subcategory | null => {
        if (
          typeof sub !== "object" ||
          sub === null
        ) {
          return null;
        }

        const item = sub as {
          key?: unknown;
          label?: unknown;
          id?: unknown;
          name?: unknown;
        };

        const key =
          typeof item.key === "string"
            ? item.key
            : typeof item.id === "string"
              ? item.id
              : undefined;

        const label =
          typeof item.label === "string"
            ? item.label
            : typeof item.name === "string"
              ? item.name
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
      (sub): sub is Subcategory =>
        sub !== null,
    );
}

/**
 * Get the display label for a category.
 */
function getCategoryLabel(
  categoryKey: CategoryKey,
): string {
  const category = getCategoryEntries().find(
    (item) => item.key === categoryKey,
  );

  return category?.label ?? categoryKey;
}

interface SearchParams {
  q?: string;
  category?: CategoryKey;
  subcategory?: string;
  page?: number;
}

export const Route = createFileRoute("/search")({
  validateSearch: (
    search: Record<string, unknown>,
  ): SearchParams => {
    const q =
      typeof search["q"] === "string"
        ? search["q"]
        : undefined;

    const category =
      typeof search["category"] === "string"
        ? search["category"]
        : undefined;

    const subcategory =
      typeof search["subcategory"] === "string"
        ? search["subcategory"]
        : undefined;

    const page =
      typeof search["page"] === "number"
        ? search["page"]
        : undefined;

    return {
      ...(q !== undefined ? { q } : {}),
      ...(category !== undefined
        ? { category }
        : {}),
      ...(subcategory !== undefined
        ? { subcategory }
        : {}),
      ...(page !== undefined ? { page } : {}),
    };
  },

  component: SearchResults,
});

function SearchResults() {
  const search = useSearch({
    from: Route.fullPath,
  });

  const [q, setQ] = useState(
    search.q ?? "",
  );

  const [category, setCategory] =
    useState<CategoryKey | undefined>(
      search.category,
    );

  const [subcategory, setSubcategory] =
    useState<string | undefined>(
      search.subcategory,
    );

  const [page, setPage] = useState(
    search.page ?? 0,
  );

  const query = useQuery({
    queryKey: [
      "search",
      {
        keyword: q,
        category,
        subcategory,
        page,
      },
    ],

    queryFn: () => {
      const filters: Parameters<
        typeof searchEvents
      >[0] = {
        page,
        size: 20,
      };

      if (q.trim()) {
        filters.term = q.trim();
      }

      if (category) {
        filters.category = category;
      }

      if (subcategory) {
        filters.subcategory =
          subcategory;
      }

      /*
       * searchEvents accepts one options object.
       *
       * It already receives the profile through the
       * discovery pipeline where appropriate, so do not
       * pass profile as a second argument.
       */
      return searchEvents(filters);
    },

    enabled: Boolean(
      q.trim() || category,
    ),
  });

  const subcategories = category
    ? getAllSubcategories(category)
    : [];

  const categories =
    getCategoryEntries();

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

          <div className="relative mt-4">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />

            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(0);
              }}
              placeholder="Search events, artists, venues..."
              className="w-full rounded-full border border-border bg-muted px-12 py-3 font-inter text-base text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary"
            />
          </div>
        </header>

        {/* Category filters */}
        <div className="mb-8 space-y-4">
          <div>
            <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.12em] text-muted-foreground">
              Browse by category
            </h3>

            <div className="flex flex-wrap gap-2">
              {categories.map(
                (cat) => (
                  <button
                    key={cat.key}
                    onClick={() => {
                      setCategory(
                        category === cat.key
                          ? undefined
                          : cat.key,
                      );

                      setSubcategory(
                        undefined,
                      );

                      setPage(0);
                    }}
                    className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                      category === cat.key
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-foreground hover:border-primary/50"
                    }`}
                  >
                    {cat.label}
                  </button>
                ),
              )}
            </div>
          </div>

          {/* Subcategory filters */}
          {subcategories.length > 0 && (
            <div>
              <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
                {getCategoryLabel(
                  category!,
                )}
              </h3>

              <div className="flex flex-wrap gap-2">
                {subcategories.map(
                  (sub) => (
                    <button
                      key={sub.key}
                      onClick={() => {
                        setSubcategory(
                          subcategory ===
                            sub.key
                            ? undefined
                            : sub.key,
                        );

                        setPage(0);
                      }}
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                        subcategory ===
                        sub.key
                          ? "border-primary/60 bg-primary/10 text-primary"
                          : "border-border bg-muted text-foreground hover:border-primary/30"
                      }`}
                    >
                      {sub.label}
                    </button>
                  ),
                )}
              </div>
            </div>
          )}
        </div>

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
              {query.data.length > 0 ? (
                <div className="space-y-6">
                  <p className="text-sm text-muted-foreground">
                    Found{" "}
                    {query.data.length}{" "}
                    {q
                      ? `results for "${q}"`
                      : "results"}
                  </p>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {query.data.map(
                      (event) => (
                        <SearchEventCard
                          key={event.id}
                          event={event}
                        />
                      ),
                    )}
                  </div>

                  {/* Pagination */}
                  {query.data.length >=
                    20 && (
                    <div className="flex justify-center gap-3 pt-8">
                      {page > 0 && (
                        <button
                          onClick={() =>
                            setPage(
                              Math.max(
                                0,
                                page - 1,
                              ),
                            )
                          }
                          className="rounded-full border border-border bg-background px-5 py-2 text-sm font-semibold hover:bg-muted"
                        >
                          Previous
                        </button>
                      )}

                      <button
                        onClick={() =>
                          setPage(
                            page + 1,
                          )
                        }
                        className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-border bg-muted/40 px-6 py-8 text-center text-sm text-muted-foreground">
                  No events found. Try a different search or category.
                </div>
              )}
            </>
          )}

        {!query.isPending &&
          !query.isError &&
          !query.data &&
          !q &&
          !category && (
            <div className="rounded-2xl border border-border bg-muted/50 px-6 py-8 text-center text-sm text-muted-foreground">
              Enter a search or select a category to explore events.
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

        <div>
          <h3 className="line-clamp-2 font-sans text-sm font-bold leading-tight">
            {event.name}
          </h3>
        </div>

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
