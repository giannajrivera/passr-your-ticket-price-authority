import {
  createFileRoute,
  Link,
  useNavigate,
  useSearch,
} from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  ChevronLeft,
  Loader2,
  Search,
} from "lucide-react";

import { money } from "@/lib/mock-data";
import {
  searchEvents,
} from "@/lib/discovery-enhanced";
import type { PassrEvent } from "@/lib/types";
import { getProfile } from "@/lib/profile";
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
        typeof data?.label === "string"
          ? data.label
          : typeof data?.name === "string"
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
  page?: number;
}

export const Route = createFileRoute(
  "/search",
)({
  validateSearch: (
    search: Record<string, unknown>,
  ): SearchParams => {
    const q =
      typeof search["q"] === "string"
        ? search["q"]
        : undefined;

    const category =
      typeof search["category"] ===
      "string"
        ? search["category"]
        : undefined;

    const subcategory =
      typeof search["subcategory"] ===
      "string"
        ? search["subcategory"]
        : undefined;

    const rawPage = search["page"];

    const page =
      typeof rawPage === "number" &&
      Number.isFinite(rawPage)
        ? Math.max(
            0,
            Math.floor(rawPage),
          )
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
      ...(page !== undefined
        ? { page }
        : {}),
    };
  },

  component: SearchResults,
});

function SearchResults() {
  const search = useSearch({
    from: Route.fullPath,
  });

  const navigate = useNavigate({
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

  const [page, setPage] = useState(
    search.page ?? 0,
  );

  /*
   * Keep local state aligned if the user navigates
   * to another /search URL.
   */
  useEffect(() => {
    setQ(search.q ?? "");
    setCategory(
      search.category,
    );
    setSubcategory(
      search.subcategory,
    );
    setPage(
      search.page ?? 0,
    );
  }, [
    search.q,
    search.category,
    search.subcategory,
    search.page,
  ]);

  /*
   * Keep the URL synchronized with search state.
   *
   * This means:
   *
   * /search?q=Olivia%20Dean
   *
   * can be refreshed/shared/bookmarked.
   */
  useEffect(() => {
    const nextSearch = {
      ...(q.trim()
        ? { q: q.trim() }
        : {}),
      ...(category
        ? { category }
        : {}),
      ...(subcategory
        ? { subcategory }
        : {}),
      ...(page > 0
        ? { page }
        : {}),
    };

    const currentSearch = {
      ...(search.q
        ? { q: search.q }
        : {}),
      ...(search.category
        ? {
            category:
              search.category,
          }
        : {}),
      ...(search.subcategory
        ? {
            subcategory:
              search.subcategory,
          }
        : {}),
      ...(search.page && search.page > 0
        ? {
            page: search.page,
          }
        : {}),
    };

    if (
      JSON.stringify(
        nextSearch,
      ) ===
      JSON.stringify(
        currentSearch,
      )
    ) {
      return;
    }

    void navigate({
      search: nextSearch,
      replace: true,
    });
  }, [
    q,
    category,
    subcategory,
    page,
    navigate,
    search.q,
    search.category,
    search.subcategory,
    search.page,
  ]);

  const query = useQuery({
    queryKey: [
      "search",
      {
        term: q.trim(),
        category,
        subcategory,
        page,
      },
    ],

    queryFn: () =>
      searchEvents({
        ...(q.trim()
          ? { term: q.trim() }
          : {}),
        ...(category
          ? { category }
          : {}),
        ...(subcategory
          ? { subcategory }
          : {}),
        page,
        size: 20,
        profile,
      }),

    enabled: Boolean(
      q.trim() ||
        category ||
        subcategory,
    ),

    staleTime: 30_000,
  });

  const categories =
    getCategories();

  const subcategories =
    category
      ? getAllSubcategories(
          category,
        )
      : [];

  const events =
    query.data?.events ?? [];

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
                setPage(0);
              }}
              placeholder="Search events, artists, venues..."
              className="w-full rounded-full border border-border bg-muted px-12 py-3 font-inter text-base text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary"
            />
          </div>
        </header>

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
                    type="button"
                    onClick={() => {
                      const nextCategory =
                        category ===
                        item.key
                          ? undefined
                          : item.key;

                      setCategory(
                        nextCategory,
                      );
                      setSubcategory(
                        undefined,
                      );
                      setPage(0);
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
                      type="button"
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

        {query.isPending && (
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-muted/50 px-6 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Searching live events...
          </div>
        )}

        {query.isError && (
          <div className="rounded-2xl border border-destructive/30 bg-muted/50 px-6 py-8 text-center">
            <p className="text-sm font-semibold text-foreground">
              We couldn't load live events.
            </p>

            <p className="mt-1 text-xs text-muted-foreground">
              Please try again in a moment.
            </p>

            <button
              type="button"
              onClick={() =>
                void query.refetch()
              }
              className="mt-4 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              Try again
            </button>
          </div>
        )}

        {!query.isPending &&
          !query.isError &&
          query.data && (
            <>
              {events.length > 0 ? (
                <div className="space-y-6">
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-sm text-muted-foreground">
                      {query.data.totalCount >
                      0
                        ? `Showing ${
                            page * 20 + 1
                          }–${
                            page * 20 +
                            events.length
                          }`
                        : "No results"}
                      {q
                        ? ` for "${q}"`
                        : ""}
                    </p>
                  </div>

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

                  {(page > 0 ||
                    query.data.hasMore) && (
                    <div className="flex justify-center gap-3 pt-8">
                      {page > 0 && (
                        <button
                          type="button"
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

                      {query.data
                        .hasMore && (
                        <button
                          type="button"
                          onClick={() =>
                            setPage(
                              page + 1,
                            )
                          }
                          className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
                        >
                          Next
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-border bg-muted/40 px-6 py-8 text-center">
                  <p className="text-sm font-semibold text-foreground">
                    No events found.
                  </p>

                  <p className="mt-1 text-xs text-muted-foreground">
                    Try a different artist,
                    event, venue, or category.
                  </p>
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
              Enter a search or select a category to explore live events.
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
