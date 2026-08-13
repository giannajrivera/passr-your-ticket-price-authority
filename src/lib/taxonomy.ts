/**
 * Passr's internal, provider-agnostic preference taxonomy.
 *
 * This is Passr's OWN vocabulary. It deliberately contains no Ticketmaster /
 * Eventbrite identifiers — provider mapping lives outside this file so the
 * taxonomy can be expanded without touching any integration code.
 *
 * Shape: category -> group (subcategory) -> option (genre / league / event type)
 *   -> optional sub-option (subgenre / competition).
 *
 * Every node has a stable dotted path id, e.g.
 *   "sports.basketball.ncaa-womens-basketball"
 * which is what gets persisted in the user's preference profile.
 *
 * To add anything later: drop a string (or `[label, [children]]`) into the
 * right group. Nothing else needs to change.
 */

export type Gender = "mens" | "womens" | "coed" | "unspecified";

export type TaxonomyNode = {
  /** Full dotted path, unique across the taxonomy. */
  id: string;
  label: string;
  /** Depth 0 = category, 1 = group, 2 = option, 3 = sub-option. */
  depth: number;
  gender: Gender;
  children: TaxonomyNode[];
};

export type TaxonomyCategory = TaxonomyNode & { blurb: string; emoji: string };

/** Raw authoring format: "Label" or ["Label", [children...]] */
type Raw = string | [string, RawList];
type RawList = Raw[];

