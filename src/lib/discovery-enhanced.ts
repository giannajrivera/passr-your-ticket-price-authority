import type { PassrProfile } from "@/lib/profile";
import type { PassrEvent } from "@/lib/types";

import {
  buildHomeRails,
  fetchDiscoveryPool,
} from "@/lib/discovery";

export type EnhancedDiscoveryOptions = {
  profile?: PassrProfile | null;

  /*
   * `term` is the canonical search field.
   *
   * Example:
   * term: "Olivia Dean"
   */
  term?: string;

  category?: string;
  subcategory?: string;
  location?: string;
  radiusMiles?: number;

  /*
   * Search pagination.
   *
   * Discovery fetches a larger live-event pool first,
   * then searchEvents slices that pool for the UI.
   */
  page?: number;
  size?: number;
};

export type DiscoveryResult = {
  events: PassrEvent[];
  suggested: PassrEvent[];
  trending: PassrEvent[];

  categories: Array<{
    id: string;
    title: string;
    events: PassrEvent[];
  }>;
};

/**
 * Canonical higher-level discovery API.
 *
 * `discovery.ts` owns provider fetching, pagination,
 * validation, deduplication, filtering, and ranking.
 *
 * This file only turns that candidate pool into the
 * structures consumed by the UI.
 */
export async function getEnhancedDiscovery(
  options: EnhancedDiscoveryOptions = {},
): Promise<DiscoveryResult> {
  const profile = options.profile ?? null;

  const events = await fetchDiscoveryPool(
    profile,
    {
      term: options.term,
      category: options.category,
      subcategory: options.subcategory,
      location: options.location,
      radiusMiles: options.radiusMiles,
    },
  );

  const rails = buildHomeRails(
    events,
    profile,
  );

  return {
    events,
    suggested: rails.suggested,
    trending: rails.trending,
    categories: rails.categories,
  };
}

/**
 * Backwards-compatible alias for callers that use
 * the older discovery naming.
 */
export async function discoverEvents(
  options: EnhancedDiscoveryOptions = {},
): Promise<PassrEvent[]> {
  const result =
    await getEnhancedDiscovery(options);

  return result.events;
}

/**
 * Returns the personalized "Suggested for you"
 * rail.
 */
export async function getSuggestedEvents(
  profile: PassrProfile | null,
): Promise<PassrEvent[]> {
  const result =
    await getEnhancedDiscovery({
      profile,
    });

  return result.suggested;
}

/**
 * Returns the current trending rail.
 *
 * Trending is still constrained by explicit user
 * preferences when preferences exist.
 */
export async function getTrendingEvents(
  profile: PassrProfile | null,
): Promise<PassrEvent[]> {
  const result =
    await getEnhancedDiscovery({
      profile,
    });

  return result.trending;
}

/**
 * Returns category-specific rails.
 */
export async function getCategoryRails(
  profile: PassrProfile | null,
): Promise<
  Array<{
    id: string;
    title: string;
    events: PassrEvent[];
  }>
> {
  const result =
    await getEnhancedDiscovery({
      profile,
    });

  return result.categories;
}

/**
 * Search uses the same real-data discovery pipeline as
 * homepage recommendations.
 *
 * The discovery layer fetches a larger candidate pool,
 * then this function applies the UI's requested page
 * and page size.
 */
export async function searchEvents(
  options: EnhancedDiscoveryOptions,
): Promise<{
  events: PassrEvent[];
  totalCount: number;
  hasMore: boolean;
}> {
  const result =
    await getEnhancedDiscovery(options);

  const page = Math.max(
    0,
    options.page ?? 0,
  );

  const size = Math.max(
    1,
    options.size ?? 20,
  );

  const start = page * size;

  const events = result.events.slice(
    start,
    start + size,
  );

  return {
    events,
    totalCount: result.events.length,
    hasMore: start + size < result.events.length,
  };
}
