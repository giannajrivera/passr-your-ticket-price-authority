import type { PassrProfile } from "@/lib/profile";
import type { PassrEvent } from "@/lib/types";
import {
  facetsFor,
  type EventPreferences,
} from "@/lib/preferences";
import { getPreferences } from "@/lib/profile";
import { deduplicateEvents } from "@/lib/event-utils";

/**
 * Passr discovery is intentionally split into three layers:
 *
 * 1. Passr taxonomy/preferences
 * 2. Provider query construction
 * 3. Provider-agnostic ranking/filtering
 *
 * Ticketmaster is currently the provider, but nothing below the ranking
 * layer should require Ticketmaster-specific concepts.
 */

export type DiscoveryFilters = {
  term?: string | undefined;
  category?: string | undefined;
  subcategory?: string | undefined;
  location?: string | undefined;
  radiusMiles?: number | undefined;
};

type ProviderQuery = Record<string, string | number | undefined>;

type SearchableFacet = {
  id: string;
  category: string;
  subcategory?: string;
  detail?: string;
  subDetail?: string;
  categoryLabel: string;
  subcategoryLabel?: string;
  detailLabel?: string;
  subDetailLabel?: string;
};

const CATEGORY_TITLE_MAP: Record<string, string> = {
  music: "Music",
  sports: "Sports",
  comedy: "Comedy",
  theater: "Theater",
  dance: "Dance",
  festivals: "Festivals",
  family: "Family",
  nightlife: "Nightlife",
  "arts-culture": "Arts & Culture",
  "film-media": "Film & Media",
};

const TICKETMASTER_CATEGORY_MAP: Record<string, string> = {
  music: "Music",
  sports: "Sports",
  comedy: "Arts & Theatre",
  theater: "Arts & Theatre",
  dance: "Arts & Theatre",
  festivals: "Music",
  family: "Family",
  nightlife: "Music",
  "arts-culture": "Arts & Theatre",
  "film-media": "Film",
};

const TOP_LEVEL_CATEGORY_KEYS = new Set([
  "music",
  "sports",
  "comedy",
  "theater",
  "dance",
  "festivals",
  "family",
  "nightlife",
  "arts-culture",
  "film-media",
]);

const DISCOVERY_PAGE_SIZE = 100;
const DISCOVERY_MAX_PAGES_PER_QUERY = 6;
const DISCOVERY_TARGET_POOL = 150;

/* -------------------------------------------------------------------------- */
/* Text / taxonomy helpers                                                     */
/* -------------------------------------------------------------------------- */

function normalizeText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeRoot(value: string): string {
  const trimmed = normalizeText(value);

  if (!trimmed) return "";

  if (
    trimmed.includes("music") ||
    trimmed.includes("concert") ||
    trimmed.includes("band") ||
    trimmed.includes("dj") ||
    trimmed.includes("rock") ||
    trimmed.includes("pop") ||
    trimmed.includes("jazz") ||
    trimmed.includes("indie") ||
    trimmed.includes("rnb") ||
    trimmed.includes("r&b") ||
    trimmed.includes("hip hop") ||
    trimmed.includes("rap") ||
    trimmed.includes("dancehall") ||
    trimmed.includes("reggaeton") ||
    trimmed.includes("latin") ||
    trimmed.includes("country") ||
    trimmed.includes("metal")
  ) {
    return "music";
  }

  if (
    trimmed.includes("sports") ||
    trimmed.includes("basketball") ||
    trimmed.includes("football") ||
    trimmed.includes("soccer") ||
    trimmed.includes("baseball") ||
    trimmed.includes("hockey") ||
    trimmed.includes("tennis") ||
    trimmed.includes("golf") ||
    trimmed.includes("boxing") ||
    trimmed.includes("mma") ||
    trimmed.includes("racing") ||
    trimmed.includes("league") ||
    trimmed.includes("game") ||
    trimmed.includes("match") ||
    trimmed.includes("team") ||
    trimmed.includes("nfl") ||
    trimmed.includes("nba") ||
    trimmed.includes("mlb") ||
    trimmed.includes("nhl") ||
    trimmed.includes("wnba") ||
    trimmed.includes("nwsl")
  ) {
    return "sports";
  }

  if (
    trimmed.includes("comedy") ||
    trimmed.includes("stand up") ||
    trimmed.includes("humor") ||
    trimmed.includes("improv") ||
    trimmed.includes("sketch")
  ) {
    return "comedy";
  }

  if (
    trimmed.includes("theater") ||
    trimmed.includes("theatre") ||
    trimmed.includes("play") ||
    trimmed.includes("musical") ||
    trimmed.includes("opera") ||
    trimmed.includes("broadway") ||
    trimmed.includes("performance") ||
    trimmed.includes("ballet")
  ) {
    return "theater";
  }

  if (
    trimmed.includes("festival") ||
    trimmed.includes("fair") ||
    trimmed.includes("food festival") ||
    trimmed.includes("film festival")
  ) {
    return "festivals";
  }

  if (
    trimmed.includes("family") ||
    trimmed.includes("kids") ||
    trimmed.includes("children") ||
    trimmed.includes("all ages")
  ) {
    return "family";
  }

  if (
    trimmed.includes("nightlife") ||
    trimmed.includes("club") ||
    trimmed.includes("dance party")
  ) {
    return "nightlife";
  }

  if (
    trimmed.includes("arts") ||
    trimmed.includes("culture") ||
    trimmed.includes("museum") ||
    trimmed.includes("gallery") ||
    trimmed.includes("exhibit") ||
    trimmed.includes("poetry")
  ) {
    return "arts-culture";
  }

  if (
    trimmed.includes("film") ||
    trimmed.includes("movie") ||
    trimmed.includes("media") ||
    trimmed.includes("screening") ||
    trimmed.includes("cinema") ||
    trimmed.includes("documentary") ||
    trimmed.includes("anime")
  ) {
    return "film-media";
  }

  return trimmed.split(" ").filter(Boolean)[0] ?? "";
}