export function slugify(label: string): string {
  return label
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Gender is inferred from the label rather than hand-annotated on hundreds of
 * nodes, so new entries automatically classify. Sports/labels with no gender
 * signal stay "unspecified" — we never force gender where it makes no sense.
 */
export function inferGender(label: string): Gender {
  const l = label.toLowerCase();
  if (/\bwomen'?s\b|\bwomen\b|\bwnba\b|\bnwsl\b|\blpga\b|\bpwhl\b|femenil|solheim|billie jean/.test(l))
    return "womens";
  if (/\bmen'?s\b|\bnba\b|\bnfl\b|\bmlb\b|\bnhl\b|\bmls\b|\bpga\b|\batp\b|ryder/.test(l)) return "mens";
  if (/\bco-?ed\b|\bmixed\b/.test(l)) return "coed";
  return "unspecified";
}

function build(raw: Raw, parentId: string, depth: number): TaxonomyNode {
  const label = typeof raw === "string" ? raw : raw[0];
  const kids: RawList = typeof raw === "string" ? [] : raw[1];
  const id = `${parentId}.${slugify(label)}`;
  return {
    id,
    label,
    depth,
    gender: inferGender(label),
    children: kids.map((k) => build(k, id, depth + 1)),
  };
}

function category(id: string, label: string, emoji: string, blurb: string, groups: RawList): TaxonomyCategory {
  return {
    id,
    label,
    depth: 0,
    gender: "unspecified",
    emoji,
    blurb,
    children: groups.map((g) => build(g, id, 1)),
  };
}

/* ------------------------------------------------------------------ MUSIC */

const MUSIC: RawList = [
  ["Pop & R&B", ["Pop", "R&B", "Soul", "Funk", "Disco", "Contemporary", "Vocal"]],
  ["Hip-Hop", ["Hip-Hop / Rap", "Trap", "Drill", "Underground Hip-Hop"]],
  [
    "Rock & Alternative",
    ["Rock", "Alternative", "Indie", "Punk", "Emo", "Metal", "Hard Rock", "Classic Rock", "Experimental"],
  ],
  [
    "Country & Folk",
    ["Country", "Americana", "Bluegrass", "Folk", "Singer-Songwriter", "Acoustic"],
  ],
  ["Jazz & Blues", ["Jazz", "Blues", "Big Band", "Swing"]],
  [
    "Latin",
    ["Latin", "Reggaeton", "Salsa", "Bachata", "Merengue", "Cumbia", "Regional Mexican", "Corridos"],
  ],
  [
    "Caribbean & African",
    ["Reggae", "Ska", "Dancehall", "Afrobeats", "Afropop", "Amapiano", "Soca"],
  ],
  ["Asian Pop", ["K-Pop", "J-Pop", "C-Pop"]],
  ["Global", ["World Music", "Celtic", "Flamenco", "Bollywood", "Middle Eastern"]],
  [
    "Electronic",
    [
      "Electronic",
      "EDM",
      ["House", ["House", "Deep House", "Tech House", "Progressive House"]],
      "Trance",
      "Techno",
      "Dubstep",
      "Drum & Bass",
      "Garage",
      "Nu-Disco",
      "Ambient",
    ],
  ],
  ["Classical & Choral", ["Classical", "Orchestral", "Opera", "Choir", "Chamber Music"]],
  ["Spiritual", ["Gospel", "Christian", "Worship"]],
  [
    "Live Formats",
    ["Live Bands", "DJ Events", "Tribute / Cover Shows", "Residencies", "Acoustic Sessions", "Music Festivals"],
  ],
  ["Other Music", ["Other Music"]],
];

/* ----------------------------------------------------------------- SPORTS */

const SPORTS: RawList = [
  [
    "Football",
    [
      "NFL",
      "College Football",
      "CFL",
      "UFL",
      "Indoor Football",
      "Arena Football",
      "Flag Football",
      "Women's Football",
      "International Football",
      "Other Football",
    ],
  ],
  [
    "Basketball",
    [
      "NBA",
      "WNBA",
      "NCAA Men's Basketball",
      "NCAA Women's Basketball",
      "G League",
      "BIG3",
      "International Men's Basketball",
      "International Women's Basketball",
      "Other Basketball",
    ],
  ],
  [
    "Baseball",
    [
      "MLB",
      "MiLB",
      "College Baseball",
      "Women's Baseball",
      "International Baseball",
      "Independent Baseball",
      "Other Baseball",
    ],
  ],
  [
    "Soccer",
    [
      "MLS",
      "NWSL",
      "USL",
      "USL Super League",
      "NCAA Men's Soccer",
      "NCAA Women's Soccer",
      "Premier League",
      "Women's Super League",
      "UEFA Champions League",
      "UEFA Women's Champions League",
      "La Liga",
      "Serie A",
      "Bundesliga",
      "Ligue 1",
      "Liga MX",
      "Liga MX Femenil",
      "International Men's Soccer",
      "International Women's Soccer",
      "World Cup",
      "Women's World Cup",
      "CONCACAF",
      "Copa América",
      "Other Soccer",
    ],
  ],
  [
    "Hockey",
    [
      "NHL",
      "AHL",
      "ECHL",
      "NCAA Men's Hockey",
      "NCAA Women's Hockey",
      "PWHL",
      "International Men's Hockey",
      "International Women's Hockey",
      "World Championship",
      "Other Hockey",
    ],
  ],
  [
    "Tennis",
    [
      "ATP",
      "WTA",
      "Grand Slam",
      "US Open",
      "Wimbledon",
      "Australian Open",
      "French Open",
      "Davis Cup",
      "Billie Jean King Cup",
      "College Tennis",
      "Other Tennis",
    ],
  ],
  [
    "Golf",
    [
      "PGA Tour",
      "LPGA",
      "LIV Golf",
      "PGA Championship",
      "U.S. Open",
      "The Open Championship",
      "Masters",
      "Ryder Cup",
      "Solheim Cup",
      "College Golf",
      "Other Golf",
    ],
  ],
  [
    "Combat Sports",
    [
      "UFC",
      "MMA",
      "Boxing",
      "Women's Boxing",
      "Wrestling",
      "WWE",
      "AEW",
      "TNA",
      "Professional Wrestling",
      "College Wrestling",
      "Olympic Wrestling",
      "Muay Thai",
      "Kickboxing",
      "Karate",
      "Judo",
      "Brazilian Jiu-Jitsu",
      "Other Combat Sports",
    ],
  ],
  [
    "Motorsports",
    [
      "Formula 1",
      "IndyCar",
      "NASCAR",
      "IMSA",
      "MotoGP",
      "Supercross",
      "Motocross",
      "NHRA",
      "Rally",
      "Rallycross",
      "Formula E",
      "Off-road Racing",
      "Truck Racing",
      "Motorcycle Racing",
      "Other Motorsports",
    ],
  ],
  [
    "Volleyball",
    [
      "NCAA Women's Volleyball",
      "NCAA Men's Volleyball",
      "Professional Women's Volleyball",
      "Professional Men's Volleyball",
      "Beach Volleyball",
      "International Volleyball",
      "Other Volleyball",
    ],
  ],
  [
    "Gymnastics",
    [
      "NCAA Women's Gymnastics",
      "NCAA Men's Gymnastics",
      "Artistic Gymnastics",
      "Rhythmic Gymnastics",
      "Trampoline",
      "Olympic Gymnastics",
      "Other Gymnastics",
    ],
  ],
  [
    "Swimming & Aquatics",
    [
      "Swimming",
      "Diving",
      "Water Polo",
      "Artistic Swimming",
      "NCAA Swimming",
      "Olympic Swimming",
      "Other Aquatics",
    ],
  ],
  [
    "Track & Field",
    [
      "Track",
      "Field",
      "Cross Country",
      "NCAA Track & Field",
      "Olympic Track & Field",
      "Marathons",
      "Road Racing",
      "Other Track & Field",
    ],
  ],
  [
    "Cycling",
    ["Road Cycling", "Track Cycling", "BMX", "Mountain Biking", "Cyclocross", "International Cycling", "Other Cycling"],
  ],
  ["Skating", ["Figure Skating", "Speed Skating", "Short Track", "Roller Derby", "Ice Shows", "Other Skating"]],
  [
    "Winter Sports",
    [
      "Skiing",
      "Alpine Skiing",
      "Freestyle Skiing",
      "Snowboarding",
      "Ski Jumping",
      "Biathlon",
      "Bobsled",
      "Luge",
      "Skeleton",
      "Curling",
      "Winter X Games",
      "Other Winter Sports",
    ],
  ],
  [
    "Water Sports",
    ["Surfing", "Sailing", "Rowing", "Kayaking", "Canoeing", "Paddle Sports", "Water Skiing", "Other Water Sports"],
  ],
  [
    "Equestrian",
    [
      "Horse Racing",
      "Thoroughbred Racing",
      "Harness Racing",
      "Dressage",
      "Show Jumping",
      "Eventing",
      "Polo",
      "Other Equestrian",
    ],
  ],
  ["Rodeo", ["Professional Rodeo", "Bull Riding", "Barrel Racing", "Other Rodeo"]],
  [
    "Lacrosse",
    ["PLL", "NLL", "NCAA Men's Lacrosse", "NCAA Women's Lacrosse", "International Lacrosse", "Other Lacrosse"],
  ],
  ["Cricket", ["International Cricket", "T20", "Test Cricket", "Major League Cricket", "Other Cricket"]],
  [
    "Rugby",
    ["Rugby Union", "Rugby League", "International Rugby", "Women's Rugby", "College Rugby", "Other Rugby"],
  ],
  [
    "Field Sports",
    ["Field Hockey", "NCAA Field Hockey", "Women's Field Hockey", "Men's Field Hockey", "Other Field Sports"],
  ],
  ["Other Sports", ["Esports", "Darts", "Bowling", "Pickleball", "Softball", "Handball", "Other Sports"]],
];

/* ------------------------------------------------------------ EVERYTHING ELSE */

export const taxonomy: TaxonomyCategory[] = [
  category("music", "Music", "🎵", "Concerts, tours, DJs and residencies", MUSIC),
  category("sports", "Sports", "🏟️", "Pro, college, international and niche", SPORTS),
  category("comedy", "Comedy", "🎤", "Stand-up, improv and live podcasts", [
    [
      "Comedy",
      [
        "Stand-up",
        "Comedy Tours",
        "Improv",
        "Sketch Comedy",
        "Comedy Theater",
        "Live Podcasts",
        "Comedy Festivals",
        "Roast Shows",
        "Open Mic",
        "Other Comedy",
      ],
    ],
  ]),
  category("theater", "Theater & Musicals", "🎭", "Broadway, plays and touring shows", [
    [
      "Theater",
      [
        "Broadway",
        "Off-Broadway",
        "Touring Broadway",
        "Musicals",
        "Plays",
        "Shakespeare",
        "Experimental Theater",
        "Children's Theater",
        "Dinner Theater",
        "Immersive Theater",
        "Theater Festivals",
        "Other Theater",
      ],
    ],
  ]),
  category("dance", "Dance & Performing Arts", "🩰", "Ballet, contemporary and cirque", [
    [
      "Dance",
      [
        "Ballet",
        "Contemporary Dance",
        "Modern Dance",
        "Hip-Hop Dance",
        "Tap",
        "Ballroom",
        "Cultural Dance",
        "Dance Festivals",
        "Cirque / Acrobatics",
        "Performing Arts",
        "Other Dance",
      ],
    ],
  ]),
  category("festivals", "Festivals", "🎪", "Multi-day and single-day festivals", [
    [
      "Festivals",
      [
        "Music Festivals",
        "Food Festivals",
        "Cultural Festivals",
        "Film Festivals",
        "Art Festivals",
        "Comedy Festivals",
        "Pride / Community Festivals",
        "Seasonal Festivals",
        "Holiday Festivals",
        "Beer / Wine / Spirits Events",
        "Gaming Festivals",
        "Technology Festivals",
        "Other Festivals",
      ],
    ],
  ]),
  category("family", "Family & Kids", "🎠", "Shows the whole crew can go to", [
    [
      "Family",
      [
        "Children's Theater",
        "Family Concerts",
        "Disney / Character Shows",
        "Sesame Street / Children's Shows",
        "Circus",
        "Magic Shows",
        "Family Sports",
        "Monster Trucks",
        "Family Festivals",
        "Zoos / Animal Experiences",
        "Educational Events",
        "Other Family Events",
      ],
    ],
  ]),
  category("nightlife", "Nightlife", "🌙", "Clubs, DJ sets and day parties", [
    [
      "Nightlife",
      [
        "DJ Events",
        "Club Events",
        "Dance Parties",
        "House Music",
        "Techno",
        "EDM",
        "Hip-Hop Nights",
        "Latin Nights",
        "Reggaeton Nights",
        "R&B Nights",
        "Themed Parties",
        "Rooftop Events",
        "Day Parties",
        "Pool Parties",
        "Silent Discos",
        "Live Music Nights",
        "Other Nightlife",
      ],
    ],
  ]),
  category("arts-culture", "Arts & Culture", "🖼️", "Museums, talks and exhibitions", [
    [
      "Arts & Culture",
      [
        "Museums",
        "Gallery Events",
        "Art Exhibitions",
        "Cultural Events",
        "Lectures",
        "Author Events",
        "Book Events",
        "Poetry",
        "Spoken Word",
        "Cultural Performances",
        "Heritage Events",
        "Other Arts & Culture",
      ],
    ],
  ]),
  category("film-media", "Film & Media", "🎬", "Screenings, Q&As and live tapings", [
    [
      "Film & Media",
      [
        "Film Festivals",
        "Movie Screenings",
        "Special Screenings",
        "Director Q&As",
        "Actor Q&As",
        "Live Podcast Recordings",
        "Television Events",
        "Media Conventions",
        "Other Film & Media",
      ],
    ],
  ]),
  category("food-drink", "Food & Drink", "🍷", "Tastings, chef nights and food fests", [
    [
      "Food & Drink",
      [
        "Food Festivals",
        "Restaurant Events",
        "Tastings",
        "Cooking Classes",
        "Chef Events",
        "Food Tours",
        "Wine Events",
        "Beer Events",
        "Cocktail Events",
        "Coffee Events",
        "Culinary Festivals",
        "Other Food & Drink",
      ],
    ],
  ]),
  category("conventions", "Conventions & Fan Events", "🦸", "Comic, anime and gaming cons", [
    [
      "Conventions",
      [
        "Comic Conventions",
        "Anime Conventions",
        "Gaming Conventions",
        "Horror Conventions",
        "Sci-Fi Conventions",
        "Fan Conventions",
        "Book Conventions",
        "Sports Conventions",
        "Collectibles",
        "Cosplay",
        "Other Conventions",
      ],
    ],
  ]),
  category("experiences", "Experiences & Attractions", "🎡", "Immersive, seasonal and pop-ups", [
    [
      "Experiences",
      [
        "Immersive Experiences",
        "Escape Rooms",
        "Theme Parks",
        "Water Parks",
        "Haunted Attractions",
        "Seasonal Attractions",
        "Pop-Ups",
        "Interactive Exhibits",
        "Other Experiences",
      ],
    ],
  ]),
  category("community", "Community & Local", "📍", "Street fairs, parades and benefits", [
    [
      "Community",
      [
        "Street Fairs",
        "Farmers Markets",
        "Local Festivals",
        "Parades",
        "Holiday Events",
        "Community Events",
        "Charity Events",
        "Fundraisers",
        "Educational Events",
        "Other Community Events",
      ],
    ],
  ]),
  category("other", "Other", "✨", "Anything else that's ticketed", [
    ["Other", ["Other Ticketed Events", "Surprise Me"]],
  ]),
];

/* --------------------------------------------------------------- LOOKUPS */

const index = new Map<string, TaxonomyNode>();
(function walk(nodes: TaxonomyNode[]) {
  for (const n of nodes) {
    index.set(n.id, n);
    walk(n.children);
  }
})(taxonomy);

export function getNode(id: string): TaxonomyNode | undefined {
  return index.get(id);
}

export function labelFor(id: string): string {
  return index.get(id)?.label ?? id;
}

export function categoryOf(id: string): TaxonomyCategory | undefined {
  const root = id.split(".")[0];
  return taxonomy.find((c) => c.id === root);
}

/** Every descendant leaf/option id under a node (excluding the node itself). */
export function descendantIds(id: string): string[] {
  const node = index.get(id);
  if (!node) return [];
  const out: string[] = [];
  const stack = [...node.children];
  while (stack.length) {
    const n = stack.pop()!;
    out.push(n.id);
    stack.push(...n.children);
  }
  return out;
}
