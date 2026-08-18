import type { PassrProfile } from "@/lib/profile";
import type { EventCategory, PassrEvent } from "@/lib/types";

export type DiscoveryFilters = {
  term?: string | undefined;
  category?: string | undefined;
  subcategory?: string | undefined;
  location?: string | undefined;
  radiusMiles?: number | undefined;
};

const REAL_CATEGORY_MAP: Record<string, EventCategory> = {
  music: "Concert",
  sports: "Sports",
  comedy: "Comedy",
  theater: "Theater",
  dance: "Theater",
  "arts-culture": "Theater",
  festivals: "Festival",
  family: "Family",
  nightlife: "Nightlife",
  "film-media": "Other",
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
  comedy: "Comedy",
  theater: "Arts & Theatre",
  dance: "Arts & Theatre",
  festivals: "Music",
  family: "Family",
  nightlife: "Music",
  "arts-culture": "Arts & Theatre",
  "film-media": "Film",
};

const TOP_LEVEL_CATEGORY_KEYS = [
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
];

function normalizeRoot(value: string): string {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return "";

  if (trimmed.includes("music") || trimmed.includes("concert") || trimmed.includes("band") || trimmed.includes("dj") || trimmed.includes("rock") || trimmed.includes("pop") || trimmed.includes("jazz") || trimmed.includes("indie") || trimmed.includes("rnb") || trimmed.includes("hip-hop") || trimmed.includes("dancehall") || trimmed.includes("reggaeton") || trimmed.includes("latin")) return "music";
  if (trimmed.includes("sports") || trimmed.includes("basketball") || trimmed.includes("football") || trimmed.includes("soccer") || trimmed.includes("baseball") || trimmed.includes("hockey") || trimmed.includes("tennis") || trimmed.includes("league") || trimmed.includes("game") || trimmed.includes("match") || trimmed.includes("team") || trimmed.includes("nfl") || trimmed.includes("nba") || trimmed.includes("mlb") || trimmed.includes("nhl")) return "sports";
  if (trimmed.includes("comedy") || trimmed.includes("stand-up") || trimmed.includes("stand up") || trimmed.includes("humor") || trimmed.includes("improv") || trimmed.includes("late night") || trimmed.includes("sketch")) return "comedy";
  if (trimmed.includes("theater") || trimmed.includes("theatre") || trimmed.includes("play") || trimmed.includes("musical") || trimmed.includes("opera") || trimmed.includes("broadway") || trimmed.includes("dance") || trimmed.includes("performance") || trimmed.includes("ballet")) return "theater";
  if (trimmed.includes("festival") || trimmed.includes("fair") || trimmed.includes("outdoor festival") || trimmed.includes("food festival") || trimmed.includes("film festival")) return "festivals";
  if (trimmed.includes("family") || trimmed.includes("kids") || trimmed.includes("children") || trimmed.includes("matinee") || trimmed.includes("all ages") || trimmed.includes("family festival")) return "family";
  if (trimmed.includes("nightlife") || trimmed.includes("club") || trimmed.includes("dance party") || trimmed.includes("late night") || trimmed.includes("dj event")) return "nightlife";
  if (trimmed.includes("arts") || trimmed.includes("culture") || trimmed.includes("museum") || trimmed.includes("gallery") || trimmed.includes("exhibit") || trimmed.includes("showcase") || trimmed.includes("community") || trimmed.includes("poetry")) return "arts-culture";
  if (trimmed.includes("film") || trimmed.includes("movie") || trimmed.includes("media") || trimmed.includes("screening") || trimmed.includes("cinema") || trimmed.includes("documentary") || trimmed.includes("premiere") || trimmed.includes("anime")) return "film-media";

  return trimmed.replace(/[^a-z0-9]+/g, " ").split(" ").filter(Boolean)[0] ?? "";
}

export function getPreferredCategories(profile: PassrProfile | null): Set<string> {
  const desired = new Set<string>();

  const categories = profile?.preferences?.categories ?? [];
  for (const item of categories) {
    const normalized = normalizeRoot(item);
    if (normalized) desired.add(normalized);
  }

  const legacy = profile?.answers?.["categories"] ?? [];
  for (const item of legacy) {
    const normalized = normalizeRoot(item);
    if (normalized) desired.add(normalized);
  }

  return desired;
}