function getProfilePreferences(
  profile: PassrProfile | null,
): EventPreferences {
  return profile?.preferences ?? getPreferences();
}

function getProfileFacets(
  profile: PassrProfile | null,
): SearchableFacet[] {
  return facetsFor(getProfilePreferences(profile)) as SearchableFacet[];
}

export function getPreferredCategories(
  profile: PassrProfile | null,
): Set<string> {
  const preferences = getProfilePreferences(profile);
  const categories = new Set<string>();

  for (const category of preferences.categories ?? []) {
    const root = normalizeText(category.split(".")[0] ?? category);

    if (root) {
      categories.add(root);
    }
  }

  for (const interest of preferences.interests ?? []) {
    const root = normalizeText(interest.split(".")[0] ?? interest);

    if (root) {
      categories.add(root);
    }
  }

  return categories;
}

function getPreferenceTokens(
  profile: PassrProfile | null,
): string[] {
  const preferences = getProfilePreferences(profile);
  const tokens = new Set<string>();

  const add = (value: string | undefined) => {
    if (!value) return;

    const normalized = normalizeText(value);

    if (
      normalized.length >= 3 &&
      !TOP_LEVEL_CATEGORY_KEYS.has(normalized)
    ) {
      tokens.add(normalized);
    }
  };

  for (const facet of getProfileFacets(profile)) {
    add(facet.subcategoryLabel);
    add(facet.detailLabel);
    add(facet.subDetailLabel);
  }

  for (const interest of preferences.interests ?? []) {
    add(interest.replace(/\./g, " "));
  }

  return Array.from(tokens);
}

