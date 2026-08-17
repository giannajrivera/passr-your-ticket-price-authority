import { useSyncExternalStore } from "react";
import type { PassrEvent } from "@/lib/types";

export type SavedEvent = {
  id: string;
  name: string;
  date: string;
  venue: string;
  city?: string;
  state?: string;
  category: PassrEvent["category"];
  subtitle?: string;
  image?: string;
  ticketUrl?: string;
};

export type WatchItem = {
  eventId: string;
  savedPrice: number;
  currentPrice: number;
  notify: boolean;
  event?: SavedEvent;
};

const KEY = "passr.watchlist.v1";

const seed: WatchItem[] = [
  { eventId: "nova-quinn", savedPrice: 214, currentPrice: 198, notify: true },
  { eventId: "harbor-city-fc", savedPrice: 118, currentPrice: 133, notify: false },
  { eventId: "the-winter-room", savedPrice: 92, currentPrice: 84, notify: true },
];

let items: WatchItem[] = seed;
let hydrated = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function hydrate() {
  if (hydrated || typeof window === "undefined") return;

  hydrated = true;

  try {
    const raw = window.localStorage.getItem(KEY);

    if (raw) {
      const parsed = JSON.parse(raw);

      if (Array.isArray(parsed)) {
        items = parsed as WatchItem[];
      }
    }
  } catch {
    /* ignore malformed local storage */
  }

  emit();
}

function persist() {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    /* ignore storage failures */
  }
}

export function useWatchlist() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      hydrate();

      return () => listeners.delete(cb);
    },
    () => items,
    () => seed,
  );
}

export function toggleNotify(eventId: string) {
  items = items.map((item) =>
    item.eventId === eventId
      ? { ...item, notify: !item.notify }
      : item,
  );

  persist();
  emit();
}

export function toggleSaved(event: PassrEvent, currentPrice: number) {
  const existing = items.some((item) => item.eventId === event.id);

  if (existing) {
    items = items.filter((item) => item.eventId !== event.id);
  } else {
    const savedEvent: SavedEvent = {
      id: event.id,
      name: event.name,
      date: event.date,
      venue: event.venue,
      city: event.city,
      state: event.state,
      category: event.category,
      subtitle: event.subtitle,
      image: event.image,
      ticketUrl: event.ticketUrl,
    };

    items = [
      ...items,
      {
        eventId: event.id,
        savedPrice: currentPrice,
        currentPrice,
        notify: true,
        event: savedEvent,
      },
    ];
  }

  persist();
  emit();
}

export function isSaved(list: WatchItem[], eventId: string) {
  return list.some((item) => item.eventId === eventId);
}
