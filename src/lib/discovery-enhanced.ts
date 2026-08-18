import type { PassrProfile } from "@/lib/profile";
import type { PassrEvent } from "@/lib/types";
import {
  buildHomeRails,
  fetchDiscoveryPool,
} from "@/lib/discovery";

export type EnhancedDiscoveryOptions = {
  profile?: PassrProfile | null;
  term?: string;
  category?: string;
  subcategory?: string;
  location?: string;
  radiusMiles?: number;
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
 * preferences when preferences exist. It is not
 * allowed to override an explicit category exclusion.
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
 *
 * Each category gets its own independently ranked
 * real-event list instead of borrowing the same small
 * homepage array.
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
 * This prevents search from having a separate source
 * of mock/placeholder events.
 */
export async function searchEvents(
  options: EnhancedDiscoveryOptions,
): Promise<PassrEvent[]> {
  const result =
    await getEnhancedDiscovery(options);

  return result.events;
}