export function getProfileLocation(
  profile: PassrProfile | null,
): string | undefined {
  if (!profile) return undefined;

  const flexibleProfile = profile as PassrProfile & {
    location?: string;
    city?: string;
    state?: string;
    preferences?: EventPreferences & {
      location?: string;
      city?: string;
      state?: string;
    };
  };

  if (
    typeof flexibleProfile.location === "string" &&
    flexibleProfile.location.trim()
  ) {
    return flexibleProfile.location.trim();
  }

  if (
    typeof flexibleProfile.preferences?.location === "string" &&
    flexibleProfile.preferences.location.trim()
  ) {
    return flexibleProfile.preferences.location.trim();
  }

  const answerLocation = Object.entries(profile.answers ?? {}).find(
    ([key]) => {
      const normalized = normalizeText(key);

      return (
        normalized.includes("location") ||
        normalized.includes("city") ||
        normalized.includes("where")
      );
    },
  )?.[1];

  if (answerLocation?.length) {
    const value = answerLocation[0];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  if (
    flexibleProfile.city?.trim() &&
    flexibleProfile.state?.trim()
  ) {
    return `${flexibleProfile.city.trim()}, ${flexibleProfile.state.trim()}`;
  }

  if (flexibleProfile.city?.trim()) {
    return flexibleProfile.city.trim();
  }

  return undefined;
}

/* -------------------------------------------------------------------------- */
/* Preference semantics                                                        */
/* -------------------------------------------------------------------------- */

function getPricePreference(
  profile: PassrProfile | null,
): number | undefined {
  const budget = getProfilePreferences(profile).budget;

  switch (budget) {
    case "under-75":
      return 75;
    case "75-150":
      return 150;
    case "150-300":
      return 300;
    case "300-plus":
      return 500;
    case "no-limit":
    default:
      return undefined;
  }
}

function getTravelRadius(
  profile: PassrProfile | null,
): number | undefined {
  const travel = getProfilePreferences(profile).travel;

  switch (travel) {
    case "my-city":
      return 25;
    case "50-miles":
      return 50;
    case "few-hours":
      return 150;
    case "anywhere":
      return undefined;
    default:
      return undefined;
  }
}

function eventMatchesLocation(
  event: PassrEvent,
  location?: string,
): boolean {
  if (!location) return false;

  const target = normalizeText(location);

  if (!target) return false;

  const fields = [
    event.city,
    event.state,
    event.country,
    event.venue,
  ]
    .filter(Boolean)
    .map((value) => normalizeText(value!));

  if (fields.some((field) => field.includes(target))) {
    return true;
  }

  const parts = target.split(" ").filter((part) => part.length >= 3);

  return parts.some((part) =>
    fields.some((field) => field.includes(part)),
  );
}

function eventMatchesSubcategory(
  event: PassrEvent,
  subcategory?: string,
): boolean {
  if (!subcategory) return true;

  const target = normalizeText(subcategory);

  if (!target) return true;

  const targetParts = target.split(" ").filter(Boolean);

  const fields = [
    event.genre,
    event.subGenre,
    event.name,
    event.subtitle,
    event.venue,
    event.category,
  ]
    .filter(Boolean)
    .map((value) => normalizeText(value!));

  return fields.some((field) => {
    if (field.includes(target)) {
      return true;
    }

    return targetParts.every((part) => field.includes(part));
  });
}

function eventMatchesFacet(
  event: PassrEvent,
  facet: SearchableFacet,
): boolean {
  const fields = [
    event.name,
    event.subtitle,
    event.genre,
    event.subGenre,
    event.category,
    event.venue,
  ]
    .filter(Boolean)
    .map((value) => normalizeText(value!));

  const labels = [
    facet.categoryLabel,
    facet.subcategoryLabel,
    facet.detailLabel,
    facet.subDetailLabel,
  ]
    .filter(Boolean)
    .map((value) => normalizeText(value!))
    .filter((value) => value.length >= 3);

  if (labels.length === 0) {
    return false;
  }

  const deepestLabels = labels.slice(Math.max(0, labels.length - 2));

  return deepestLabels.some((label) =>
    fields.some((field) => field.includes(label)),
  );
}

function eventMatchesPreferredCategory(
  event: PassrEvent,
  profile: PassrProfile | null,
): boolean {
  const preferred = getPreferredCategories(profile);

  if (preferred.size === 0) {
    return true;
  }

  return preferred.has(normalizeRoot(event.category));
}

function eventMatchesProfileInterests(
  event: PassrEvent,
  profile: PassrProfile | null,
): boolean {
  const facets = getProfileFacets(profile);

  if (facets.length === 0) {
    return eventMatchesPreferredCategory(event, profile);
  }

  const matchingFacets = facets.filter(
    (facet) =>
      normalizeRoot(facet.category) ===
      normalizeRoot(event.category),
  );

  if (matchingFacets.length === 0) {
    return false;
  }

  return (
    matchingFacets.some((facet) => eventMatchesFacet(event, facet)) ||
    matchingFacets.some(
      (facet) => !facet.detail && !facet.subcategory,
    )
  );
}

/* -------------------------------------------------------------------------- */
/* Event validation                                                            */
/* -------------------------------------------------------------------------- */

function isValidDiscoveryEvent(event: PassrEvent): boolean {
  if (!event) return false;

  if (event.source === "mock") return false;
  if (!event.sourceEventId) return false;
  if (!event.id) return false;
  if (!event.name?.trim()) return false;
  if (!event.date?.trim()) return false;
  if (!event.category) return false;

  const excludedListingTypes = new Set([
    "suite",
    "parking",
    "vip",
    "package",
    "other",
  ]);

  if (
    event.listingType &&
    excludedListingTypes.has(event.listingType)
  ) {
    return false;
  }

  return true;
}

function getEventIdentity(event: PassrEvent): string {
  return `${event.source}:${event.sourceEventId ?? event.id}`;
}

function collapseLocationNoise(
  events: PassrEvent[],
  location?: string,
): PassrEvent[] {
  if (!location) {
    return events;
  }

  const localEvents = events.filter((event) =>
    eventMatchesLocation(event, location),
  );

  if (localEvents.length === 0) {
    return events;
  }

  const localNames = new Set(
    localEvents.map((event) => normalizeText(event.name)),
  );

  return events.filter((event) => {
    if (eventMatchesLocation(event, location)) {
      return true;
    }

    return !localNames.has(normalizeText(event.name));
  });
}

/* -------------------------------------------------------------------------- */
/* Provider mapping                                                            */
/* -------------------------------------------------------------------------- */

function mapCategoryToTicketmaster(
  category: string,
): string {
  const root = category.split(".")[0] ?? category;

  return TICKETMASTER_CATEGORY_MAP[root] ?? root;
}

function facetToKeyword(
  facet: SearchableFacet,
): string | undefined {
  return (
    facet.subDetailLabel ??
    facet.detailLabel ??
    facet.subcategoryLabel ??
    facet.categoryLabel
  );
}

function buildProviderQueries(
  profile: PassrProfile | null,
  filters: DiscoveryFilters,
): ProviderQuery[] {
  const queries: ProviderQuery[] = [];

  const term = filters.term?.trim();
  const category = filters.category?.trim();
  const subcategory = filters.subcategory?.trim();

  if (term) {
    queries.push({
      keyword: term,
    });
  }

  if (category) {
    queries.push({
      classificationName: mapCategoryToTicketmaster(category),
    });
  }

  if (subcategory) {
    queries.push({
      keyword: subcategory.replace(/\./g, " "),
    });
  }

  if (!term && !category && !subcategory) {
    const facets = getProfileFacets(profile);

    for (const facet of facets) {
      const keyword = facetToKeyword(facet);

      if (!keyword) continue;

      queries.push({
        keyword,
        classificationName: mapCategoryToTicketmaster(
          facet.category,
        ),
      });
    }

    for (const categoryId of getPreferredCategories(profile)) {
      queries.push({
        classificationName: mapCategoryToTicketmaster(
          categoryId,
        ),
      });
    }

    for (const keyword of getPreferenceTokens(profile).slice(0, 8)) {
      queries.push({
        keyword,
      });
    }
  }

  if (queries.length === 0) {
    queries.push({});
  }

  return Array.from(
    new Map(
      queries.map((query) => [JSON.stringify(query), query]),
    ).values(),
  );
}

/* -------------------------------------------------------------------------- */
/* Ticketmaster HTTP                                                           */
/* -------------------------------------------------------------------------- */

async function fetchTicketmasterBatch(
  params: ProviderQuery,
): Promise<PassrEvent[]> {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (
      value === undefined ||
      value === null ||
      value === ""
    ) {
      continue;
    }

    search.set(key, String(value));
  }

  const url = `/api/events/ticketmaster?${search.toString()}`;

  console.log("Passr → Ticketmaster search:", url);

  const response = await fetch(url);

  if (!response.ok) {
    let errorMessage =
      `Ticketmaster request failed: ${response.status}`;

    try {
      const payload = (await response.json()) as {
        error?: {
          message?: string;
        };
      };

      if (payload.error?.message) {
        errorMessage =
          `${errorMessage} — ${payload.error.message}`;
      }
    } catch {
      // Preserve HTTP error.
    }

    throw new Error(errorMessage);
  }

  const payload = (await response.json()) as {
    ok?: boolean;
    events?: PassrEvent[];
    error?: {
      kind?: string;
      message?: string;
    };
  };

  if (payload.ok !== true) {
    throw new Error(
      payload.error?.message ??
        "Ticketmaster returned an unsuccessful response.",
    );
  }

  if (!Array.isArray(payload.events)) {
    throw new Error(
      "Ticketmaster returned an invalid events payload.",
    );
  }

  return payload.events;
}

