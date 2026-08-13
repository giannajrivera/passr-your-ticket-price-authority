import { emptyPreferences, type EventPreferences } from "@/lib/preferences";

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

/** Preferences for the stored profile, falling back to an empty model. */
export function getPreferences(): EventPreferences {
  return getProfile()?.preferences ?? emptyPreferences();
}

export function saveProfile(profile: PassrProfile) {
  window.localStorage.setItem(KEY, JSON.stringify(profile));
}

export function clearProfile() {
  window.localStorage.removeItem(KEY);
}
