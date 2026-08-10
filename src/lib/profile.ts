export type PassrProfile = {
  name: string;
  email: string;
  phone?: string | undefined;
  answers: Record<string, string[]>;
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

export function saveProfile(profile: PassrProfile) {
  window.localStorage.setItem(KEY, JSON.stringify(profile));
}

export function clearProfile() {
  window.localStorage.removeItem(KEY);
}