async function fetchPaginatedQuery(
  baseParams: ProviderQuery,
  targetCount: number,
  location?: string,
  radiusMiles?: number,
): Promise<PassrEvent[]> {
  const events: PassrEvent[] = [];

  for (
    let page = 0;
    page < DISCOVERY_MAX_PAGES_PER_QUERY &&
    events.length < targetCount;
    page += 1
  ) {
    const batch = await fetchTicketmasterBatch({
      ...baseParams,
      countryCode:
        baseParams["countryCode"] ??
        "US",
      city:
        baseParams["city"],
      radius: radiusMiles,
      unit: radiusMiles ? "miles" : undefined,
      page,
      size: DISCOVERY_PAGE_SIZE,
    });

    const valid = batch.filter(isValidDiscoveryEvent);

    events.push(...valid);

    if (batch.length < DISCOVERY_PAGE_SIZE) {
      break;
    }
  }

  return events;
}

/* -------------------------------------------------------------------------- */
/* Ranking                                                                     */
/* -------------------------------------------------------------------------- */

function scoreEvent(
  event: PassrEvent,
  profile: PassrProfile | null,
  location?: string,
): number {
  const preferences = getProfilePreferences(profile);
  const preferredCategories = getPreferredCategories(profile);
  const facets = getProfileFacets(profile);
  const preferredMax = getPricePreference(profile);

  let score = 0;

  const eventCategory = normalizeRoot(event.category);

  if (preferredCategories.has(eventCategory)) {
    score += 60;
  }

  if (
    facets.some((facet) =>
      eventMatchesFacet(event, facet),
    )
  ) {
    score += 80;
  }

  if (
    location &&
    eventMatchesLocation(event, location)
  ) {
    score += 100;
  }

  if (event.trending) {
    score += 8;
  }

  if (event.image) {
    score += 3;
  }

  if (event.ticketUrl) {
    score += 3;
  }

  if (event.startingAt !== undefined) {
    score += 2;
  }

  const eventText = [
    event.name,
    event.genre,
    event.subGenre,
    event.subtitle,
    event.venue,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  for (const token of getPreferenceTokens(profile)) {
    if (
      token.length < 3 ||
      TOP_LEVEL_CATEGORY_KEYS.has(token)
    ) {
      continue;
    }

    if (eventText.includes(token)) {
      score += 20;
    }
  }

  if (
    preferredMax !== undefined &&
    event.startingAt !== undefined
  ) {
    if (event.startingAt <= preferredMax) {
      score += 15;
    } else if (event.startingAt > preferredMax * 1.8) {
      score -= 8;
    }
  }

  for (const vibe of preferences.vibes ?? []) {
    switch (vibe) {
      case "cheapest-seat":
        if (event.startingAt !== undefined) {
          score += Math.max(
            0,
            20 - event.startingAt / 10,
          );
        }
        break;

      case "big-nights":
        if (
          event.venue
            ?.toLowerCase()
            .includes("arena")
        ) {
          score += 12;
        }
        break;

      case "small-rooms":
        if (
          event.venue
            ?.toLowerCase()
            .match(
              /club|theatre|theater|hall|room|lounge|studio/,
            )
        ) {
          score += 12;
        }
        break;

      case "family-friendly":
        if (event.category === "Family") {
          score += 20;
        }
        break;

      default:
        break;
    }
  }

  return score;
}

/* -------------------------------------------------------------------------- */
/* Public discovery API                                                        */
/* -------------------------------------------------------------------------- */

export async function fetchDiscoveryPool(
  profile: PassrProfile | null,
  filters: DiscoveryFilters = {},
): Promise<PassrEvent[]> {
  const term = filters.term?.trim();
  const category = filters.category?.trim();
  const subcategory = filters.subcategory?.trim();

  const profileLocation = getProfileLocation(profile);

  const location =
    filters.location?.trim() ||
    profileLocation;

  const radiusMiles =
    filters.radiusMiles ??
    getTravelRadius(profile);

  const queries = buildProviderQueries(profile, filters);

  const perQueryTarget = Math.ceil(
    DISCOVERY_TARGET_POOL /
      Math.max(1, queries.length),
  );

  const batches = await Promise.all(
    queries.map(
      (query) =>
        fetchPaginatedQuery(
          query,
          perQueryTarget,
          location,
          radiusMiles,
        ).catch((error) => {
          console.error(
            "Passr discovery query failed:",
            {
              query,
              error,
            },
          );

          return [];
        }),
    ),
  );

  let filtered = batches
    .flat()
    .filter(isValidDiscoveryEvent);

  if (category) {
    filtered = filtered.filter(
      (event) =>
        normalizeRoot(event.category) ===
        normalizeRoot(category),
    );
  }

  if (subcategory) {
    filtered = filtered.filter(
      (event) =>
        eventMatchesSubcategory(
          event,
          subcategory,
        ),
    );
  }

  if (filters.location?.trim()) {
    filtered = filtered.filter(
      (event) =>
        eventMatchesLocation(
          event,
          filters.location,
        ),
    );
  }

  if (
    !term &&
    !category &&
    !subcategory &&
    profile
  ) {
    const facets = getProfileFacets(profile);

    if (facets.length > 0) {
      const personalized = filtered.filter(
        (event) =>
          eventMatchesProfileInterests(
            event,
            profile,
          ),
      );

      if (personalized.length > 0) {
        filtered = personalized;
      } else {
        filtered = filtered.filter(
          (event) =>
            eventMatchesPreferredCategory(
              event,
              profile,
            ),
        );
      }
    } else {
      const preferred = getPreferredCategories(profile);

      if (preferred.size > 0) {
        filtered = filtered.filter(
          (event) =>
            preferred.has(
              normalizeRoot(event.category),
            ),
        );
      }
    }
  }

  filtered = collapseLocationNoise(
    filtered,
    location,
  );

  const identityMap = new Map<string, PassrEvent>();

  for (const event of filtered) {
    const identity = getEventIdentity(event);
    const existing = identityMap.get(identity);

    if (!existing) {
      identityMap.set(identity, event);
      continue;
    }

    const existingScore =
      Number(Boolean(existing.image)) +
      Number(Boolean(existing.ticketUrl)) +
      Number(existing.startingAt !== undefined);

    const newScore =
      Number(Boolean(event.image)) +
      Number(Boolean(event.ticketUrl)) +
      Number(event.startingAt !== undefined);

    if (newScore > existingScore) {
      identityMap.set(identity, event);
    }
  }

  filtered = Array.from(identityMap.values());

  filtered = deduplicateEvents(filtered);

  return filtered
    .sort(
      (a, b) =>
        scoreEvent(b, profile, location) -
        scoreEvent(a, profile, location),
    )
    .slice(0, DISCOVERY_TARGET_POOL);
}

/* -------------------------------------------------------------------------- */
/* Home rails                                                                  */
/* -------------------------------------------------------------------------- */

export function buildHomeRails(
  events: PassrEvent[],
  profile: PassrProfile | null,
): {
  trending: PassrEvent[];
  suggested: PassrEvent[];
  categories: Array<{
    id: string;
    title: string;
    events: PassrEvent[];
  }>;
} {
  const valid = events.filter(isValidDiscoveryEvent);

  const location = getProfileLocation(profile);

  const trending = [...valid]
    .sort((a, b) => {
      const aScore =
        Number(Boolean(a.trending)) * 100 +
        Number(Boolean(a.image)) * 2 +
        Number(Boolean(a.ticketUrl)) * 2;

      const bScore =
        Number(Boolean(b.trending)) * 100 +
        Number(Boolean(b.image)) * 2 +
        Number(Boolean(b.ticketUrl)) * 2;

      return bScore - aScore;
    })
    .slice(0, 10);

  const ranked = [...valid].sort(
    (a, b) =>
      scoreEvent(b, profile, location) -
      scoreEvent(a, profile, location),
  );

  const suggested = ranked.slice(0, 25);

  const categorySet = new Set<string>();

  for (const event of ranked) {
    const key = normalizeRoot(event.category);

    if (key) {
      categorySet.add(key);
    }
  }

  const categories = Array.from(categorySet)
    .map((categoryKey) => ({
      id: categoryKey,
      title:
        CATEGORY_TITLE_MAP[categoryKey] ??
        categoryKey,
      events: ranked
        .filter(
          (event) =>
            normalizeRoot(event.category) ===
            categoryKey,
        )
        .slice(0, 25),
    }))
    .filter((rail) => rail.events.length > 0);

  return {
    trending,
    suggested,
    categories,
  };
}
