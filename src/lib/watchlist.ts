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
  event: SavedEvent;
};

const KEY = "passr.watchlist.v1";

let items: WatchItem[] = [];
let hydrated = false;

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function hydrate() {
  if (hydrated || typeof window === "undefined") return;

  hydrated = true;

  try {
    const raw = window.localStorage.getItem(KEY);

    if (!raw) {
      items = [];
      return;
    }

    const parsed: unknown = JSON.parse(raw);

    if (Array.isArray(parsed)) {
      items = parsed.filter(
        (item): item is WatchItem =>
          typeof item === "object" &&
          item !== null &&
          typeof (item as WatchItem).eventId === "string" &&
          typeof (item as WatchItem).savedPrice === "number" &&
          typeof (item as WatchItem).currentPrice === "number" &&
          typeof (item as WatchItem).notify === "boolean" &&
          typeof (item as WatchItem).event === "object" &&
          (item as WatchItem).event !== null,
      );
    } else {
      items = [];
    }
  } catch {
    items = [];
  }
}

function persist() {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    /* Ignore localStorage failures. */
  }
}

export function useWatchlist() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);

      hydrate();

      // Hydration may have changed the store.
      listener();

      return () => {
        listeners.delete(listener);
      };
    },
    () => items,
    () => [],
  );
}

export function toggleNotify(eventId: string) {
  hydrate();

  items = items.map((item) =>
    item.eventId === eventId
      ? {
          ...item,
          notify: !item.notify,
        }
      : item,
  );

  persist();
  emit();
}

export function toggleSaved(event: PassrEvent, currentPrice: number) {
  hydrate();

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
