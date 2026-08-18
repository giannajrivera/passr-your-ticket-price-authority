import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ChevronLeft, Loader2, Search } from "lucide-react";
import { money } from "@/lib/mock-data";
import { searchEvents } from "@/lib/discovery-enhanced";
import type { PassrEvent } from "@/lib/types";
import { getProfile } from "@/lib/profile";
import { EXPANDED_TAXONOMY, type CategoryKey, getAllSubcategories } from "@/lib/taxonomy-expanded";

import logo from "@/assets/passr-logo.png.asset.json";

interface SearchParams {
  q?: string;
  category?: CategoryKey;
  subcategory?: string;
  page?: number;
}

export const Route = createFileRoute("/search")({
  validateSearch: (search: Record<string, unknown>): SearchParams => {
    const q = typeof search["q"] === "string" ? search["q"] : undefined;
    const category =
      typeof search["category"] === "string" ? (search["category"] as CategoryKey) : undefined;
    const subcategory =
      typeof search["subcategory"] === "string" ? search["subcategory"] : undefined;
    const page = typeof search["page"] === "number" ? search["page"] : undefined;

    return {
      ...(q !== undefined ? { q } : {}),
      ...(category !== undefined ? { category } : {}),
      ...(subcategory !== undefined ? { subcategory } : {}),
      ...(page !== undefined ? { page } : {}),
    };
  },
  component: SearchResults,
});

function SearchResults() {
  const search = useSearch({ from: Route.fullPath });
  const profile = getProfile();
  const [q, setQ] = useState(search.q ?? "");
  const [category, setCategory] = useState(search.category);
  const [subcategory, setSubcategory] = useState(search.subcategory);
  const [page, setPage] = useState(search.page ?? 0);

  const query = useQuery({
    queryKey: ["search", { keyword: q, category, subcategory, page }],
    queryFn: () => {
      const filters: Parameters<typeof searchEvents>[0] = {
        page,
        size: 20,
      };

      if (q.trim()) {
        filters.keyword = q.trim();
      }
      if (category) {
        filters.category = category;
      }
      if (subcategory) {
        filters.subcategory = subcategory;
      }

      return searchEvents(filters, profile);
    },
    enabled: Boolean(q || category),
  });

  const subcategories = category ? getAllSubcategories(category) : [];

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
            <img src={logo.url} alt="" aria-hidden className="h-8 w-8 object-contain" />
            <span className="font-sans text-2xl font-bold lowercase tracking-tight">passr</span>
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
              {Object.entries(EXPANDED_TAXONOMY).map(([key, cat]) => (
                <button
                  key={key}
                  onClick={() => {
                    setCategory(category === (key as CategoryKey) ? undefined : (key as CategoryKey));
                    setSubcategory(undefined);
                    setPage(0);
                  }}
                  className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                    category === key
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-foreground hover:border-primary/50"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Subcategory filters */}
          {subcategories.length > 0 && (
            <div>
              <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
                {EXPANDED_TAXONOMY[category!]?.label ?? ""}
              </h3>
              <div className="flex flex-wrap gap-2">
                {subcategories.map((sub) => (
                  <button
                    key={sub.key}
                    onClick={() => {
                      setSubcategory(subcategory === sub.key ? undefined : sub.key);
                      setPage(0);
                    }}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                      subcategory === sub.key
                        ? "border-primary/60 bg-primary/10 text-primary"
                        : "border-border bg-muted text-foreground hover:border-primary/30"
                    }`}
                  >
                    {sub.label}
                  </button>
                ))}
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

        {!query.isPending && !query.isError && query.data && (
          <>
            {query.data.events.length > 0 ? (
              <div className="space-y-6">
                <p className="text-sm text-muted-foreground">
                  Found {query.data.totalCount} {q ? `results for "${q}"` : "results"}
                </p>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {query.data.events.map((event) => (
                    <SearchEventCard key={event.id} event={event} />
                  ))}
                </div>

                {/* Pagination */}
                {query.data.hasMore && (
                  <div className="flex justify-center gap-3 pt-8">
                    {page > 0 && (
                      <button
                        onClick={() => setPage(Math.max(0, page - 1))}
                        className="rounded-full border border-border bg-background px-5 py-2 text-sm font-semibold hover:bg-muted"
                      >
                        Previous
                      </button>
                    )}
                    <button
                      onClick={() => setPage(page + 1)}
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

        {!query.isPending && !query.isError && !query.data && !q && !category && (
          <div className="rounded-2xl border border-border bg-muted/50 px-6 py-8 text-center text-sm text-muted-foreground">
            Enter a search or select a category to explore events.
          </div>
        )}
      </div>
    </div>
  );
}

function SearchEventCard({ event }: { event: PassrEvent }) {
  return (
    <Link
      to="/event/$eventId"
      params={{ eventId: event.id }}
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
          <span>{event.category}</span>
          <span>{event.city}</span>
        </div>

        <div>
          <h3 className="line-clamp-2 font-sans text-sm font-bold leading-tight">{event.name}</h3>
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
            {event.startingAt === undefined ? "—" : money(event.startingAt)}
          </span>
        </div>
      </div>
    </Link>
  );
}
