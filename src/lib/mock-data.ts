import concertImg from "@/assets/event-concert.jpg";
import sportsImg from "@/assets/event-sports.jpg";
import theaterImg from "@/assets/event-theater.jpg";
import type { PassrEvent } from "@/lib/types";

export type Marketplace = "StubHub" | "SeatGeek" | "Vivid Seats" | "Ticketmaster";

// Mock-only, Passr-side ticket-analysis data. Real event providers don't
// supply this — see TicketMarketData in @/lib/types for the shape this will
// eventually map to once a real pricing source is connected.
export type Section = {
  id: string;
  name: string;
  base: number; // base price per ticket
  avg30: number; // 30-day average out-the-door price
  zone: string; // id of the matching zone on the venue map
};

// The mock app's working event shape: Passr's shared core event identity
// (see @/lib/types) plus the mock-only section/pricing data that real event
// APIs don't provide. Keeping these composed rather than merged is what lets
// PassrEvent stay accurate once a real provider is connected.
export type MockPassrEvent = PassrEvent & {
  sections: Section[];
};

// Fee rates per marketplace (15–25% of base price)
export const FEE_RATES: Record<Marketplace, number> = {
  StubHub: 0.19,
  SeatGeek: 0.16,
  "Vivid Seats": 0.23,
  Ticketmaster: 0.25,
};

export const MARKETPLACES = Object.keys(FEE_RATES) as Marketplace[];

// Small deterministic per-marketplace base-price spread
const BASE_SPREAD: Record<Marketplace, number> = {
  StubHub: 1.0,
  SeatGeek: 1.04,
  "Vivid Seats": 0.97,
  Ticketmaster: 1.08,
};

export type Quote = {
  marketplace: Marketplace;
  base: number;
  fees: number;
  total: number;
};

export function quotesFor(section: Section): Quote[] {
  return MARKETPLACES.map((m) => {
    const base = Math.round(section.base * BASE_SPREAD[m]);
    const fees = Math.round(base * FEE_RATES[m]);
    return { marketplace: m, base, fees, total: base + fees };
  }).sort((a, b) => a.total - b.total);
}

export const events: MockPassrEvent[] = [
  {
    id: "nova-quinn",
    source: "mock",
    sourceEventId: "nova-quinn",
    name: "Nova Quinn — Afterglow Tour",
    subtitle: "with Rowan Vale",
    category: "Concert",
    date: "Fri, Sep 18 · 8:00 PM",
    venue: "Madison Square Garden",
    city: "New York, NY",
    image: concertImg,
    startingAt: 86,
    trending: true,
    sections: [
      { id: "floor-a", name: "Floor A · Row 12", base: 296, avg30: 402 , zone: "floor-a" },
      { id: "100-level", name: "Section 112 · Row 8", base: 168, avg30: 191 , zone: "ring1-2" },
      { id: "200-level", name: "Section 214 · Row 3", base: 118, avg30: 129 , zone: "ring2-4" },
      { id: "upper", name: "Section 320 · Row 15", base: 74, avg30: 71 , zone: "ring3-8" },
    ],
  },
  {
    id: "harbor-city-fc",
    source: "mock",
    sourceEventId: "harbor-city-fc",
    name: "Harbor City FC vs. Cascade United",
    subtitle: "Regular season",
    category: "Sports",
    date: "Sat, Sep 26 · 1:30 PM",
    venue: "Anchor Field",
    city: "Seattle, WA",
    image: sportsImg,
    startingAt: 52,
    trending: true,
    sections: [
      { id: "midfield", name: "Midfield 108 · Row 6", base: 214, avg30: 236 , zone: "lower-9" },
      { id: "corner", name: "Corner 132 · Row 11", base: 112, avg30: 104 , zone: "lower-1" },
      { id: "supporters", name: "Supporters 214 · Row 4", base: 68, avg30: 79 , zone: "club-4" },
      { id: "upper-end", name: "Upper End 330 · Row 20", base: 45, avg30: 44 , zone: "upper-12" },
    ],
  },
  {
    id: "the-winter-room",
    source: "mock",
    sourceEventId: "the-winter-room",
    name: "The Winter Room",
    subtitle: "Broadway revival",
    category: "Theater",
    date: "Thu, Oct 2 · 7:30 PM",
    venue: "Belmore Theatre",
    city: "New York, NY",
    image: theaterImg,
    startingAt: 63,
    trending: false,
    sections: [
      { id: "orchestra", name: "Orchestra · Row F", base: 262, avg30: 249 , zone: "orch-2" },
      { id: "mezzanine", name: "Mezzanine · Row C", base: 154, avg30: 178 , zone: "mezz-1" },
      { id: "balcony", name: "Balcony · Row J", base: 58, avg30: 61 , zone: "balc-3" },
    ],
  },
  {
    id: "arlo-mane",
    source: "mock",
    sourceEventId: "arlo-mane",
    name: "Arlo Mane — Slow Static",
    subtitle: "Solo acoustic",
    category: "Concert",
    date: "Wed, Oct 15 · 8:30 PM",
    venue: "The Fillmore",
    city: "San Francisco, CA",
    image: concertImg,
    startingAt: 41,
    trending: true,
    sections: [
      { id: "ga-pit", name: "GA Pit", base: 132, avg30: 121 , zone: "floor-a" },
      { id: "balcony-seats", name: "Balcony · Row D", base: 88, avg30: 96 , zone: "ring2-6" },
      { id: "rear-ga", name: "Rear GA", base: 40, avg30: 43 , zone: "floor-c" },
    ],
  },
  {
    id: "north-stars",
    source: "mock",
    sourceEventId: "north-stars",
    name: "North Stars vs. Iron District",
    subtitle: "Home opener",
    category: "Sports",
    date: "Tue, Oct 21 · 7:00 PM",
    venue: "Granite Arena",
    city: "Chicago, IL",
    image: sportsImg,
    startingAt: 74,
    trending: false,
    sections: [
      { id: "courtside", name: "Courtside · Row 2", base: 386, avg30: 351 , zone: "lower-6" },
      { id: "lower-bowl", name: "Lower Bowl 104 · Row 9", base: 182, avg30: 205 , zone: "lower-2" },
      { id: "upper-bowl", name: "Upper Bowl 312 · Row 14", base: 72, avg30: 77 , zone: "upper-5" },
    ],
  },
];

export function getEvent(id: string) {
  return events.find((e) => e.id === id);
}

export const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
