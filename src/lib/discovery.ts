import type { PassrProfile } from "@/lib/profile";
import type { PassrEvent } from "@/lib/types";

import { deduplicateEvents } from "@/lib/event-utils";

export type DiscoveryFilters = {
  term?: string | undefined;
  category?: string | undefined;
  subcategory?: string | undefined;
  location?: string | undefined;
  radiusMiles?: number | undefined;
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

function normalizeRoot(value: string): string {
  const trimmed = value.trim().toLowerCase();

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
    trimmed.includes("hip-hop") ||
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
    trimmed.includes("stand-up") ||
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
    trimmed.includes("dance") ||
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

  return (
    trimmed
      .replace(/[^a-z0-9]+/g, " ")
      .split(" ")
      .filter(Boolean)[0] ?? ""
  );
}

export function getPreferredCategories(
  profile: PassrProfile | null,
): Set<string> {
  const desired = new Set<string>();

  for (const item of profile?.preferences?.categories ?? []) {
    const normalized = normalizeRoot(item);

    if (normalized) {
      desired.add(normalized);
    }
  }

  for (const item of profile?.answers?.["categories"] ?? []) {
    const normalized = normalizeRoot(item);

    if (normalized) {
      desired.add(normalized);
    }
  }

  return desired;
}

function getProfileTokens(
  profile: PassrProfile | null,
): Set<string> {
  const tokens = new Set<string>();

  const addToken = (value: string | undefined) => {
    if (!value) return;

    const clean = value
      .toLowerCase()
      .replace(/[^a-z0-9&+]+/g, " ")
      .trim();

    if (!clean) return;

    tokens.add(clean);
  };

  for (const category of profile?.preferences?.categories ?? []) {
    addToken(category);
  }

  for (const interest of profile?.preferences?.interests ?? []) {
    addToken(interest);
  }

  for (const group of Object.values(profile?.answers ?? {})) {
    for (const value of group) {
      addToken(value);
    }
  }

  return tokens;
}

function getPricePreference(
  profile: PassrProfile | null,
): number | undefined {
  const budget = profile?.preferences?.budget;

  if (budget === "under-75") return 75;
  if (budget === "75-150") return 150;
  if (budget === "150-300") return 300;
  if (budget === "300-plus") return 500;

  return undefined;
}

function eventMatchesLocation(
  event: PassrEvent,
  location?: string,
): boolean {
  if (!location) return true;

  const target = location
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

  if (!target) return true;

  const fields = [
    event.city,
    event.state,
    event.venue,
  ]
    .filter(Boolean)
    .map((value) => value!.toLowerCase());

  return fields.some((field) => field.includes(target));
}

function eventMatchesSubcategory(
  event: PassrEvent,
  subcategory?: string,
): boolean {
  if (!subcategory) return true;

  const target = subcategory
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

  if (!target) return true;

  const fields = [
    event.genre,
    event.subGenre,
    event.name,
    event.subtitle,
  ]
    .filter(Boolean)
    .map((value) =>
      value!
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " "),
    );

  return fields.some((field) => field.includes(target));
}

function isValidDiscoveryEvent(
  event: PassrEvent,
): boolean {
  if (!event) return false;

  if (event.source === "mock") {
    return false;
  }

  if (!event.sourceEventId) {
    return false;
  }

  if (!event.id) {
    return false;
  }

  if (!event.name?.trim()) {
    return false;
  }

  if (!event.date?.trim()) {
    return false;
  }

  if (!event.category) {
    return false;
  }

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

function scoreEvent(
  event: PassrEvent,
  profile: PassrProfile | null,
  location?: string,
): number {
  const desiredCategories = getPreferredCategories(profile);
  const tokens = getProfileTokens(profile);
  const preferredMax = getPricePreference(profile);
  const categoryKey = normalizeRoot(event.category);

  let score = 0;

  if (desiredCategories.size > 0) {
    if (desiredCategories.has(categoryKey)) {
      score += 60;
    } else {
      score -= 100;
    }
  }

  if (
    location &&
    eventMatchesLocation(event, location)
  ) {
    score += 30;
  }

  if (event.trending) {
    score += 4;
  }

  if (event.image) {
    score += 2;
  }

  if (event.ticketUrl) {
    score += 2;
  }

  if (event.startingAt !== undefined) {
    score += 1;
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

  for (const token of tokens) {
    if (
      token.length < 3 ||
      TOP_LEVEL_CATEGORY_KEYS.has(token)
    ) {
      continue;
    }

    if (eventText.includes(token)) {
      score += 18;
    }
  }

  if (
    preferredMax !== undefined &&
    event.startingAt !== undefined
  ) {
    if (event.startingAt <= preferredMax) {
      score += 10;
    } else if (
      event.startingAt >
      preferredMax * 1.8
    ) {
      score -= 5;
    }
  }

  return score;
}

async function fetchTicketmasterBatch(
  params: Record<
    string,
    string | number | undefined
  >,
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

  const url =
    `/api/events/ticketmaster?${search.toString()}`;

  console.log(
    "Passr → Ticketmaster search:",
    url,
  );

  const response = await fetch(url);

  if (!response.ok) {
    let errorMessage =
      `Ticketmaster request failed: ${response.status}`;

    try {
      const errorPayload =
        (await response.json()) as {
          error?: {
            message?: string;
          };
        };

      if (errorPayload.error?.message) {
        errorMessage =
          `${errorMessage} — ${errorPayload.error.message}`;
      }
    } catch {
      // Keep the HTTP status error.
    }

    throw new Error(errorMessage);
  }

  const payload =
    (await response.json()) as {
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
  baseParams: Record<
    string,
    string | number | undefined
  >,
  targetCount: number,
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
        baseParams["countryCode"] ?? "US",
      page,
      size: DISCOVERY_PAGE_SIZE,
    });

    if (batch.length === 0) {
      break;
    }

    events.push(
      ...batch.filter(isValidDiscoveryEvent),
    );

    if (batch.length < DISCOVERY_PAGE_SIZE) {
      break;
    }
  }

  return events;
}

