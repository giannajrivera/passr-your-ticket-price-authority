import { useSyncExternalStore } from "react";
import type { PassrEvent } from "@/lib/types";
import { supabase } from "@/integrations/supabase/client";

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
let currentUserId: string | null = null;
let loadingPromise: Promise<void> | null = null;

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function persistLocal() {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    // Ignore localStorage failures.
  }
}

function hydrateLocal() {
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
      items = (parsed as WatchItem[]).filter(
        (item): item is WatchItem =>
          !!item &&
          typeof item === "object" &&
          typeof item.eventId === "string" &&
          !!item.event &&
          typeof item.event === "object",
      );

      if (items.length !== parsed.length) {
        persistLocal();
      }
    } else {
      items = [];
    }
  } catch {
    items = [];
  }
}

function toSavedEvent(event: {
  id: string;
  name: string;
  event_date: string | null;
  venue_name: string | null;
  city: string | null;
  state: string | null;
  category: string | null;
  description: string | null;
  image_url: string | null;
  ticket_url: string | null;
}): SavedEvent {
  return {
    id: event.id,
    name: event.name,
    date: event.event_date ?? "",
    venue: event.venue_name ?? "",
    category: event.category as PassrEvent["category"],

    ...(event.city !== null && {
      city: event.city,
    }),

    ...(event.state !== null && {
      state: event.state,
    }),

    ...(event.description !== null && {
      subtitle: event.description,
    }),

    ...(event.image_url !== null && {
      image: event.image_url,
    }),

    ...(event.ticket_url !== null && {
      ticketUrl: event.ticket_url,
    }),
  };
}

async function loadFromSupabase(userId: string) {
  const { data, error } = await supabase
    .from("saved_events")
    .select(`
      event_id,
      saved_price,
      notify,
      events (
        id,
        name,
        event_date,
        venue_name,
        city,
        state,
        category,
        description,
        image_url,
        ticket_url
      )
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[Passr] Failed to load watchlist:", error);
    return;
  }

  const loaded: WatchItem[] = [];

  for (const row of data ?? []) {
    const event = Array.isArray(row.events) ? row.events[0] : row.events;

    if (!event) continue;

    loaded.push({
      eventId: row.event_id,
      savedPrice: row.saved_price ?? 0,
      currentPrice: row.saved_price ?? 0,
      notify: row.notify ?? true,
      event: toSavedEvent(event),
    });
  }

  items = loaded;
  emit();
}

async function migrateLocalWatchlistToSupabase(userId: string) {
  if (typeof window === "undefined") return;

  hydrateLocal();

  if (items.length === 0) return;

  const { data: existing, error: existingError } = await supabase
    .from("saved_events")
    .select("event_id")
    .eq("user_id", userId);

  if (existingError) {
    console.error("[Passr] Failed to check existing watchlist:", existingError);
    return;
  }

  const existingIds = new Set(
    (existing ?? []).map((row) => row.event_id),
  );

  const rows = items
    .filter((item) => !existingIds.has(item.eventId))
    .map((item) => ({
      user_id: userId,
      event_id: item.eventId,
      saved_price: item.savedPrice,
      notify: item.notify,
    }));

  if (rows.length === 0) return;

  const { error } = await supabase
    .from("saved_events")
    .insert(rows);

  if (error) {
    console.error("[Passr] Failed to migrate local watchlist:", error);
  }
}

async function ensureLoaded() {
  if (typeof window === "undefined") return;

  hydrateLocal();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return;
  }

  if (currentUserId === user.id) {
    return;
  }

  currentUserId = user.id;

  await migrateLocalWatchlistToSupabase(user.id);
  await loadFromSupabase(user.id);
}

function startHydration() {
  if (loadingPromise) return loadingPromise;

  loadingPromise = ensureLoaded().finally(() => {
    loadingPromise = null;
  });

  return loadingPromise;
}

export function useWatchlist() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      startHydration();

      return () => listeners.delete(listener);
    },
    () => items,
    () => [],
  );
}

export async function toggleNotify(eventId: string) {
  hydrateLocal();

  const item = items.find((entry) => entry.eventId === eventId);

  if (!item) return;

  const nextNotify = !item.notify;

  items = items.map((entry) =>
    entry.eventId === eventId
      ? {
          ...entry,
          notify: nextNotify,
        }
      : entry,
  );

  emit();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { error } = await supabase
      .from("saved_events")
      .update({
        notify: nextNotify,
      })
      .eq("user_id", user.id)
      .eq("event_id", eventId);

    if (error) {
      console.error("[Passr] Failed to update watchlist notification:", error);
    }
  } else {
    persistLocal();
  }
}

export async function toggleSaved(
  event: PassrEvent,
  currentPrice: number,
) {
  hydrateLocal();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const existing = items.some((item) => item.eventId === event.id);

  if (existing) {
    items = items.filter((item) => item.eventId !== event.id);
    emit();

    if (user) {
      const { error } = await supabase
        .from("saved_events")
        .delete()
        .eq("user_id", user.id)
        .eq("event_id", event.id);

      if (error) {
        console.error("[Passr] Failed to remove saved event:", error);
      }
    } else {
      persistLocal();
    }

    return;
  }

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
  emit();

  if (user) {
    const { error } = await supabase
      .from("saved_events")
      .upsert(
        {
          user_id: user.id,
          event_id: event.id,
          saved_price: currentPrice,
          notify: true,
        },
        {
          onConflict: "user_id,event_id",
        },
      );

    if (error) {
      console.error("[Passr] Failed to save event:", error);
    }
  } else {
    persistLocal();
  }
}

export function isSaved(list: WatchItem[], eventId: string) {
  return list.some((item) => item.eventId === eventId);
}

/**
 * Reset the in-memory watchlist when the authenticated account changes.
 *
 * This prevents one user's saved events from remaining visible after
 * signing out and another user signing in on the same device.
 */
export function resetWatchlist() {
  items = [];
  hydrated = false;
  currentUserId = null;
  loadingPromise = null;
  emit();
}
