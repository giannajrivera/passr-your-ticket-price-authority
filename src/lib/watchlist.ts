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
let activeUserId: string | null = null;
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

function readLocal(): WatchItem[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(KEY);

    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);

    if (!Array.isArray(parsed)) return [];

    return (parsed as WatchItem[]).filter(
      (item): item is WatchItem =>
        !!item &&
        typeof item === "object" &&
        typeof item.eventId === "string" &&
        typeof item.savedPrice === "number" &&
        typeof item.currentPrice === "number" &&
        typeof item.notify === "boolean" &&
        !!item.event &&
        typeof item.event === "object" &&
        typeof item.event.id === "string" &&
        typeof item.event.name === "string",
    );
  } catch {
    return [];
  }
}

function hydrateLocal() {
  if (hydrated || typeof window === "undefined") return;

  hydrated = true;
  items = readLocal();

  persistLocal();
}

async function getCurrentUserId(): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user?.id ?? null;
}

/**
 * Make sure the event exists in the Supabase events table.
 *
 * saved_events.event_id is a foreign key to events.id, so authenticated
 * watchlist saves need a corresponding event row first.
 */
async function ensureEventExists(event: SavedEvent): Promise<string | null> {
  const { data: existing, error: lookupError } = await supabase
    .from("events")
    .select("id")
    .eq("id", event.id)
    .maybeSingle();

  if (lookupError) {
    console.error("[Passr] Failed to check event:", lookupError);
    return null;
  }

  if (existing?.id) {
    return existing.id;
  }

  const { data: created, error: createError } = await supabase
    .from("events")
    .insert({
      id: event.id,
      name: event.name,
      provider: "ticketmaster",
      provider_event_id: event.id,
      category: event.category ?? null,
      city: event.city ?? null,
      state: event.state ?? null,
      ticket_url: event.ticketUrl ?? null,
      image_url: event.image ?? null,
      starting_price: null,
    })
    .select("id")
    .single();

  if (createError) {
    console.error("[Passr] Failed to create event:", createError);
    return null;
  }

  return created.id;
}

/**
 * Load the authenticated user's watchlist from Supabase.
 *
 * We join saved_events to events so the watchlist can reconstruct the same
 * SavedEvent shape used by the existing UI.
 */
async function loadFromSupabase(userId: string): Promise<WatchItem[]> {
  const { data, error } = await supabase
    .from("saved_events")
    .select(
      `
        event_id,
        saved_price,
        notify,
        events (
          id,
          name,
          category,
          city,
          state,
          event_date,
          venue_name,
          image_url,
          ticket_url,
          starting_price
        )
      `,
    )
    .eq("user_id", userId);

  if (error) {
    console.error("[Passr] Failed to load watchlist:", error);
    return [];
  }

  const loaded: WatchItem[] = [];

  for (const row of data ?? []) {
    const event = Array.isArray(row.events)
      ? row.events[0]
      : row.events;

    if (!event) continue;

    loaded.push({
      eventId: row.event_id,
      savedPrice: Number(row.saved_price ?? 0),
      currentPrice: Number(event.starting_price ?? row.saved_price ?? 0),
      notify: Boolean(row.notify),
      event: {
        id: event.id,
        name: event.name,
        date: event.event_date ?? "",
        venue: event.venue_name ?? "",
        category: event.category as PassrEvent["category"],
        ...(event.city !== null &&
          event.city !== undefined && {
            city: event.city,
          }),
        ...(event.state !== null &&
          event.state !== undefined && {
            state: event.state,
          }),
        ...(event.image_url !== null &&
          event.image_url !== undefined && {
            image: event.image_url,
          }),
        ...(event.ticket_url !== null &&
          event.ticket_url !== undefined && {
            ticketUrl: event.ticket_url,
          }),
      },
    });
  }

  return loaded;
}

/**
 * Push locally saved events into the authenticated user's account.
 *
 * This lets someone save events before signing in and then keep those saves
 * permanently once they create/sign into their Passr account.
 */
async function migrateLocalWatchlist(userId: string) {
  const localItems = readLocal();

  if (!localItems.length) return;

  for (const item of localItems) {
    const eventId = await ensureEventExists(item.event);

    if (!eventId) continue;

    const { data: existing } = await supabase
      .from("saved_events")
      .select("id")
      .eq("user_id", userId)
      .eq("event_id", eventId)
      .maybeSingle();

    if (existing?.id) {
      continue;
    }

    const { error } = await supabase.from("saved_events").insert({
      user_id: userId,
      event_id: eventId,
      saved_price: item.savedPrice,
      notify: item.notify,
    });

    if (error) {
      console.error("[Passr] Failed to migrate saved event:", error);
    }
  }
}