function getProfileTokens(profile: PassrProfile | null): Set<string> {
  const tokens = new Set<string>();

  const addToken = (value: string | undefined) => {
    if (!value) return;
    const clean = value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    if (!clean) return;
    tokens.add(clean);
    const root = normalizeRoot(clean);
    if (root) tokens.add(root);
  };

  for (const category of profile?.preferences?.categories ?? []) addToken(category);
  for (const interest of profile?.preferences?.interests ?? []) addToken(interest);
  for (const group of Object.values(profile?.answers ?? {})) {
    for (const value of group) addToken(value);
  }

  return tokens;
}

function getPricePreference(profile: PassrProfile | null): number | undefined {
  const budget = profile?.preferences?.budget;

  if (budget === "under-75") return 75;
  if (budget === "75-150") return 150;
  if (budget === "150-300") return 300;
  if (budget === "300-plus") return 500;
  return undefined;
}

function eventMatchesLocation(event: PassrEvent, location?: string): boolean {
  if (!location) return true;

  const target = location.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  if (!target) return true;

  const fields = [event.city, event.state, event.venue, event.name, event.genre, event.subGenre]
    .filter(Boolean)
    .map((value) => value!.toLowerCase());

  return fields.some((field) => field.includes(target));
}

function scoreEvent(event: PassrEvent, profile: PassrProfile | null, location?: string): number {
  const desiredCategories = getPreferredCategories(profile);
  const tokens = getProfileTokens(profile);
  const preferredMax = getPricePreference(profile);

  let score = 0;

  const categoryKey = normalizeRoot(event.category);
  if (desiredCategories.size > 0) {
    if (desiredCategories.has(categoryKey)) {
      score += 45;
    } else {
      score -= 35;
    }
  }

  if (event.trending) score += 8;
  if (eventMatchesLocation(event, location)) score += 10;

  const eventText = [event.category, event.genre, event.subGenre, event.name, event.venue, event.city]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  for (const token of tokens) {
    if (!token) continue;
    const root = normalizeRoot(token);
    if (root && root === categoryKey) score += 18;
    if (event.genre && event.genre.toLowerCase().includes(token)) score += 10;
    if (event.subGenre && event.subGenre.toLowerCase().includes(token)) score += 10;
    if (event.name.toLowerCase().includes(token)) score += 8;
    if (eventText.includes(token)) score += 5;
  }

  if (preferredMax !== undefined && event.startingAt !== undefined) {
    if (event.startingAt <= preferredMax) score += 12;
    if (event.startingAt > preferredMax * 1.8) score -= 8;
  }

  if (event.startingAt !== undefined) score += 4;

  return score;
}

async function fetchTicketmasterBatch(params: Record<string, string | number | undefined>): Promise<PassrEvent[]> {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    search.set(key, String(value));
  });

  const response = await fetch(`/api/events/ticketmaster?${search.toString()}`);

  if (!response.ok) {
    throw new Error(`Ticketmaster request failed: ${response.status}`);
  }

  const payload = (await response.json()) as { ok?: boolean; events?: PassrEvent[] };
  if (!payload.ok || !Array.isArray(payload.events)) return [];

  return payload.events;
}

function locationCandidateParts(location?: string): string[] {
  if (!location) return [];
  return location
    .split(/[\s,]+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2);
}

