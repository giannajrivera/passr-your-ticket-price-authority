import {
  emptyPreferences,
  type EventPreferences,
} from "@/lib/preferences";
import { supabase } from "@/integrations/supabase/client";

export type PassrProfile = {
  name: string;
  email: string;
  phone?: string | undefined;

  /**
   * Legacy flat answers.
   *
   * These are retained for backwards compatibility with older parts of
   * Passr. The structured `preferences` object is the source of truth.
   */
  answers: Record<string, string[]>;

  /**
   * Structured, provider-agnostic preference model.
   */
  preferences?: EventPreferences | undefined;

  completedAt: string;
};

const KEY = "passr.profile.v1";

/* -------------------------------------------------------------------------- */
/* Local profile                                                               */
/* -------------------------------------------------------------------------- */

export function getProfile(): PassrProfile | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw =
      window.localStorage.getItem(KEY);

    if (!raw) {
      return null;
    }

    const parsed: unknown =
      JSON.parse(raw);

    if (!isPassrProfile(parsed)) {
      return null;
    }

    return normalizeProfile(parsed);
  } catch (error) {
    console.error(
      "[Passr] Failed to read local profile:",
      error,
    );

    return null;
  }
}

export function getPreferences(): EventPreferences {
  return (
    getProfile()?.preferences ??
    emptyPreferences()
  );
}

export function saveProfile(
  profile: PassrProfile,
): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      KEY,
      JSON.stringify(
        normalizeProfile(profile),
      ),
    );
  } catch (error) {
    console.error(
      "[Passr] Failed to save local profile:",
      error,
    );
  }
}

/* -------------------------------------------------------------------------- */
/* Supabase persistence                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Push the current local profile to Supabase.
 *
 * This should only be used when we have determined that the local profile is
 * the correct source of truth — primarily during first-time account creation.
 */
export async function syncProfileToSupabase(
  userId: string,
): Promise<boolean> {
  if (!userId) {
    return false;
  }

  const profile = getProfile();

  if (!profile) {
    return false;
  }

  const now =
    new Date().toISOString();

  const { error: profileError } =
    await supabase
      .from("profiles")
      .upsert(
        {
          id: userId,
          name:
            profile.name.trim() ||
            null,
          email:
            profile.email.trim() ||
            null,
          phone:
            profile.phone?.trim() ||
            null,
          updated_at: now,
        },
        {
          onConflict: "id",
        },
      );

  if (profileError) {
    console.error(
      "[Passr] Failed to sync profile:",
      profileError,
    );

    return false;
  }

  const preferences =
    normalizePreferences(
      profile.preferences,
    );

  const { error: preferencesError } =
    await supabase
      .from("user_preferences")
      .upsert(
        {
          user_id: userId,
          preferences,
          updated_at: now,
        },
        {
          onConflict: "user_id",
        },
      );

  if (preferencesError) {
    console.error(
      "[Passr] Failed to sync preferences:",
      preferencesError,
    );

    return false;
  }

  return true;
}

/**
 * Restore the authenticated user's profile from Supabase.
 *
 * Supabase is treated as the source of truth when a cloud profile exists.
 * The result is also written into localStorage so the app can load quickly
 * on subsequent visits.
 */
