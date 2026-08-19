import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Bell,
  LogOut,
  Mail,
  Pencil,
  Phone,
  User,
} from "lucide-react";

import { BottomNav } from "@/components/BottomNav";
import { useAuth } from "@/lib/auth";
import {
  getProfile,
  saveProfile,
  syncProfileToSupabase,
  type PassrProfile,
} from "@/lib/profile";
import {
  labelForBudget,
  labelForHorizon,
  labelForTravel,
  labelForVibe,
  type EventPreferences,
} from "@/lib/preferences";
import { labelFor } from "@/lib/taxonomy";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/account")({
  component: Account,
});

function Account() {
  const {
    user,
    loading: authLoading,
    signOut,
  } = useAuth();

  const [profile, setProfile] =
    useState<PassrProfile | null>(null);

  const [loading, setLoading] = useState(true);
  const [editingProfile, setEditingProfile] =
    useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (authLoading) return;

      const localProfile = getProfile();

      if (!mounted) return;

      setProfile(localProfile);
      setName(localProfile?.name ?? "");
      setPhone(localProfile?.phone ?? "");
      setLoading(false);
    }

    void load();

    return () => {
      mounted = false;
    };
  }, [user, authLoading]);

  async function handleSaveProfile() {
    if (!profile) return;

    const updatedProfile: PassrProfile = {
      ...profile,
      name: name.trim(),
      phone: phone.trim() || undefined,
    };

    saveProfile(updatedProfile);
    setProfile(updatedProfile);
    setEditingProfile(false);

    if (user) {
      await syncProfileToSupabase(user.id);
    }
  }

  async function handleSignOut() {
    await signOut();
  }

  if (authLoading || loading) {
    return (
      <main className="min-h-screen bg-background pb-28 text-foreground">
        <div className="mx-auto max-w-2xl px-4 py-10">
          <p className="text-sm text-muted-foreground">
            Loading your account...
          </p>
        </div>

        <BottomNav />
      </main>
    );
  }

  const preferences = profile?.preferences;

  return (
    <main className="min-h-screen bg-background pb-28 text-foreground">
      <div className="mx-auto max-w-2xl px-4 pb-10 pt-6 sm:px-6">
        <header className="mb-8">
          <Link
            to="/"
            className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>

          <h1 className="font-sans text-4xl font-bold tracking-tight">
            Account
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            Manage your Passr profile, preferences, and notifications.
          </p>
        </header>

        {!user && (
          <section className="mb-6 rounded-3xl border border-border bg-card p-5">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-primary/10 p-3">
                <User className="h-5 w-5 text-primary" />
              </div>

              <div className="flex-1">
                <h2 className="font-sans text-xl font-bold">
                  Create your Passr account
                </h2>

                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  Save your Watchlist across devices and keep your Passr
                  preferences with you.
                </p>

                <Link
                  to="/"
                  className="mt-4 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
                >
                  Sign in
                </Link>
              </div>
            </div>
          </section>
        )}

        <section className="rounded-3xl border border-border bg-card p-5">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="font-sans text-2xl font-bold">
                Profile
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                Your Passr account information.
              </p>
            </div>

            {profile && (
              <button
                type="button"
                onClick={() =>
                  setEditingProfile((value) => !value)
                }
                className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs font-semibold transition hover:bg-muted"
              >
                <Pencil className="h-3.5 w-3.5" />

                {editingProfile ? "Cancel" : "Edit"}
              </button>
            )}
          </div>

          {profile ? (
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground" />

                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Name
                  </p>

                  {editingProfile ? (
                    <input
                      value={name}
                      onChange={(event) =>
                        setName(event.target.value)
                      }
                      className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                    />
                  ) : (
                    <p className="mt-1 text-sm font-medium">
                      {profile.name || "Not added"}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Email
                  </p>

                  <p className="mt-1 text-sm font-medium">
                    {profile.email ||
                      user?.email ||
                      "Not added"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />

                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Phone
                  </p>

                  {editingProfile ? (
                    <input
                      value={phone}
                      onChange={(event) =>
                        setPhone(event.target.value)
                      }
                      type="tel"
                      placeholder="Add phone number"
                      className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                    />
                  ) : (
                    <p className="mt-1 text-sm font-medium">
                      {profile.phone || "Not added"}
                    </p>
                  )}
                </div>
              </div>

              {editingProfile && (
                <button
                  type="button"
                  onClick={() =>
                    void handleSaveProfile()
                  }
                  className="w-full rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
                >
                  Save changes
                </button>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Complete onboarding to create your Passr profile.
            </p>
          )}
        </section>

        {preferences && (
          <PreferencesSection
            preferences={preferences}
          />
        )}

        {user && profile && (
          <NotificationSettings
            profile={profile}
            onProfileChange={setProfile}
          />
        )}

        {user && (
          <button
            type="button"
            onClick={() => void handleSignOut()}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl border border-border px-5 py-4 text-sm font-semibold text-muted-foreground transition hover:border-destructive/40 hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        )}
      </div>

      <BottomNav />
    </main>
  );
}

function PreferencesSection({
  preferences,
}: {
  preferences: EventPreferences;
}) {
  const interests = preferences.interests
    .map((id) => ({
      id,
      label: labelFor(id),
    }))
    .filter((item) => item.label);

  return (
    <section className="mt-6 rounded-3xl border border-border bg-card p-5">
      <div className="mb-5">
        <h2 className="font-sans text-2xl font-bold">
          Your preferences
        </h2>

        <p className="mt-1 text-sm text-muted-foreground">
          These are the choices Passr uses to personalize
          your events.
        </p>
      </div>

      <div className="space-y-5">
        {preferences.categories.length > 0 && (
          <PreferenceRow
            label="Categories"
            value={preferences.categories
              .map(labelFor)
              .join(", ")}
          />
        )}

        {interests.length > 0 && (
          <PreferenceRow
            label="Interests"
            value={interests
              .map((item) => item.label)
              .join(", ")}
          />
        )}

        {preferences.budget && (
          <PreferenceRow
            label="Budget"
            value={
              labelForBudget(preferences.budget) ??
              preferences.budget
            }
          />
        )}

        {preferences.travel && (
          <PreferenceRow
            label="Travel"
            value={
              labelForTravel(preferences.travel) ??
              preferences.travel
            }
          />
        )}

        {preferences.horizon && (
          <PreferenceRow
            label="Planning"
            value={
              labelForHorizon(preferences.horizon) ??
              preferences.horizon
            }
          />
        )}

        {preferences.vibes.length > 0 && (
          <PreferenceRow
            label="Vibe"
            value={preferences.vibes
              .map(labelForVibe)
              .join(", ")}
          />
        )}

        {!preferences.categories.length &&
          !preferences.interests.length &&
          !preferences.vibes.length &&
          !preferences.budget &&
          !preferences.travel &&
          !preferences.horizon && (
            <p className="text-sm text-muted-foreground">
              You haven't selected any preferences yet.
            </p>
          )}
      </div>
    </section>
  );
}

function PreferenceRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="border-b border-border pb-4 last:border-0 last:pb-0">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>

      <p className="mt-1 text-sm leading-relaxed text-foreground">
        {value}
      </p>
    </div>
  );
}

function NotificationSettings({
  profile,
  onProfileChange,
}: {
  profile: PassrProfile;
  onProfileChange: (
    profile: PassrProfile,
  ) => void;
}) {
  const preferences = profile.preferences;

  if (!preferences) return null;

  const notifications =
    preferences.notifications ?? {
      emailUpdates: true,
      smsUpdates: false,
      priceDropAlerts: true,
      eventUpdates: true,
      newEventAlerts: true,
      recommendationUpdates: true,
    };

  async function updateNotification(
    key:
      | "emailUpdates"
      | "smsUpdates"
      | "priceDropAlerts"
      | "eventUpdates"
      | "newEventAlerts"
      | "recommendationUpdates",
  ) {
    if (
      key === "smsUpdates" &&
      !profile.phone
    ) {
      return;
    }

    const nextPreferences: EventPreferences = {
      ...preferences,
      notifications: {
        ...notifications,
        [key]: !notifications[key],
      },
    };

    const nextProfile: PassrProfile = {
      ...profile,
      preferences: nextPreferences,
    };

    onProfileChange(nextProfile);
    saveProfile(nextProfile);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      await syncProfileToSupabase(user.id);
    }
  }

  return (
    <section className="mt-6 rounded-3xl border border-border bg-card p-5">
      <div className="mb-5">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-primary/10 p-3">
            <Bell className="h-5 w-5 text-primary" />
          </div>

          <div>
            <h2 className="font-sans text-2xl font-bold">
              Notifications
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Choose what Passr sends you.
            </p>
          </div>
        </div>
      </div>

      <div className="divide-y divide-border">
        <NotificationToggle
          label="Email updates"
          description="Important Passr updates and account information."
          checked={notifications.emailUpdates}
          onChange={() =>
            void updateNotification(
              "emailUpdates",
            )
          }
        />

        <NotificationToggle
          label="Price-drop alerts"
          description="Let me know when a saved event gets cheaper."
          checked={notifications.priceDropAlerts}
          onChange={() =>
            void updateNotification(
              "priceDropAlerts",
            )
          }
        />

        <NotificationToggle
          label="Event updates"
          description="Changes to events you're watching or following."
          checked={notifications.eventUpdates}
          onChange={() =>
            void updateNotification(
              "eventUpdates",
            )
          }
        />

        <NotificationToggle
          label="New event alerts"
          description="Tell me when new events match my interests."
          checked={notifications.newEventAlerts}
          onChange={() =>
            void updateNotification(
              "newEventAlerts",
            )
          }
        />

        <NotificationToggle
          label="Recommendations"
          description="Personalized event recommendations from Passr."
          checked={
            notifications.recommendationUpdates
          }
          onChange={() =>
            void updateNotification(
              "recommendationUpdates",
            )
          }
        />

        <NotificationToggle
          label="Text messages"
          description={
            profile.phone
              ? `Send updates to ${profile.phone}.`
              : "Add a phone number above to enable text notifications."
          }
          checked={notifications.smsUpdates}
          disabled={!profile.phone}
          onChange={() =>
            void updateNotification(
              "smsUpdates",
            )
          }
        />
      </div>
    </section>
  );
}

function NotificationToggle({
  label,
  description,
  checked,
  disabled = false,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-4 py-4 ${
        disabled ? "opacity-50" : ""
      }`}
    >
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">
          {label}
        </p>

        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={onChange}
        className={`relative h-7 w-12 shrink-0 rounded-full transition ${
          checked ? "bg-primary" : "bg-muted"
        } ${
          disabled
            ? "cursor-not-allowed"
            : "cursor-pointer"
        }`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-background shadow-sm transition ${
            checked ? "left-6" : "left-1"
          }`}
        />
      </button>
    </div>
  );
}
