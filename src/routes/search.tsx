import {
  createFileRoute,
  Link,
  useSearch,
} from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  ChevronLeft,
  Loader2,
  Search,
} from "lucide-react";

import { money } from "@/lib/mock-data";
import { searchEvents } from "@/lib/discovery-enhanced";
import type { PassrEvent } from "@/lib/types";
import { getProfile } from "@/lib/profile";
import { EXPANDED_TAXONOMY } from "@/lib/taxonomy-expanded";

import logo from "@/assets/passr-logo.png.asset.json";

/**
 * Keep the category key type compatible with whatever shape
 * EXPANDED_TAXONOMY currently uses.
 *
 * We intentionally do not import CategoryKey from
 * taxonomy-expanded.ts because that file does not currently
 * export one.
 */
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

/**
 * Converts the taxonomy into a simple list of categories.
 *
 * This works whether EXPANDED_TAXONOMY is currently represented
 * as an object or an array.
 */
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
        typeof data?.label === "string"
          ? data.label
          : typeof data?.name === "string"
            ? data.name
            : key,
    };
  });
}

/**
 * Gets the taxonomy data for one category.
 */
function getCategoryData(
  categoryKey: string,
): TaxonomyCategory | undefined {
  const taxonomy =
    EXPANDED_TAXONOMY as unknown;

  if (Array.isArray(taxonomy)) {
    const match = taxonomy.find(
      (item: unknown) => {
        if (
          typeof item !== "object" ||
          item === null
        ) {
          return false;
        }

        const data =
          item as TaxonomyCategory;

        return (
          data.key === categoryKey ||
          data.id === categoryKey
        );
      },
    );

    return match as
      | TaxonomyCategory
      | undefined;
  }

  if (
    typeof taxonomy !== "object" ||
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

/**
 * Reads all subcategories from the selected category.
 */
function getAllSubcategories(
  categoryKey: string,
): SubcategoryOption[] {
  const categoryData =
    getCategoryData(categoryKey);

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
          typeof item !== "object" ||
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
      ): item is SubcategoryOption =>
        item !== null,
    );
}

interface SearchParams {
  q?: string;
  category?: string;
  subcategory?: string;
}

export const Route = createFileRoute(
  "/search",
)({
  validateSearch: (
    search: Record<string, unknown>,
  ): SearchParams => {
    const q =
      typeof search.q === "string"
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

    return {
      ...(q !== undefined
        ? { q }
        : {}),
      ...(category !== undefined
        ? { category }
        : {}),
      ...(subcategory !== undefined
        ? { subcategory }
        : {}),
    };
  },

  component: SearchResults,
});

function SearchResults() {
  const search = useSearch({
    from: Route.fullPath,
  });

  const profile = getProfile();

  const [q, setQ] = useState(
    search.q ?? "",
  );

  const [category, setCategory] =
    useState<string | undefined>(
      search.category,
    );

  const [subcategory, setSubcategory] =
    useState<string | undefined>(
      search.subcategory,
    );

  const query = useQuery({
    queryKey: [
      "search",
      {
        term: q,
        category,
        subcategory,
      },
    ],

    queryFn: async () => {
      const filters: Parameters<
        typeof searchEvents
      >[0] = {};

      if (q.trim()) {
        filters.term = q.trim();
      }

      if (category) {
        filters.category =
          category;
      }

      if (subcategory) {
        filters.subcategory =
          subcategory;
      }

      /*
       * searchEvents uses the same real-data
       * discovery pipeline as the homepage.
       *
       * Profile is intentionally not passed as a
       * second argument because the current
       * searchEvents API accepts one options object.
       */
      return searchEvents({
        ...filters,
        profile,
      });
    },

    enabled: Boolean(
      q.trim() ||
        category ||
        subcategory,
    ),
  });

  const subcategories =
    category
      ? getAllSubcategories(category)
      : [];

  const categories =
    getCategories();

  const events: PassrEvent[] =
    Array.isArray(query.data)
      ? query.data
      : query.data &&
          typeof query.data ===
            "object" &&
          "events" in query.data &&
          Array.isArray(
            (
              query.data as {
                events?: unknown;
              }
            ).events,
        )
        ? (
            query.data as {
              events: PassrEvent[];
            }
          ).events
        : [];

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
              onChange={(event) => {
                setQ(
                  event.target.value,
                );
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
                (item) => (
                  <button
                    key={item.key}
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
                    className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                      category ===
                      item.key
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-foreground hover:border-primary/50"
                    }`}
                  >
                    {item.label}
                  </button>
                ),
              )}
            </div>
          </div>

          {/* Subcategory filters */}
          {subcategories.length >
            0 && (
            <div>
              <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
                {getCategoryData(
                  category!,
                )?.label ??
                  getCategoryData(
                    category!,
                  )?.name ??
                  ""}
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
              {events.length > 0 ? (
                <div className="space-y-6">
                  <p className="text-sm text-muted-foreground">
                    Found{" "}
                    {events.length}{" "}
                    {q
                      ? `results for "${q}"`
                      : "results"}
                  </p>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {events.map(
                      (
                        event: PassrEvent,
                      ) => (
                        <SearchEventCard
                          key={event.id}
                          event={event}
                        />
                      ),
                    )}
                  </div>
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
          !category &&
          !subcategory && (
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
