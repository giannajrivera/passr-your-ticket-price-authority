/**
 * Ticketmaster Discovery API provider.
 *
 * Server-only provider for live Passr event discovery.
 *
 * Responsibilities:
 * - Fetch real events from Ticketmaster
 * - Support keyword/category/genre/location searches
 * - Support geographic radius searches
 * - Normalize Ticketmaster data into PassrEvent[]
 * - Preserve useful genre/subgenre information
 * - Remove obvious non-event listings
 * - Deduplicate duplicate Ticketmaster listings
 * - Never fabricate event data
 * - Identify the actual ticket marketplace from the
 *   provider's event-specific purchase URL
 */

import {
  classifyListingType,
  deduplicateEvents,
} from "@/lib/event-utils";

import {
  marketplaceLinkFromUrl,
} from "@/lib/marketplaces";

import type {
  EventCategory,
  PassrEvent,
} from "@/lib/types";

const TICKETMASTER_EVENTS_ENDPOINT =
  "https://app.ticketmaster.com/discovery/v2/events.json";

export type TicketmasterSearchParams = {
  id?: string | undefined;

  city?: string | undefined;
  stateCode?: string | undefined;
  countryCode?: string | undefined;

  latitude?: number | undefined;
  longitude?: number | undefined;
  radius?: number | undefined;
  unit?: "miles" | "km" | undefined;

  startDateTime?: string | undefined;
  endDateTime?: string | undefined;

  keyword?: string | undefined;

  classificationName?: string | undefined;

  genre?: string | undefined;

  page?: number | undefined;

  size?: number | undefined;

  sort?: string | undefined;
};

export type TicketmasterErrorKind =
  | "missing_api_key"
  | "unauthorized"
  | "forbidden"
  | "rate_limited"
  | "server_error"
  | "network_error"
  | "malformed_response"
  | "unknown";

export type TicketmasterError = {
  kind: TicketmasterErrorKind;
  message: string;
  status?: number | undefined;
};

export type TicketmasterResult =
  | {
      ok: true;
      events: PassrEvent[];
    }
  | {
      ok: false;
      error: TicketmasterError;
    };

type ClassificationInfo = {
  segment?: string | undefined;
  genre?: string | undefined;
  subGenre?: string | undefined;
  type?: string | undefined;
};

function normalizeText(
  value: string | undefined,
): string {
  return (
    value?.trim().toLowerCase() ?? ""
  );
}

function mapCategory(
  info: ClassificationInfo,
): EventCategory {
  const segment = normalizeText(
    info.segment,
  );

  const genre = normalizeText(
    info.genre,
  );

  const subGenre = normalizeText(
    info.subGenre,
  );

  const type = normalizeText(
    info.type,
  );

  const values = new Set([
    segment,
    genre,
    subGenre,
    type,
  ]);

  const has = (
    ...needles: string[]
  ) =>
    needles.some((needle) =>
      values.has(needle),
    );

  if (
    has(
      "festival",
      "festivals",
      "music festival",
      "music festivals",
    )
  ) {
    return "Festival";
  }

  if (
    has(
      "comedy",
      "comedian",
      "comedians",
      "stand-up comedy",
      "stand up comedy",
    )
  ) {
    return "Comedy";
  }

  if (
    has(
      "nightlife",
      "club",
      "clubs",
      "dance",
      "electronic",
      "edm",
    )
  ) {
    return "Nightlife";
  }

  if (
    segment === "sports" ||
    has(
      "football",
      "basketball",
      "baseball",
      "hockey",
      "soccer",
      "tennis",
      "golf",
      "boxing",
      "mma",
      "motorsports",
      "racing",
      "wrestling",
      "volleyball",
      "cricket",
      "rugby",
      "lacrosse",
      "softball",
    )
  ) {
    return "Sports";
  }

  if (
    segment === "music" ||
    has(
      "concert",
      "concerts",
      "alternative",
      "blues",
      "country",
      "folk",
      "hip-hop",
      "hip hop",
      "jazz",
      "latin",
      "metal",
      "pop",
      "punk",
      "rap",
      "r&b",
      "reggae",
      "rock",
      "soul",
      "classical",
      "opera",
      "world",
      "indie",
      "electronic",
      "dance/electronic",
    )
  ) {
    return "Concert";
  }

  if (
    segment === "arts & theatre" ||
    segment === "theatre" ||
    segment === "theater" ||
    has(
      "theatre",
      "theater",
      "musical",
      "musicals",
      "broadway",
      "opera",
      "ballet",
      "dance",
      "performing arts",
    )
  ) {
    return "Theater";
  }

  if (
    segment === "family" ||
    has(
      "family",
      "children",
      "childrens",
      "kids",
      "family entertainment",
    )
  ) {
    return "Family";
  }

  return "Other";
}

