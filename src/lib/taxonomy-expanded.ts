/**
 * Expanded event taxonomy for Passr discovery.
 * Structured as hierarchical: Category → Subcategory → Genre/Type
 *
 * This taxonomy is used for:
 * - onboarding preferences
 * - search category filters
 * - discovery personalization
 * - event classification
 */

export type CategoryKey = "music" | "sports" | "comedy" | "theater" | "arts" | "film" | "festivals" | "family";

export type MusicSubcategory =
  | "pop"
  | "rock"
  | "hiphop"
  | "rnb"
  | "country"
  | "electronic"
  | "jazz"
  | "classical"
  | "latin"
  | "kpop"
  | "indie"
  | "metal"
  | "folk"
  | "gospel"
  | "reggae"
  | "world";

export type SportsSubcategory =
  | "football"
  | "basketball"
  | "baseball"
  | "hockey"
  | "soccer"
  | "tennis"
  | "golf"
  | "mma"
  | "boxing"
  | "racing"
  | "volleyball"
  | "lacrosse"
  | "cricket"
  | "rugby"
  | "other";

export type ComedySubcategory = "standup" | "improv" | "sketch" | "tours" | "festivals";

export type TheaterSubcategory = "broadway" | "plays" | "musicals" | "dance" | "opera" | "touring";

export type ArtsSubcategory = "museums" | "galleries" | "exhibitions" | "lectures" | "cultural" | "performances";

export type FilmSubcategory = "festivals" | "screenings" | "documentaries" | "anime" | "conventions";

export type FestivalSubcategory = "music" | "food" | "cultural" | "arts" | "film" | "comedy" | "family";

export type FamilySubcategory = "shows" | "theater" | "festivals" | "educational" | "attractions";

export interface CategoryNode {
  key: string;
  label: string;
  subcategories: {
    key: string;
    label: string;
    genres?: string[];
  }[];
}

