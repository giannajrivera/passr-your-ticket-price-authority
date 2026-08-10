import { useSyncExternalStore } from "react";

export type WatchItem = {
  eventId: string;
  savedPrice: number;
  currentPrice: number;
  notify: boolean;
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
    if (raw) items = JSON.parse(raw) as WatchItem[];
  } catch {
    /* ignore */
  }
  emit();
}

function persist() {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    /* ignore */
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
  items = items.map((i) => (i.eventId === eventId ? { ...i, notify: !i.notify } : i));
  persist();
  emit();
}

export function toggleSaved(eventId: string, currentPrice: number) {
  items = items.some((i) => i.eventId === eventId)
    ? items.filter((i) => i.eventId !== eventId)
    : [...items, { eventId, savedPrice: currentPrice, currentPrice, notify: true }];
  persist();
  emit();
}

export function isSaved(list: WatchItem[], eventId: string) {
  return list.some((i) => i.eventId === eventId);
}