export async function fetchTicketmasterEvents(
  params: TicketmasterSearchParams,
  apiKey: string | undefined,
): Promise<TicketmasterResult> {
  if (!apiKey) {
    return {
      ok: false,
      error: {
        kind: "missing_api_key",
        message:
          "Ticketmaster is not configured (TICKETMASTER_API_KEY is not set).",
      },
    };
  }

  const url = buildRequestUrl(
    params,
    apiKey,
  );

  let response: Response;

  try {
    response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
    });
  } catch {
    return {
      ok: false,
      error: {
        kind: "network_error",
        message:
          "Could not reach Ticketmaster.",
      },
    };
  }

  if (!response.ok) {
    return {
      ok: false,
      error: mapHttpError(
        response.status,
      ),
    };
  }

  let payload: unknown;

  try {
    payload = await response.json();
  } catch {
    return {
      ok: false,
      error: {
        kind: "malformed_response",
        message:
          "Ticketmaster returned a response that wasn't valid JSON.",
      },
    };
  }

  const rawEvents =
    extractRawEvents(payload);

  if (rawEvents === undefined) {
    return {
      ok: false,
      error: {
        kind: "malformed_response",
        message:
          "Ticketmaster's response wasn't in the expected shape.",
      },
    };
  }

  const events: PassrEvent[] = [];

  for (const raw of rawEvents) {
    const normalized =
      normalizeEvent(raw);

    if (!normalized) {
      continue;
    }

    events.push(normalized);
  }

  return {
    ok: true,
    events: deduplicateEvents(
      events,
    ),
  };
}

function buildRequestUrl(
  params: TicketmasterSearchParams,
  apiKey: string,
): string {
  const url = new URL(
    TICKETMASTER_EVENTS_ENDPOINT,
  );

  url.searchParams.set(
    "apikey",
    apiKey,
  );

  if (params.id) {
    url.searchParams.set(
      "id",
      params.id,
    );
  }

  if (params.city) {
    url.searchParams.set(
      "city",
      params.city,
    );
  }

  if (params.stateCode) {
    url.searchParams.set(
      "stateCode",
      params.stateCode,
    );
  }

  if (params.countryCode) {
    url.searchParams.set(
      "countryCode",
      params.countryCode,
    );
  }

  if (
    params.latitude !== undefined &&
    params.longitude !== undefined
  ) {
    url.searchParams.set(
      "latlong",
      `${params.latitude},${params.longitude}`,
    );

    if (
      params.radius !== undefined
    ) {
      url.searchParams.set(
        "radius",
        String(params.radius),
      );
    }

    url.searchParams.set(
      "unit",
      params.unit ?? "miles",
    );
  }

  if (params.startDateTime) {
    url.searchParams.set(
      "startDateTime",
      params.startDateTime,
    );
  }

  if (params.endDateTime) {
    url.searchParams.set(
      "endDateTime",
      params.endDateTime,
    );
  }

  if (params.keyword) {
    url.searchParams.set(
      "keyword",
      params.keyword,
    );
  }

  if (params.classificationName) {
    url.searchParams.set(
      "classificationName",
      params.classificationName,
    );
  }

  if (params.genre) {
    url.searchParams.set(
      "genreId",
      params.genre,
    );
  }

  if (params.page !== undefined) {
    url.searchParams.set(
      "page",
      String(
        Math.max(
          0,
          params.page,
        ),
      ),
    );
  }

  if (params.size !== undefined) {
    const safeSize =
      Math.min(
        Math.max(
          1,
          params.size,
        ),
        200,
      );

    url.searchParams.set(
      "size",
      String(safeSize),
    );
  } else {
    url.searchParams.set(
      "size",
      "100",
    );
  }

  if (params.sort) {
    url.searchParams.set(
      "sort",
      params.sort,
    );
  }

  return url.toString();
}

