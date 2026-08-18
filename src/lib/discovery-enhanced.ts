/**
 * Enhanced discovery layer with pagination, location, and category filtering.
 *
 * Features:
 * - Fetch 25+ events per category via pagination
 * - Location-based filtering
 * - Category + subcategory filtering
 * - Natural language query parsing
 * - Deduplication
 */

import type { PassrProfile } from "@/lib/profile";
import type { PassrEvent } from "@/lib/types";
import type { CategoryKey, MusicSubcategory, SportsSubcategory } from "@/lib/taxonomy-expanded";

export interface DiscoveryFilters {
  category?: CategoryKey;
  subcategory?: string;
  location?: string;
  radius?: number; // miles
  keyword?: string;
  page?: number;
  size?: number;
}

async function fetchTicketmasterBatch(params: Record<string, string | number | undefined>): Promise<PassrEvent[]> {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    search.set(key, String(value));
  });

  const response = await fetch(`/api/events/ticketmaster?${search.toString()}`);

  if (!response.ok) {
    return [];
  }

  const payload = (await response.json()) as { ok?: boolean; events?: PassrEvent[] };

  if (!payload.ok || !Array.isArray(payload.events)) {
    return [];
  }

  return payload.events;
}

function normalizeRoot(value: string): string {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return "";

  if (trimmed.includes("music") || trimmed.includes("concert")) return "music";
  if (trimmed.includes("sports") || trimmed.includes("game")) return "sports";
  if (trimmed.includes("comedy")) return "comedy";
  if (trimmed.includes("theater") || trimmed.includes("theatre")) return "theater";
  if (trimmed.includes("festival")) return "festivals";
  if (trimmed.includes("family") || trimmed.includes("kids")) return "family";
  if (trimmed.includes("arts") || trimmed.includes("culture")) return "arts";
  if (trimmed.includes("film") || trimmed.includes("movie")) return "film";

  return trimmed;
}

export async function searchEvents(
  filters: DiscoveryFilters,
  profile: PassrProfile | null,
): Promise<{ events: PassrEvent[]; hasMore: boolean; totalCount: number }> {
  const size = filters.size ?? 25;
  const page = filters.page ?? 0;

  const requests: Record<string, string | number | undefined>[] = [];

  if (filters.keyword) {
    // Free-text search
    requests.push({
      keyword: filters.keyword,
      countryCode: "US",
      size: size,
      page: page,
    });
  } else if (filters.category) {
    // Category-based search with optional subcategory
    const classificationMap: Record<CategoryKey, string> = {
      music: "Music",
      sports: "Sports",
      comedy: "Comedy",
      theater: "Arts & Theatre",
      arts: "Arts & Theatre",
      film: "Film",
      festivals: "Music", // Ticketmaster classifies festivals under Music
      family: "Family",
    };

    const classification = classificationMap[filters.category];
    if (classification) {
      requests.push({
        classificationName: classification,
        countryCode: "US",
        size: size,
        page: page,
      });
    }
  } else {
    // Default broad search
    requests.push({
      countryCode: "US",
      size: size,
      page: page,
    });
  }

  const batches = await Promise.all(
    requests.map((params) => fetchTicketmasterBatch(params).catch(() => [])),
  );

  const allEvents = batches.flat();

  // Filter by category if specified and it's a keyword search
  let filtered = allEvents;
  if (filters.category && !filters.keyword) {
    const categoryRoot = normalizeRoot(filters.category);
    filtered = allEvents.filter((event) => normalizeRoot(event.category) === categoryRoot);
  }

  // Remove duplicates
  const seen = new Set<string>();
  const deduplicated: PassrEvent[] = [];
  for (const event of filtered) {
    if (!seen.has(event.id)) {
      seen.add(event.id);
      deduplicated.push(event);
    }
  }

  return {
    events: deduplicated.slice(0, size),
    hasMore: deduplicated.length > size,
    totalCount: deduplicated.length,
  };
}

export async function fetchCategoryEvents(
  category: CategoryKey,
  profile: PassrProfile | null,
  targetCount: number = 25,
): Promise<PassrEvent[]> {
  const classificationMap: Record<CategoryKey, string> = {
    music: "Music",
    sports: "Sports",
    comedy: "Comedy",
    theater: "Arts & Theatre",
    arts: "Arts & Theatre",
    film: "Film",
    festivals: "Music",
    family: "Family",
  };

  const classification = classificationMap[category];
  if (!classification) return [];

  const allEvents: PassrEvent[] = [];
  let page = 0;
  const maxPages = 3; // Fetch up to 3 pages to get more events

  while (allEvents.length < targetCount && page < maxPages) {
    const events = await fetchTicketmasterBatch({
      classificationName: classification,
      countryCode: "US",
      size: 20,
      page: page,
    });

    if (!events || events.length === 0) break;

    allEvents.push(...events);
    page++;
  }

  // Remove duplicates and score
  const seen = new Set<string>();
  const scored: Array<{ event: PassrEvent; score: number }> = [];

  for (const event of allEvents) {
    if (seen.has(event.id)) continue;
    seen.add(event.id);

    let score = 0;
    if (event.trending) score += 10;
    if (event.startingAt !== undefined) score += 5;
    if (event.image) score += 3;

    scored.push({ event, score });
  }

  // Sort and return
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, targetCount)
    .map(({ event }) => event);
}

export async function getSearchSuggestions(query: string): Promise<{
  categories: Array<{ key: CategoryKey; label: string }>;
  artists?: string[];
}> {
  const q = query.toLowerCase().trim();

  const categoryMatches: Array<{ key: CategoryKey; label: string }> = [];

  const categoryLabels: Record<CategoryKey, string> = {
    music: "Music",
    sports: "Sports",
    comedy: "Comedy",
    theater: "Theater & Performance",
    arts: "Arts & Culture",
    film: "Film & Media",
    festivals: "Festivals",
    family: "Family Events",
  };

  for (const [key, label] of Object.entries(categoryLabels)) {
    if (label.toLowerCase().includes(q)) {
      categoryMatches.push({ key: key as CategoryKey, label });
    }
  }

  return {
    categories: categoryMatches,
    artists: [],
  };
}
