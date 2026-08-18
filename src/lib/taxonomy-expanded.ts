export type PassrCategory = {
  id: string;
  label: string;
  description?: string;
  keywords: string[];
  providerCategories?: string[];
};

export const EXPANDED_TAXONOMY: PassrCategory[] = [
  {
    id: "music",
    label: "Music",
    description: "Concerts, tours, live performances, and more.",
    keywords: [
      "music",
      "concert",
      "tour",
      "live music",
      "singer",
      "band",
      "artist",
      "dj",
      "festival",
      "performance",
      "rock",
      "pop",
      "hip hop",
      "hip-hop",
      "rap",
      "r&b",
      "soul",
      "jazz",
      "blues",
      "country",
      "folk",
      "indie",
      "alternative",
      "metal",
      "punk",
      "hardcore",
      "emo",
      "electronic",
      "edm",
      "house",
      "techno",
      "trance",
      "reggae",
      "dancehall",
      "afrobeats",
      "latin",
      "reggaeton",
      "salsa",
      "bachata",
      "k-pop",
      "j-pop",
      "classical",
      "orchestra",
      "symphony",
      "opera",
      "acoustic",
      "bluegrass",
      "gospel",
      "christian",
      "tribute",
      "cover band",
    ],
    providerCategories: ["Music"],
  },

  {
    id: "sports",
    label: "Sports",
    description: "Games, matches, races, fights, and live competition.",
    keywords: [
      "sports",
      "football",
      "nfl",
      "college football",
      "basketball",
      "nba",
      "wnba",
      "college basketball",
      "baseball",
      "mlb",
      "minor league baseball",
      "hockey",
      "nhl",
      "soccer",
      "mls",
      "nwsl",
      "college soccer",
      "tennis",
      "golf",
      "nascar",
      "racing",
      "formula 1",
      "f1",
      "motorsport",
      "boxing",
      "mma",
      "ufc",
      "wrestling",
      "wwe",
      "aew",
      "lacrosse",
      "rugby",
      "cricket",
      "volleyball",
      "softball",
      "field hockey",
      "gymnastics",
      "swimming",
      "track",
      "horse racing",
      "rodeo",
      "bull riding",
      "esports",
      "gaming",
      "arena football",
      "minor league",
      "college sports",
      "olympic",
    ],
    providerCategories: ["Sports"],
  },

  {
    id: "festivals",
    label: "Festivals",
    description: "Music festivals, cultural events, food festivals, and more.",
    keywords: [
      "festival",
      "music festival",
      "food festival",
      "film festival",
      "cultural festival",
      "art festival",
      "street festival",
      "community festival",
      "beer festival",
      "wine festival",
      "literary festival",
      "comedy festival",
      "dance festival",
      "carnival",
      "fair",
      "county fair",
      "state fair",
      "celebration",
      "outdoor festival",
    ],
    providerCategories: ["Music"],
  },

  {
    id: "comedy",
    label: "Comedy",
    description: "Stand-up, improv, sketch, and comedy shows.",
    keywords: [
      "comedy",
      "stand up",
      "stand-up",
      "comedian",
      "improv",
      "improvisation",
      "sketch comedy",
      "humor",
      "roast",
      "comedy show",
      "comedy tour",
      "satire",
    ],
    providerCategories: ["Arts & Theatre"],
  },

  {
    id: "theater",
    label: "Theater",
    description: "Plays, musicals, Broadway, opera, and live theater.",
    keywords: [
      "theater",
      "theatre",
      "broadway",
      "musical",
      "play",
      "drama",
      "opera",
      "operetta",
      "stage",
      "performing arts",
      "touring production",
      "west end",
      "off-broadway",
      "family theater",
      "children's theater",
    ],
    providerCategories: ["Arts & Theatre"],
  },

  {
    id: "dance",
    label: "Dance",
    description: "Dance performances, ballet, contemporary, and more.",
    keywords: [
      "dance",
      "ballet",
      "contemporary dance",
      "modern dance",
      "hip hop dance",
      "tap",
      "jazz dance",
      "folk dance",
      "dance company",
      "dance performance",
      "choreography",
    ],
    providerCategories: ["Arts & Theatre"],
  },

  {
    id: "family",
    label: "Family",
    description: "Events and experiences for kids and families.",
    keywords: [
      "family",
      "kids",
      "children",
      "childrens",
      "all ages",
      "family show",
      "family entertainment",
      "circus",
      "puppet",
      "puppetry",
      "magic",
      "children's theater",
      "sesame",
      "disney",
      "nickelodeon",
      "mascot",
    ],
    providerCategories: ["Family"],
  },

  {
    id: "arts-culture",
    label: "Arts & Culture",
    description: "Museums, exhibitions, galleries, and cultural experiences.",
    keywords: [
      "arts",
      "culture",
      "museum",
      "gallery",
      "exhibition",
      "exhibit",
      "installation",
      "sculpture",
      "painting",
      "photography",
      "visual arts",
      "spoken word",
      "poetry",
      "literature",
      "author",
      "book",
      "cultural",
      "heritage",
    ],
    providerCategories: ["Arts & Theatre"],
  },

  {
    id: "film-media",
    label: "Film & Media",
    description: "Movies, screenings, premieres, and media events.",
    keywords: [
      "film",
      "movie",
      "cinema",
      "screening",
      "premiere",
      "film festival",
      "documentary",
      "anime",
      "animation",
      "television",
      "tv",
      "media",
      "director",
      "actor",
      "cast",
      "live podcast",
      "podcast",
      "recording",
    ],
    providerCategories: ["Film"],
  },

  {
    id: "nightlife",
    label: "Nightlife",
    description: "Clubs, DJs, dance parties, and late-night events.",
    keywords: [
      "nightlife",
      "club",
      "nightclub",
      "dj",
      "dance party",
      "rave",
      "house party",
      "electronic",
      "edm",
      "techno",
      "house music",
      "late night",
      "after party",
    ],
    providerCategories: ["Music"],
  },
];