function mapHttpError(
  status: number,
): TicketmasterError {
  if (status === 401) {
    return {
      kind: "unauthorized",
      message:
        "Ticketmaster rejected the API key.",
      status,
    };
  }

  if (status === 403) {
    return {
      kind: "forbidden",
      message:
        "Ticketmaster denied access to this request.",
      status,
    };
  }

  if (status === 429) {
    return {
      kind: "rate_limited",
      message:
        "Ticketmaster rate limit was exceeded.",
      status,
    };
  }

  if (status >= 500) {
    return {
      kind: "server_error",
      message:
        "Ticketmaster is currently unavailable.",
      status,
    };
  }

  return {
    kind: "unknown",
    message:
      `Ticketmaster returned an unexpected status (${status}).`,
    status,
  };
}

function isRecord(
  value: unknown,
): value is Record<
  string,
  unknown
> {
  return (
    typeof value === "object" &&
    value !== null
  );
}

function str(
  value: unknown,
): string | undefined {
  return (
    typeof value === "string" &&
    value.trim().length > 0
  )
    ? value.trim()
    : undefined;
}

function num(
  value: unknown,
): number | undefined {
  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return value;
  }

  if (
    typeof value === "string" &&
    value.trim() !== ""
  ) {
    const parsed = Number(
      value,
    );

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return undefined;
}

function extractRawEvents(
  payload: unknown,
): unknown[] | undefined {
  if (!isRecord(payload)) {
    return undefined;
  }

  if (
    payload["_embedded"] ===
    undefined
  ) {
    return [];
  }

  if (
    !isRecord(
      payload["_embedded"],
    )
  ) {
    return undefined;
  }

  const events =
    payload["_embedded"][
      "events"
    ];

  if (events === undefined) {
    return [];
  }

  return Array.isArray(events)
    ? events
    : undefined;
}

function pickPrimaryClassification(
  classifications: Record<
    string,
    unknown
  >[],
): Record<
  string,
  unknown
> | undefined {
  return (
    classifications.find(
      (classification) =>
        classification[
          "primary"
        ] === true,
    ) ??
    classifications[0]
  );
}

function pickBestImage(
  images: unknown[],
): string | undefined {
  let best:
    | {
        url: string;
        width: number;
      }
    | undefined;

  for (const image of images) {
    if (!isRecord(image)) {
      continue;
    }

    const url = str(
      image["url"],
    );

    if (!url) {
      continue;
    }

    const width =
      num(image["width"]) ??
      0;

    if (
      !best ||
      width > best.width
    ) {
      best = {
        url,
        width,
      };
    }
  }

  return best?.url;
}

function pickStartingPrice(
  priceRanges: unknown[],
): number | undefined {
  let lowest:
    | number
    | undefined;

  for (
    const range of priceRanges
  ) {
    if (!isRecord(range)) {
      continue;
    }

    const min = num(
      range["min"],
    );

    if (min === undefined) {
      continue;
    }

    if (
      lowest === undefined ||
      min < lowest
    ) {
      lowest = min;
    }
  }

  return lowest;
}