export async function fetchDiscoveryPool(
  profile: PassrProfile | null,
  filters: DiscoveryFilters = {},
): Promise<PassrEvent[]> {
  const term = filters.term?.trim();
  const category = filters.category?.trim();
  const subcategory = filters.subcategory?.trim();
  const location = filters.location?.trim();

  const desiredCategories =
    getPreferredCategories(profile);

  const queryDefinitions: Record<
    string,
    string | number | undefined
  >[] = [];

  /*
   * Direct search.
   *
   * Example:
   * "Olivia Dean"
   */
  if (term) {
    queryDefinitions.push({
      keyword: term,
    });
  }

  if (category) {
    queryDefinitions.push({
      classificationName:
        TICKETMASTER_CATEGORY_MAP[category] ??
        category,
    });
  }

  if (subcategory) {
    queryDefinitions.push({
      keyword: subcategory,
    });
  }

  /*
   * Homepage discovery.
   */
  if (
    !term &&
    !category &&
    !subcategory
  ) {
    for (const preferred of desiredCategories) {
      queryDefinitions.push({
        classificationName:
          TICKETMASTER_CATEGORY_MAP[preferred] ??
          preferred,
      });
    }

    const interestKeywords = Array.from(
      getProfileTokens(profile),
    )
      .filter(
        (token) =>
          token.length >= 3 &&
          !TOP_LEVEL_CATEGORY_KEYS.has(token),
      )
      .slice(0, 6);

    for (const keyword of interestKeywords) {
      queryDefinitions.push({
        keyword,
      });
    }

    if (queryDefinitions.length === 0) {
      queryDefinitions.push({});
    }
  }

  /*
   * Remove duplicate provider queries.
   */
  const uniqueQueries = Array.from(
    new Map(
      queryDefinitions.map((query) => [
        JSON.stringify(query),
        query,
      ]),
    ).values(),
  );

  const perQueryTarget = Math.ceil(
    DISCOVERY_TARGET_POOL /
      Math.max(1, uniqueQueries.length),
  );

  /*
   * Run all discovery queries.
   *
   * We use allSettled so one failed query doesn't
   * destroy otherwise-valid discovery results.
   *
   * BUT if every query fails, we throw.
   *
   * This distinction is important:
   *
   * Some queries fail → show whatever succeeded.
   * Everything fails → show a real error.
   */
  const results = await Promise.allSettled(
    uniqueQueries.map((query) =>
      fetchPaginatedQuery(
        query,
        perQueryTarget,
      ),
    ),
  );

  const successfulBatches: PassrEvent[][] = [];
  const failures: unknown[] = [];

  for (const result of results) {
    if (result.status === "fulfilled") {
      successfulBatches.push(result.value);
    } else {
      failures.push(result.reason);
    }
  }

  if (
    successfulBatches.length === 0 &&
    failures.length > 0
  ) {
    const firstFailure = failures[0];

    if (firstFailure instanceof Error) {
      throw firstFailure;
    }

    throw new Error(
      "Passr could not load live discovery data.",
    );
  }

  const filtered = successfulBatches
    .flat()
    .filter(isValidDiscoveryEvent)
    .filter((event) => {
      if (
        category &&
        normalizeRoot(event.category) !==
          normalizeRoot(category)
      ) {
        return false;
      }

      if (
        subcategory &&
        !eventMatchesSubcategory(
          event,
          subcategory,
        )
      ) {
        return false;
      }

      if (
        location &&
        !eventMatchesLocation(
          event,
          location,
        )
      ) {
        return false;
      }

      /*
       * Personalized homepage discovery should
       * stay inside explicitly selected categories.
       *
       * Direct searches are never restricted by
       * profile categories.
       */
      if (
        desiredCategories.size > 0 &&
        !category &&
        !term &&
        !subcategory
      ) {
        return desiredCategories.has(
          normalizeRoot(event.category),
        );
      }

      return true;
    });

  const merged = deduplicateEvents(filtered);

  return merged
    .sort(
      (a, b) =>
        scoreEvent(
          b,
          profile,
          location,
        ) -
        scoreEvent(
          a,
          profile,
          location,
        ),
    )
    .slice(0, DISCOVERY_TARGET_POOL);
}

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
  const valid = events.filter(
    isValidDiscoveryEvent,
  );

  const ranked = [...valid].sort(
    (a, b) =>
      scoreEvent(b, profile) -
      scoreEvent(a, profile),
  );

  const desiredCategories =
    getPreferredCategories(profile);

  const categorySet = new Set<string>();

  if (desiredCategories.size > 0) {
    for (const category of desiredCategories) {
      categorySet.add(category);
    }
  } else {
    for (const event of ranked) {
      const categoryKey =
        normalizeRoot(event.category);

      if (categoryKey) {
        categorySet.add(categoryKey);
      }
    }
  }

  const takeUnique = (
    source: PassrEvent[],
    limit: number,
  ) => source.slice(0, limit);

  const personalizedRanked =
    desiredCategories.size > 0
      ? ranked.filter((event) =>
          desiredCategories.has(
            normalizeRoot(event.category),
          ),
        )
      : ranked;

  const trending = takeUnique(
    personalizedRanked,
    10,
  );

  const suggested = takeUnique(
    personalizedRanked,
    25,
  );

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
    .filter(
      (rail) => rail.events.length > 0,
    );

  return {
    trending,
    suggested,
    categories,
  };
}

export { normalizeRoot };