/**
 * Load the correct watchlist for the current authentication state.
 */
async function hydrateForUser() {
  if (loadingPromise) {
    await loadingPromise;
    return;
  }

  loadingPromise = (async () => {
    hydrateLocal();

    const userId = await getCurrentUserId();

    if (!userId) {
      activeUserId = null;
      emit();
      return;
    }

    activeUserId = userId;

    // Move any browser-only saves into the account first.
    await migrateLocalWatchlist(userId);

    // The account is now the source of truth.
    const remoteItems = await loadFromSupabase(userId);

    items = remoteItems;
    persistLocal();

    emit();
  })();

  try {
    await loadingPromise;
  } finally {
    loadingPromise = null;
  }
}

/**
 * React hook used by the Watchlist screen.
 *
 * Anonymous users continue using localStorage.
 * Authenticated users use their Supabase-backed watchlist.
 */
export function useWatchlist() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);

      void hydrateForUser();

      listener();

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(() => {
        void hydrateForUser();
      });

      return () => {
        listeners.delete(listener);
        subscription.unsubscribe();
      };
    },
    () => items,
    () => [],
  );
}

/**
 * Toggle price-drop/event notifications for one saved event.
 */
export async function toggleNotify(eventId: string) {
  await hydrateForUser();

  const nextNotify =
    items.find((item) => item.eventId === eventId)?.notify === false;

  items = items.map((item) =>
    item.eventId === eventId
      ? {
          ...item,
          notify: nextNotify,
        }
      : item,
  );

  persistLocal();
  emit();

  if (!activeUserId) return;

  const item = items.find((entry) => entry.eventId === eventId);

  if (!item) return;

  const { error } = await supabase
    .from("saved_events")
    .update({
      notify: nextNotify,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", activeUserId)
    .eq("event_id", eventId);

  if (error) {
    console.error("[Passr] Failed to update notification setting:", error);
  }
}

/**
 * Save or unsave an event.
 *
 * Anonymous:
 *   localStorage
 *
 * Authenticated:
 *   Supabase + localStorage cache
 */
export async function toggleSaved(
  event: PassrEvent,
  currentPrice: number,
) {
  await hydrateForUser();

  const existing = items.some((item) => item.eventId === event.id);

  if (existing) {
    items = items.filter((item) => item.eventId !== event.id);

    persistLocal();
    emit();

    if (activeUserId) {
      const eventId = await getRemoteEventId(event.id);

      if (eventId) {
        const { error } = await supabase
          .from("saved_events")
          .delete()
          .eq("user_id", activeUserId)
          .eq("event_id", eventId);

        if (error) {
          console.error("[Passr] Failed to remove saved event:", error);
        }
      }
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

  persistLocal();
  emit();

  if (!activeUserId) return;

  const remoteEventId = await ensureEventExists(savedEvent);

  if (!remoteEventId) return;

  const { error } = await supabase.from("saved_events").insert({
    user_id: activeUserId,
    event_id: remoteEventId,
    saved_price: currentPrice,
    notify: true,
  });

  if (error) {
    // If the save already exists, don't break the UI.
    if (!error.message.toLowerCase().includes("duplicate")) {
      console.error("[Passr] Failed to save event:", error);
    }
  }
}

/**
 * Find the actual Supabase event UUID for a Passr event.
 */
async function getRemoteEventId(passrEventId: string): Promise<string | null> {
  const { data: byId, error: idError } = await supabase
    .from("events")
    .select("id")
    .eq("id", passrEventId)
    .maybeSingle();

  if (!idError && byId?.id) {
    return byId.id;
  }

  const { data: byProviderId, error: providerError } = await supabase
    .from("events")
    .select("id")
    .eq("provider_event_id", passrEventId)
    .maybeSingle();

  if (providerError) {
    console.error(
      "[Passr] Failed to find remote event:",
      providerError,
    );
    return null;
  }

  return byProviderId?.id ?? null;
}

export function isSaved(list: WatchItem[], eventId: string) {
  return list.some((item) => item.eventId === eventId);
}

/**
 * Useful for account/logout flows if the local cache ever needs to be reset.
 */
export function resetWatchlist() {
  items = [];
  hydrated = false;
  activeUserId = null;
  loadingPromise = null;

  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(KEY);
    } catch {
      // Ignore localStorage failures.
    }
  }

  emit();
}
