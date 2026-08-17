import { useSyncExternalStore } from "react";

export type WatchItem = {
  eventId: string;
  savedPrice: number;
  currentPrice: number;
  notify: boolean;
};

const KEY = "passr.watchlist.v2";

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

    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      items = [];
      return;
    }

    items = parsed.filter(
      (item): item is WatchItem =>
        item &&
        typeof item.eventId === "string" &&
        typeof item.savedPrice === "number" &&
        typeof item.currentPrice === "number" &&
        typeof item.notify === "boolean",
    );
  } catch {
    items = [];
  }

  emit();
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
    (callback) => {
      listeners.add(callback);
      hydrate();

      return () => {
        listeners.delete(callback);
      };
    },
    () => items,
    () => [],
  );
}

export function toggleSaved(eventId: string, currentPrice: number) {
  hydrate();

  const existing = items.some((item) => item.eventId === eventId);

  if (existing) {
    items = items.filter((item) => item.eventId !== eventId);
  } else {
    items = [
      ...items,
      {
        eventId,
        savedPrice: currentPrice,
        currentPrice,
        notify: true,
      },
    ];
  }

  persist();
  emit();
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

export function isSaved(list: WatchItem[], eventId: string) {
  return list.some((item) => item.eventId === eventId);
}

export function removeSaved(eventId: string) {
  hydrate();

  items = items.filter((item) => item.eventId !== eventId);

  persist();
  emit();
}

export function clearWatchlist() {
  hydrate();

  items = [];

  persist();
  emit();
}
