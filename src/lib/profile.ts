import { emptyPreferences, type EventPreferences } from "@/lib/preferences";
import { supabase } from "@/integrations/supabase/client";

export type PassrProfile = {
  name: string;
  email: string;
  phone?: string | undefined;
  /**
   * Legacy flat answers (question id -> labels). Still written, derived from
   * `preferences`, so older readers keep working.
   */
  answers: Record<string, string[]>;
  /** Structured, provider-agnostic preference model. */
  preferences?: EventPreferences | undefined;
  completedAt: string;
};

const KEY = "passr.profile.v1";

/**
 * Read the locally cached Passr profile.
 *
 * localStorage is used as a fast cache during the MVP, but authenticated
 * account data is persisted in Supabase and can be restored on another
 * device/session.
 */
export function getProfile(): PassrProfile | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as PassrProfile) : null;
  } catch {
    return null;
  }
}

/**
 * Returns the locally cached preferences.
 */
export function getPreferences(): EventPreferences {
  return getProfile()?.preferences ?? emptyPreferences();
}

/**
 * Save a Passr profile locally.
 *
 * This keeps onboarding fast and allows the profile to exist before the user
 * finishes authentication.
 */
export function saveProfile(profile: PassrProfile) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(KEY, JSON.stringify(profile));
}

/**
 * Persist the locally collected Passr profile into Supabase.
 *
 * This is used after authentication. Supabase becomes the persistent source
 * of truth while localStorage remains the fast local cache.
 */
export async function syncProfileToSupabase(userId: string): Promise<void> {
  const profile = getProfile();

  if (!profile) return;

  const now = new Date().toISOString();

  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      id: userId,
      name: profile.name || null,
      email: profile.email || null,
      phone: profile.phone || null,
      updated_at: now,
    },
    {
      onConflict: "id",
    },
  );

  if (profileError) {
    console.error("[Passr] Failed to sync profile:", profileError);
    return;
  }

  const { error: preferencesError } = await supabase
    .from("user_preferences")
    .upsert(
      {
        user_id: userId,
        preferences: profile.preferences ?? emptyPreferences(),
        updated_at: now,
      },
      {
        onConflict: "user_id",
      },
    );

  if (preferencesError) {
    console.error("[Passr] Failed to sync preferences:", preferencesError);
    return;
  }
}

/**
 * Restore an authenticated user's profile from Supabase.
 *
 * This is the important account-persistence piece:
 *
 * Supabase -> local Passr profile
 *
 * It allows a user who logs into Passr on another device to recover their
 * profile and onboarding preferences.
 */
export async function loadProfileFromSupabase(
  userId: string,
): Promise<PassrProfile | null> {
  if (!userId) return null;

  const [{ data: profileData, error: profileError }, { data: preferencesData, error: preferencesError }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("name, email, phone, updated_at")
        .eq("id", userId)
        .maybeSingle(),

      supabase
        .from("user_preferences")
        .select("preferences, updated_at")
        .eq("user_id", userId)
        .maybeSingle(),
    ]);

  if (profileError) {
    console.error("[Passr] Failed to load profile:", profileError);
  }

  if (preferencesError) {
    console.error("[Passr] Failed to load preferences:", preferencesError);
  }

  if (!profileData && !preferencesData) {
    return null;
  }

  const localProfile = getProfile();

  const preferences =
    (preferencesData?.preferences as EventPreferences | null | undefined) ??
    localProfile?.preferences ??
    emptyPreferences();

  const profile: PassrProfile = {
    name: profileData?.name ?? localProfile?.name ?? "",
    email: profileData?.email ?? localProfile?.email ?? "",
    phone: profileData?.phone ?? localProfile?.phone ?? undefined,
    answers: localProfile?.answers ?? {},
    preferences,
    completedAt:
      localProfile?.completedAt ??
      preferencesData?.updated_at ??
      profileData?.updated_at ??
      new Date().toISOString(),
  };

  saveProfile(profile);

  return profile;
}

/**
 * Sync the current local profile to Supabase, then immediately hydrate it
 * back from Supabase.
 *
 * This is useful after the magic-link authentication completes because it
 * guarantees that the authenticated account becomes the persistent source
 * of truth.
 */
export async function syncAndLoadProfile(userId: string): Promise<PassrProfile | null> {
  await syncProfileToSupabase(userId);
  return loadProfileFromSupabase(userId);
}

/**
 * Clear the local profile cache.
 *
 * This does NOT delete the user's Supabase account or cloud data.
 */
export function clearProfile() {
  if (typeof window === "undefined") return;

  window.localStorage.removeItem(KEY);
}
