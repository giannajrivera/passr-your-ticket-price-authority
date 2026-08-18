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
      // Drop legacy/corrupt entries saved before `event` existed.
      items = (parsed as WatchItem[]).filter(
        (item): item is WatchItem =>
          !!item &&
          typeof item === "object" &&
          typeof item.eventId === "string" &&
          !!item.event &&
          typeof item.event === "object",
      );

      if (items.length !== parsed.length) {
        persist();
      }
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
    // Ignore localStorage failures.
  }
}

export function useWatchlist() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      hydrate();
      listener();

      return () => listeners.delete(listener);
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
      category: event.category,

      ...(event.city !== undefined && {
        city: event.city,
      }),

      ...(event.state !== undefined && {
        state: event.state,
      }),

      ...(event.subtitle !== undefined && {
        subtitle: event.subtitle,
      }),

      ...(event.image !== undefined && {
        image: event.image,
      }),

      ...(event.ticketUrl !== undefined && {
        ticketUrl: event.ticketUrl,
      }),
    };

    const newItem: WatchItem = {
      eventId: event.id,
      savedPrice: currentPrice,
      currentPrice,
      notify: true,
      event: savedEvent,
    };

    items = [...items, newItem];
  }

  persist();
  emit();
}

export function isSaved(list: WatchItem[], eventId: string) {
  return list.some((item) => item.eventId === eventId);
}