export const EXPANDED_TAXONOMY: Record<CategoryKey, CategoryNode> = {
  music: {
    key: "music",
    label: "Music",
    subcategories: [
      { key: "pop", label: "Pop" },
      { key: "rock", label: "Rock", genres: ["Alternative", "Indie", "Hard Rock", "Classic Rock", "Punk"] },
      { key: "hiphop", label: "Hip-Hop / Rap", genres: ["Trap", "Drill", "Underground"] },
      { key: "rnb", label: "R&B / Soul", genres: ["Neo-Soul", "Funk", "Disco"] },
      { key: "country", label: "Country", genres: ["Americana", "Bluegrass", "Singer-Songwriter"] },
      { key: "electronic", label: "Electronic", genres: ["EDM", "House", "Techno", "Drum & Bass", "Dubstep"] },
      { key: "jazz", label: "Jazz & Blues", genres: ["Jazz", "Blues", "Big Band"] },
      { key: "classical", label: "Classical", genres: ["Orchestral", "Opera", "Chamber Music"] },
      { key: "latin", label: "Latin", genres: ["Reggaeton", "Salsa", "Bachata", "Cumbia"] },
      { key: "kpop", label: "K-Pop" },
      { key: "reggae", label: "Reggae & Caribbean", genres: ["Dancehall", "Ska"] },
      { key: "world", label: "World Music", genres: ["African", "Asian", "Celtic", "Middle Eastern"] },
      { key: "gospel", label: "Gospel & Spiritual" },
      { key: "metal", label: "Metal", genres: ["Heavy Metal", "Hardcore"] },
      { key: "folk", label: "Folk" },
      { key: "indie", label: "Indie & Alternative" },
    ],
  },

  sports: {
    key: "sports",
    label: "Sports",
    subcategories: [
      { key: "football", label: "Football", genres: ["NFL", "College Football", "Indoor"] },
      { key: "basketball", label: "Basketball", genres: ["NBA", "WNBA", "College", "G League"] },
      { key: "baseball", label: "Baseball", genres: ["MLB", "Minor League", "College"] },
      { key: "hockey", label: "Hockey", genres: ["NHL", "College", "PWHL"] },
      { key: "soccer", label: "Soccer", genres: ["MLS", "NWSL", "USL", "International", "World Cup"] },
      { key: "tennis", label: "Tennis", genres: ["ATP", "WTA", "Grand Slams", "Exhibitions"] },
      { key: "golf", label: "Golf", genres: ["PGA", "LPGA", "Majors"] },
      { key: "mma", label: "MMA & Fighting", genres: ["UFC", "Wrestling", "Boxing"] },
      { key: "boxing", label: "Boxing" },
      { key: "racing", label: "Racing", genres: ["NASCAR", "Formula 1", "IndyCar", "Horse Racing"] },
      { key: "volleyball", label: "Volleyball", genres: ["Professional", "Beach Volleyball"] },
      { key: "lacrosse", label: "Lacrosse", genres: ["MLL", "NLL", "College"] },
      { key: "cricket", label: "Cricket" },
      { key: "rugby", label: "Rugby" },
      { key: "other", label: "Other Sports", genres: ["Cycling", "Skateboarding", "Esports", "Track & Field"] },
    ],
  },

  comedy: {
    key: "comedy",
    label: "Comedy",
    subcategories: [
      { key: "standup", label: "Stand-Up Comedy" },
      { key: "improv", label: "Improv & Sketch" },
      { key: "sketch", label: "Sketch Comedy" },
      { key: "tours", label: "Comedy Tours" },
      { key: "festivals", label: "Comedy Festivals" },
    ],
  },

  theater: {
    key: "theater",
    label: "Theater & Performance",
    subcategories: [
      { key: "broadway", label: "Broadway & Off-Broadway" },
      { key: "plays", label: "Plays & Musicals" },
      { key: "musicals", label: "Musicals" },
      { key: "dance", label: "Dance & Ballet" },
      { key: "opera", label: "Opera" },
      { key: "touring", label: "Touring Productions" },
    ],
  },

  arts: {
    key: "arts",
    label: "Arts & Culture",
    subcategories: [
      { key: "museums", label: "Museums & Exhibitions" },
      { key: "galleries", label: "Galleries & Exhibits" },
      { key: "exhibitions", label: "Art Exhibitions" },
      { key: "lectures", label: "Lectures & Talks" },
      { key: "cultural", label: "Cultural Events" },
      { key: "performances", label: "Performances & Readings" },
    ],
  },

  film: {
    key: "film",
    label: "Film & Media",
    subcategories: [
      { key: "festivals", label: "Film Festivals" },
      { key: "screenings", label: "Special Screenings" },
      { key: "documentaries", label: "Documentaries" },
      { key: "anime", label: "Anime & Animation" },
      { key: "conventions", label: "Conventions & Events" },
    ],
  },

  festivals: {
    key: "festivals",
    label: "Festivals",
    subcategories: [
      { key: "music", label: "Music Festivals" },
      { key: "food", label: "Food & Wine Festivals" },
      { key: "cultural", label: "Cultural Festivals" },
      { key: "arts", label: "Arts Festivals" },
      { key: "film", label: "Film Festivals" },
      { key: "comedy", label: "Comedy Festivals" },
      { key: "family", label: "Family Festivals" },
    ],
  },

  family: {
    key: "family",
    label: "Family Events",
    subcategories: [
      { key: "shows", label: "Family Shows" },
      { key: "theater", label: "Children's Theater" },
      { key: "festivals", label: "Family Festivals" },
      { key: "educational", label: "Educational Events" },
      { key: "attractions", label: "Interactive Attractions" },
    ],
  },
};

export function getCategoryLabel(key: CategoryKey): string {
  return EXPANDED_TAXONOMY[key]?.label ?? key;
}

export function getSubcategoryLabel(category: CategoryKey, subKey: string): string {
  const sub = EXPANDED_TAXONOMY[category]?.subcategories?.find((s) => s.key === subKey);
  return sub?.label ?? subKey;
}

export function getAllSubcategories(category: CategoryKey): Array<{ key: string; label: string }> {
  return (
    EXPANDED_TAXONOMY[category]?.subcategories?.map((s) => ({ key: s.key, label: s.label })) ?? []
  );
}