export async function loadProfileFromSupabase(
  userId: string,
): Promise<PassrProfile | null> {
  if (!userId) {
    return null;
  }

  const [
    profileResult,
    preferencesResult,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "name, email, phone, updated_at",
      )
      .eq("id", userId)
      .maybeSingle(),

    supabase
      .from("user_preferences")
      .select(
        "preferences, updated_at",
      )
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  const {
    data: profileData,
    error: profileError,
  } = profileResult;

  const {
    data: preferencesData,
    error: preferencesError,
  } = preferencesResult;

  if (profileError) {
    console.error(
      "[Passr] Failed to load profile:",
      profileError,
    );
  }

  if (preferencesError) {
    console.error(
      "[Passr] Failed to load preferences:",
      preferencesError,
    );
  }

  /*
   * If both records are missing, the user does not have a cloud profile yet.
   */
  if (
    !profileData &&
    !preferencesData
  ) {
    return null;
  }

  const localProfile =
    getProfile();

  const preferences =
    normalizePreferences(
      preferencesData?.preferences ??
        localProfile?.preferences,
    );

  const completedAt =
    localProfile?.completedAt ??
    preferencesData?.updated_at ??
    profileData?.updated_at ??
    new Date().toISOString();

  const profile: PassrProfile = {
    name:
      profileData?.name ??
      localProfile?.name ??
      "",

    email:
      profileData?.email ??
      localProfile?.email ??
      "",

    phone:
      profileData?.phone ??
      localProfile?.phone ??
      undefined,

    /*
     * Preserve legacy answers if they already exist locally.
     * Structured preferences remain the actual source of truth.
     */
    answers:
      localProfile?.answers ??
      {},

    preferences,

    completedAt,
  };

  saveProfile(profile);

  return profile;
}

/**
 * First-time authentication helper.
 *
 * If the user has already completed onboarding locally, push that profile to
 * Supabase. Then immediately read it back so local state exactly matches the
 * cloud state.
 */
export async function syncAndLoadProfile(
  userId: string,
): Promise<PassrProfile | null> {
  if (!userId) {
    return null;
  }

  const synced =
    await syncProfileToSupabase(
      userId,
    );

  if (!synced) {
    return null;
  }

  return loadProfileFromSupabase(
    userId,
  );
}

/* -------------------------------------------------------------------------- */
/* Local cache utilities                                                       */
/* -------------------------------------------------------------------------- */

export function clearProfile(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(KEY);
  } catch (error) {
    console.error(
      "[Passr] Failed to clear local profile:",
      error,
    );
  }
}

/* -------------------------------------------------------------------------- */
/* Normalization                                                               */
/* -------------------------------------------------------------------------- */

function normalizePreferences(
  value: unknown,
): EventPreferences {
  const defaults =
    emptyPreferences();

  if (
    !value ||
    typeof value !== "object"
  ) {
    return defaults;
  }

  const raw =
    value as Partial<EventPreferences>;

  return {
    ...defaults,

    version: 2,

    categories:
      Array.isArray(raw.categories)
        ? raw.categories.filter(
            (
              item,
            ): item is string =>
              typeof item ===
              "string",
          )
        : [],

    interests:
      Array.isArray(raw.interests)
        ? raw.interests.filter(
            (
              item,
            ): item is string =>
              typeof item ===
              "string",
          )
        : [],

    budget:
      raw.budget ??
      undefined,

    travel:
      raw.travel ??
      undefined,

    horizon:
      raw.horizon ??
      undefined,

    vibes:
      Array.isArray(raw.vibes)
        ? raw.vibes.filter(
            (
              item,
            ): item is EventPreferences["vibes"][number] =>
              typeof item ===
              "string",
          )
        : [],

    notifications: {
      ...defaults.notifications,
      ...(raw.notifications &&
      typeof raw.notifications ===
        "object"
        ? raw.notifications
        : {}),
    },
  };
}

function normalizeProfile(
  profile: PassrProfile,
): PassrProfile {
  return {
    name:
      typeof profile.name ===
      "string"
        ? profile.name
        : "",

    email:
      typeof profile.email ===
      "string"
        ? profile.email
        : "",

    phone:
      typeof profile.phone ===
      "string" &&
      profile.phone.trim()
        ? profile.phone
        : undefined,

    answers:
      profile.answers &&
      typeof profile.answers ===
        "object"
        ? profile.answers
        : {},

    preferences:
      normalizePreferences(
        profile.preferences,
      ),

    completedAt:
      typeof profile.completedAt ===
      "string"
        ? profile.completedAt
        : new Date().toISOString(),
  };
}

function isPassrProfile(
  value: unknown,
): value is PassrProfile {
  if (
    !value ||
    typeof value !== "object"
  ) {
    return false;
  }

  const profile =
    value as Partial<PassrProfile>;

  return (
    typeof profile.name ===
      "string" &&
    typeof profile.email ===
      "string" &&
    typeof profile.completedAt ===
      "string"
  );
}