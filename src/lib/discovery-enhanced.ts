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

  /**
   * Explicit search location overrides the
   * profile location.
   */
  location?: string;
  radiusMiles?: number;

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

export async function getEnhancedDiscovery(
  options: EnhancedDiscoveryOptions = {},
): Promise<DiscoveryResult> {
  const profile =
    options.profile ?? null;

  const events =
    await fetchDiscoveryPool(
      profile,
      {
        term: options.term,
        category: options.category,
        subcategory: options.subcategory,
        location: options.location,
        radiusMiles: options.radiusMiles,
      },
    );

  const rails =
    buildHomeRails(
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

export async function discoverEvents(
  options: EnhancedDiscoveryOptions = {},
): Promise<PassrEvent[]> {
  const result =
    await getEnhancedDiscovery(
      options,
    );

  return result.events;
}

export async function getSuggestedEvents(
  profile: PassrProfile | null,
): Promise<PassrEvent[]> {
  const result =
    await getEnhancedDiscovery({
      profile,
    });

  return result.suggested;
}

export async function getTrendingEvents(
  profile: PassrProfile | null,
): Promise<PassrEvent[]> {
  const result =
    await getEnhancedDiscovery({
      profile,
    });

  return result.trending;
}

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

export async function searchEvents(
  options: EnhancedDiscoveryOptions,
): Promise<{
  events: PassrEvent[];
  totalCount: number;
  hasMore: boolean;
}> {
  const result =
    await getEnhancedDiscovery(
      options,
    );

  const page = Math.max(
    0,
    options.page ?? 0,
  );

  const size = Math.max(
    1,
    options.size ?? 20,
  );

  const start =
    page * size;

  const events =
    result.events.slice(
      start,
      start + size,
    );

  return {
    events,
    totalCount:
      result.events.length,
    hasMore:
      start + size <
      result.events.length,
  };
}