export async function fetchDiscoveryPool(
  profile: PassrProfile | null,
  filters: DiscoveryFilters = {},
): Promise<PassrEvent[]> {
  const term = filters.term?.trim();
  const category = filters.category?.trim();
  const subcategory = filters.subcategory?.trim();
  const location = filters.location?.trim();
  const desiredCategories = getPreferredCategories(profile);

  const queries: Record<string, string | number | undefined>[] = [];

  if (term) {
    const cityParts = locationCandidateParts(location);
    queries.push({
      keyword: term,
      city: cityParts[0] ?? undefined,
      countryCode: "US",
      size: 24,
    });
  }

  if (category) {
    const mapped = TICKETMASTER_CATEGORY_MAP[category] ?? category;
    for (let page = 0; page < 3; page += 1) {
      queries.push({
        classificationName: mapped,
        countryCode: "US",
        page,
        size: 25,
      });
    }
  }

  if (subcategory) {
    for (let page = 0; page < 2; page += 1) {
      queries.push({
        keyword: subcategory,
        countryCode: "US",
        page,
        size: 20,
      });
    }
  }

  if (!term && !category && !subcategory) {
    const interestKeywords = Array.from(getProfileTokens(profile))
      .filter((token) => token.length > 3 && !TOP_LEVEL_CATEGORY_KEYS.includes(token))
      .slice(0, 8);

    for (const keyword of interestKeywords) {
      queries.push({ keyword, countryCode: "US", size: 12 });
    }

    if (desiredCategories.size > 0) {
      for (const selection of Array.from(desiredCategories)) {
        const mapped = TICKETMASTER_CATEGORY_MAP[selection] ?? selection;
        for (let page = 0; page < 3; page += 1) {
          queries.push({
            classificationName: mapped,
            countryCode: "US",
            page,
            size: 25,
          });
        }
      }
    }

    queries.push({ countryCode: "US", size: 25 });
  }

  const batches = await Promise.all(
    queries.map((params) => fetchTicketmasterBatch(params).catch(() => [])),
  );

  const merged = new Map<string, PassrEvent>();
  for (const batch of batches) {
    for (const event of batch) {
      if (!event?.id || merged.has(event.id)) continue;
      if (!event.name || !event.category) continue;
      if (category && normalizeRoot(event.category) !== category) continue;
      if (subcategory && ![event.genre, event.subGenre, event.name].some((value) => value && value.toLowerCase().includes(subcategory.toLowerCase()))) continue;
      if (location && !eventMatchesLocation(event, location)) continue;
      if (desiredCategories.size > 0 && !desiredCategories.has(normalizeRoot(event.category)) && !desiredCategories.has(normalizeRoot(event.genre ?? ""))) {
        continue;
      }
      merged.set(event.id, event);
    }
  }

  const ranked = Array.from(merged.values()).sort(
    (a, b) => scoreEvent(b, profile, location) - scoreEvent(a, profile, location),
  );

  return ranked.slice(0, 90);
}

export function buildHomeRails(
  events: PassrEvent[],
  profile: PassrProfile | null,
): {
  trending: PassrEvent[];
  suggested: PassrEvent[];
  categories: Array<{ id: string; title: string; events: PassrEvent[] }>;
} {
  const ranked = [...events].sort((a, b) => scoreEvent(b, profile) - scoreEvent(a, profile));

  const desiredCategories = getPreferredCategories(profile);
  const categorySet = new Set<string>();

  if (desiredCategories.size > 0) {
    for (const category of desiredCategories) {
      categorySet.add(category);
    }
  }

  if (categorySet.size === 0) {
    for (const event of ranked) {
      const categoryKey = normalizeRoot(event.category);
      if (categoryKey) categorySet.add(categoryKey);
    }
  }

  const used = new Set<string>();
  const takeUnique = (source: PassrEvent[], limit: number) => {
    const out: PassrEvent[] = [];
    for (const event of source) {
      if (used.has(event.id)) continue;
      used.add(event.id);
      out.push(event);
      if (out.length >= limit) break;
    }
    return out;
  };

  const trending = takeUnique(
    ranked.filter((event) => event.trending).length ? ranked.filter((event) => event.trending) : ranked,
    10,
  );

  const suggested = takeUnique(
    ranked.filter((event) => {
      if (desiredCategories.size === 0) return true;
      return desiredCategories.has(normalizeRoot(event.category));
    }),
    25,
  );

  const categories = Array.from(categorySet)
    .map((categoryKey) => {
      const title = CATEGORY_TITLE_MAP[categoryKey] ?? categoryKey;
      const matches = ranked.filter((event) => {
        const normalized = normalizeRoot(event.category);
        if (categoryKey === "arts-culture") return normalized === "arts-culture" || normalized === "theater";
        if (categoryKey === "festivals") return normalized === "festivals" || normalized === "music";
        return normalized === categoryKey;
      });
      return {
        id: categoryKey,
        title,
        events: takeUnique(matches, 25),
      };
    })
    .filter((rail) => rail.events.length > 0);

  return { trending, suggested, categories };
}