/**
 * Find a category by its Passr ID.
 */
export function getTaxonomyCategory(
  id: string,
): PassrCategory | undefined {
  return EXPANDED_TAXONOMY.find(
    (category) => category.id === id,
  );
}

/**
 * Match arbitrary provider/category text to the
 * closest Passr category.
 */
export function normalizeTaxonomyCategory(
  value: string | undefined,
): string | undefined {
  if (!value) return undefined;

  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9&+]+/g, " ")
    .trim();

  if (!normalized) return undefined;

  for (const category of EXPANDED_TAXONOMY) {
    if (
      category.id === normalized ||
      category.label.toLowerCase() === normalized
    ) {
      return category.id;
    }

    if (
      category.keywords.some((keyword) =>
        normalized.includes(
          keyword
            .toLowerCase()
            .replace(/[^a-z0-9&+]+/g, " ")
            .trim(),
        ),
      )
    ) {
      return category.id;
    }
  }

  return undefined;
}

/**
 * Return all categories whose keyword set overlaps
 * with a provider's title/genre/subgenre text.
 */
export function matchTaxonomyCategories(
  values: Array<string | undefined>,
): string[] {
  const text = values
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .replace(/[^a-z0-9&+]+/g, " ");

  if (!text) return [];

  const matches: string[] = [];

  for (const category of EXPANDED_TAXONOMY) {
    const matched = category.keywords.some(
      (keyword) => {
        const normalizedKeyword = keyword
          .toLowerCase()
          .replace(/[^a-z0-9&+]+/g, " ")
          .trim();

        return (
          normalizedKeyword.length > 0 &&
          text.includes(normalizedKeyword)
        );
      },
    );

    if (matched) {
      matches.push(category.id);
    }
  }

  return matches;
}

/**
 * Used by UI/category selectors.
 */
export function getTaxonomyOptions() {
  return EXPANDED_TAXONOMY.map(
    ({ id, label, description }) => ({
      id,
      label,
      description,
    }),
  );
}