function formatDisplayDate(
  localDate:
    | string
    | undefined,
  localTime:
    | string
    | undefined,
): string | undefined {
  if (!localDate) {
    return undefined;
  }

  const parsed = new Date(
    localTime
      ? `${localDate}T${localTime}`
      : `${localDate}T00:00:00`,
  );

  if (
    Number.isNaN(
      parsed.getTime(),
    )
  ) {
    return localDate;
  }

  const datePart =
    parsed.toLocaleDateString(
      "en-US",
      {
        weekday: "short",
        month: "short",
        day: "numeric",
      },
    );

  if (!localTime) {
    return datePart;
  }

  const timePart =
    parsed.toLocaleTimeString(
      "en-US",
      {
        hour: "numeric",
        minute: "2-digit",
      },
    );

  return `${datePart} · ${timePart}`;
}

function isLikelyAncillaryListing(
  name: string,
): boolean {
  const value =
    name.toLowerCase();

  const blockedPatterns = [
    /\bparking\b/,
    /\bparking pass\b/,
    /\bparking ticket\b/,
    /\bmerchandise\b/,
    /\bmerch\b/,
    /\bseason parking\b/,
  ];

  return blockedPatterns.some(
    (pattern) =>
      pattern.test(value),
  );
}

function normalizeEvent(
  raw: unknown,
): PassrEvent | undefined {
  if (!isRecord(raw)) {
    return undefined;
  }

  const id = str(
    raw["id"],
  );

  const name = str(
    raw["name"],
  );

  if (!id || !name) {
    return undefined;
  }

  if (
    isLikelyAncillaryListing(
      name,
    )
  ) {
    return undefined;
  }

  const classificationsRaw =
    Array.isArray(
      raw["classifications"],
    )
      ? raw[
          "classifications"
        ]
      : [];

  const classifications =
    classificationsRaw.filter(
      isRecord,
    );

  const classification =
    pickPrimaryClassification(
      classifications,
    );

  const segmentName =
    classification &&
    isRecord(
      classification[
        "segment"
      ],
    )
      ? str(
          (
            classification[
              "segment"
            ] as Record<
              string,
              unknown
            >
          )["name"],
        )
      : undefined;

  const genre =
    classification &&
    isRecord(
      classification[
        "genre"
      ],
    )
      ? str(
          (
            classification[
              "genre"
            ] as Record<
              string,
              unknown
            >
          )["name"],
        )
      : undefined;

  const subGenre =
    classification &&
    isRecord(
      classification[
        "subGenre"
      ],
    )
      ? str(
          (
            classification[
              "subGenre"
            ] as Record<
              string,
              unknown
            >
          )["name"],
        )
      : undefined;

  const classificationType =
    classification
      ? classification[
          "type"
        ]
      : undefined;

  const typeName =
    isRecord(
      classificationType,
    )
      ? str(
          classificationType[
            "name"
          ],
        )
      : undefined;

  const category =
    mapCategory({
      segment: segmentName,
      genre,
      subGenre,
      type: typeName,
    });

  const embedded =
    isRecord(
      raw["_embedded"],
    )
      ? raw["_embedded"]
      : undefined;

  const venues =
    embedded &&
    Array.isArray(
      embedded["venues"],
    )
      ? embedded[
          "venues"
        ].filter(isRecord)
      : [];

  const venue =
    venues[0];

  const attractions =
    embedded &&
    Array.isArray(
      embedded[
        "attractions"
      ],
    )
      ? embedded[
          "attractions"
        ].filter(isRecord)
      : [];

  const attraction =
    attractions[0];

  const venueName =
    venue
      ? str(
          venue["name"],
        )
      : undefined;

  const venueCity =
    venue &&
    isRecord(
      venue["city"],
    )
      ? str(
          (
            venue[
              "city"
            ] as Record<
              string,
              unknown
            >
          )["name"],
        )
      : undefined;

  const venueState =
    venue &&
    isRecord(
      venue["state"],
    )
      ? str(
          (
            venue[
              "state"
            ] as Record<
              string,
              unknown
            >
          )[
            "stateCode"
          ],
        ) ??
        str(
          (
            venue[
              "state"
            ] as Record<
              string,
              unknown
            >
          )["name"],
        )
      : undefined;

  const venueCountry =
    venue &&
    isRecord(
      venue["country"],
    )
      ? str(
          (
            venue[
              "country"
            ] as Record<
              string,
              unknown
            >
          )[
            "countryCode"
          ],
        ) ??
        str(
          (
            venue[
              "country"
            ] as Record<
              string,
              unknown
            >
          )["name"],
        )
      : undefined;

  const location =
    venue &&
    isRecord(
      venue["location"],
    )
      ? venue[
          "location"
        ]
      : undefined;

  const latitude =
    location
      ? num(
          (
            location as Record<
              string,
              unknown
            >
          )["latitude"],
        )
      : undefined;

  const longitude =
    location
      ? num(
          (
            location as Record<
              string,
              unknown
            >
          )["longitude"],
        )
      : undefined;

  const dates =
    isRecord(
      raw["dates"],
    )
      ? raw["dates"]
      : undefined;

  const start =
    dates &&
    isRecord(
      dates["start"],
    )
      ? dates["start"]
      : undefined;

  const startDateTime =
    start
      ? str(
          (
            start as Record<
              string,
              unknown
            >
          )[
            "dateTime"
          ],
        )
      : undefined;

  const localDate =
    start
      ? str(
          (
            start as Record<
              string,
              unknown
            >
          )[
            "localDate"
          ],
        )
      : undefined;

  const localTime =
    start
      ? str(
          (
            start as Record<
              string,
              unknown
            >
          )[
            "localTime"
          ],
        )
      : undefined;

  const date =
    formatDisplayDate(
      localDate,
      localTime,
    ) ??
    localDate ??
    "Date to be announced";

  const images =
    Array.isArray(
      raw["images"],
    )
      ? raw["images"]
      : [];

  const image =
    pickBestImage(
      images,
    ) ?? "";

  const priceRanges =
    Array.isArray(
      raw["priceRanges"],
    )
      ? raw["priceRanges"]
      : [];

  const startingAt =
    pickStartingPrice(
      priceRanges,
    );

  const description =
    str(
      raw["info"],
    ) ??
    str(
      raw["pleaseNote"],
    );

  /**
   * IMPORTANT:
   * This is the actual event URL returned
   * by Ticketmaster.
   *
   * It may point to Ticketmaster,
   * TicketWeb, Universe, etc.
   */
  const ticketUrl =
    str(raw["url"]);

  /**
   * Determine the actual marketplace from
   * that event-specific URL.
   */
  const marketplace =
    marketplaceLinkFromUrl(
      ticketUrl,
    );

  const event: PassrEvent = {
    id: `ticketmaster-${id}`,

    source: "ticketmaster",

    sourceEventId: id,

    name,

    subtitle:
      attraction
        ? str(
            attraction[
              "name"
            ],
          )
        : undefined,

    description,

    category,

    genre,

    subGenre,

    date,

    startDateTime,

    venue:
      venueName ??
      "Venue to be announced",

    city:
      venueCity ?? "",

    state:
      venueState,

    country:
      venueCountry,

    latitude,

    longitude,

    image,

    startingAt,

    trending: false,

    /**
     * Actual provider event URL.
     */
    ticketUrl,

    /**
     * Actual marketplace owning that URL.
     *
     * Example:
     * ticketweb.com/... → TicketWeb
     * ticketmaster.com/... → Ticketmaster
     * universe.com/... → Universe
     */
    ticketMarketplace:
      marketplace?.name,

    listingType:
      classifyListingType(name),
  };

  return event;
}