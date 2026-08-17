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
 *
 * Supabase becomes the persistent source of truth after authentication,
 * while localStorage remains a useful fast cache during the MVP migration.
 */
export function getPreferences(): EventPreferences {
  return getProfile()?.preferences ?? emptyPreferences();
}

export function saveProfile(profile: PassrProfile) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(KEY, JSON.stringify(profile));
}

/**
 * Persist the locally collected Passr profile into Supabase.
 *
 * This is intentionally tolerant: if the user is not authenticated yet,
 * the local profile remains available and can be synced after the magic link
 * creates a session.
 */
export async function syncProfileToSupabase(userId: string): Promise<void> {
  const profile = getProfile();

  if (!profile) return;

  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      id: userId,
      name: profile.name || null,
      email: profile.email || null,
      phone: profile.phone || null,
      updated_at: new Date().toISOString(),
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
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id",
      },
    );

  if (preferencesError) {
    console.error("[Passr] Failed to sync preferences:", preferencesError);
  }
}

export function clearProfile() {
  if (typeof window === "undefined") return;

  window.localStorage.removeItem(KEY);
}
