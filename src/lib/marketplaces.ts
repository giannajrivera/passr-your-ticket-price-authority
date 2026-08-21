/**
 * Passr marketplace utilities.
 *
 * IMPORTANT:
 * A marketplace is only shown when Passr has a verified,
 * event-specific purchase URL.
 *
 * We NEVER manufacture marketplace search URLs.
 */

export type MarketplaceName =
  | "Ticketmaster"
  | "TicketWeb"
  | "Universe"
  | "Front Gate Tickets"
  | "SeatGeek"
  | "StubHub"
  | "Vivid Seats"
  | "TickPick"
  | "AXS"
  | "Eventbrite"
  | "DICE"
  | "Partiful"
  | "Posh"
  | "Other";

export type MarketplaceLink = {
  name: MarketplaceName;
  url: string;
  verified: boolean;
};

const MARKETPLACE_HOSTS: Array<{
  name: MarketplaceName;
  hosts: string[];
}> = [
  {
    name: "Ticketmaster",
    hosts: [
      "ticketmaster.com",
      "www.ticketmaster.com",
      "ticketmaster.ca",
      "www.ticketmaster.ca",
    ],
  },
  {
    name: "TicketWeb",
    hosts: [
      "ticketweb.com",
      "www.ticketweb.com",
    ],
  },
  {
    name: "Universe",
    hosts: [
      "universe.com",
      "www.universe.com",
    ],
  },
  {
    name: "Front Gate Tickets",
    hosts: [
      "frontgatetickets.com",
      "www.frontgatetickets.com",
    ],
  },
  {
    name: "SeatGeek",
    hosts: [
      "seatgeek.com",
      "www.seatgeek.com",
    ],
  },
  {
    name: "StubHub",
    hosts: [
      "stubhub.com",
      "www.stubhub.com",
    ],
  },
  {
    name: "Vivid Seats",
    hosts: [
      "vividseats.com",
      "www.vividseats.com",
    ],
  },
  {
    name: "TickPick",
    hosts: [
      "tickpick.com",
      "www.tickpick.com",
    ],
  },
  {
    name: "AXS",
    hosts: [
      "axs.com",
      "www.axs.com",
    ],
  },
  {
    name: "Eventbrite",
    hosts: [
      "eventbrite.com",
      "www.eventbrite.com",
    ],
  },
  {
    name: "DICE",
    hosts: [
      "dice.fm",
      "www.dice.fm",
    ],
  },
  {
    name: "Partiful",
    hosts: [
      "partiful.com",
      "www.partiful.com",
    ],
  },
  {
    name: "Posh",
    hosts: [
      "posh.vip",
      "www.posh.vip",
    ],
  },
];

function normalizeHost(hostname: string) {
  return hostname
    .toLowerCase()
    .replace(/^www\./, "");
}

/**
 * Determines which marketplace owns a verified event URL.
 */
export function identifyMarketplace(
  url: string | undefined,
): MarketplaceName | undefined {
  if (!url) {
    return undefined;
  }

  try {
    const parsed = new URL(url);
    const hostname = normalizeHost(
      parsed.hostname,
    );

    const match = MARKETPLACE_HOSTS.find(
      (marketplace) =>
        marketplace.hosts.some(
          (host) =>
            normalizeHost(host) ===
            hostname,
        ),
    );

    return match?.name;
  } catch {
    return undefined;
  }
}

/**
 * Only accepts real absolute HTTP(S) URLs.
 */
export function isValidMarketplaceUrl(
  url: string | undefined,
): url is string {
  if (!url) {
    return false;
  }

  try {
    const parsed = new URL(url);

    return (
      parsed.protocol === "https:" ||
      parsed.protocol === "http:"
    );
  } catch {
    return false;
  }
}

/**
 * Creates a verified marketplace link from an actual
 * event-specific purchase URL.
 *
 * Unknown domains are allowed and labeled "Other"
 * rather than being incorrectly attributed.
 */
export function marketplaceLinkFromUrl(
  url: string | undefined,
): MarketplaceLink | undefined {
  if (!isValidMarketplaceUrl(url)) {
    return undefined;
  }

  const marketplace =
    identifyMarketplace(url) ??
    "Other";

  return {
    name: marketplace,
    url,
    verified: true,
  };
}

/**
 * Removes duplicate URLs while preserving order.
 */
export function deduplicateMarketplaceLinks(
  links: MarketplaceLink[],
): MarketplaceLink[] {
  const seen = new Set<string>();

  return links.filter((link) => {
    const normalized =
      link.url.trim();

    if (!normalized) {
      return false;
    }

    const key =
      normalized.toLowerCase();

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);

    return true;
  });
}
export type EventMarketplace = {
  id: string;
  name: string;
  url: string;
  startingPrice?: number | undefined;
};

/**
 * Builds the list of verified, event-specific ticket sources.
 * Only real provider URLs are used — never generated search links.
 */
export function marketplacesForEvent(event: {
  ticketUrl?: string | undefined;
  startingAt?: number | undefined;
}): EventMarketplace[] {
  const link = marketplaceLinkFromUrl(
    event.ticketUrl,
  );

  if (!link) {
    return [];
  }

  return [
    {
      id: link.name
        .toLowerCase()
        .replace(/\s+/g, "-"),
      name: link.name,
      url: link.url,
      startingPrice: event.startingAt,
    },
  ];
}
