// Dynamic, deterministic seat inventory for every zone of a venue map.
// Real listings will eventually come from a provider; until then each zone
// gets stable pseudo-random listings derived from the event id + zone id,
// so prices never jump between renders.

import type { Zone } from "@/lib/venue-maps";

export type Listing = {
  id: string;
  row: string;
  /** Number of seats available in this listing */
  qty: number;
  /** Base price per ticket, before marketplace fees */
  base: number;
};

export type ZoneInventory = {
  zone: Zone;
  soldOut: boolean;
  listings: Listing[];
  /** Cheapest base price in the zone (0 when sold out) */
  from: number;
  /** 30-day average out-the-door price for the zone */
  avg30: number;
  /** Total seats available */
  seats: number;
};

function hash(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Deterministic 0..1 sequence seeded by a string. */
function rng(seed: string) {
  let s = hash(seed) || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967296;
  };
}

const ROWS = "ABCDEFGHJKLMNPQRS".split("");

export function zoneInventory(
  eventId: string,
  startingAt: number,
  zone: Zone,
  numberedRows = true,
): ZoneInventory {
  const r = rng(`${eventId}:${zone.id}`);

  // ~14% of zones have nothing left, but never the cheapest ones
  const soldOut = r() < 0.14 && zone.tier > 0.15;

  // Price scales from the event's "starting at" price up to ~4.4x for
  // the most premium zone in the house.
  const anchor = startingAt * (0.92 + zone.tier * 3.5);

  const count = soldOut ? 0 : 1 + Math.floor(r() * 4);
  const listings: Listing[] = [];
  for (let i = 0; i < count; i++) {
    const jitter = 0.86 + r() * 0.34;
    const base = Math.max(28, Math.round((anchor * jitter) / 2) * 2);
    const row = numberedRows ? String(1 + Math.floor(r() * 28)) : ROWS[Math.floor(r() * 14)]!;
    listings.push({
      id: `${zone.id}-${i}`,
      row,
      qty: 1 + Math.floor(r() * 6),
      base,
    });
  }
  listings.sort((a, b) => a.base - b.base);

  const from = listings[0]?.base ?? 0;
  const avg30 = Math.round(anchor * (1.06 + r() * 0.22));
  const seats = listings.reduce((n, l) => n + l.qty, 0);

  return { zone, soldOut, listings, from, avg30, seats };
}

/** Inventory for every zone in a layout, keyed by zone id. */
export function venueInventory(
  eventId: string,
  startingAt: number,
  zones: Zone[],
  numberedRows = true,
) {
  const map = new Map<string, ZoneInventory>();
  for (const z of zones) map.set(z.id, zoneInventory(eventId, startingAt, z, numberedRows));
  return map;
}
