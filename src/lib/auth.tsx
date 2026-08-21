import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import {
  getProfile,
  loadProfileFromSupabase,
  saveProfile,
  syncAndLoadProfile,
  syncProfileToSupabase,
} from "@/lib/profile";

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  sendMagicLink: (email: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function hydrateAuthenticatedProfile(userId: string) {
      try {
        /*
         * IMPORTANT:
         *
         * First try to restore the account from Supabase.
         * We do NOT immediately push localStorage into Supabase here because
         * localStorage may be stale when the user signs in on another device.
         */
        const remoteProfile =
          await loadProfileFromSupabase(userId);

        if (remoteProfile) {
          if (mounted) {
            saveProfile(remoteProfile);
          }

          return;
        }

        /*
         * No cloud profile exists yet.
         *
         * This is most likely a brand-new authenticated user who completed
         * onboarding locally before signing in. In that case, create the
         * cloud profile from the local profile.
         */
        const localProfile = getProfile();

        if (localProfile) {
          await syncProfileToSupabase(userId);
        }
      } catch (error) {
        console.error(
          "[Passr] Failed to hydrate authenticated profile:",
          error,
        );
      }
    }

    async function initializeAuth() {
      try {
        const {
          data: { session: currentSession },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error(
            "[Passr] Failed to restore auth session:",
            error,
          );
        }

        if (!mounted) return;

        setSession(currentSession);

        /*
         * The auth provider should finish loading after the session is known.
         * Profile hydration happens separately so the entire app doesn't
         * remain stuck on a loading screen if Supabase profile data is slow.
         */
        setLoading(false);

        if (currentSession?.user) {
          void hydrateAuthenticatedProfile(
            currentSession.user.id,
          );
        }
      } catch (error) {
        console.error(
          "[Passr] Auth initialization failed:",
          error,
        );

        if (mounted) {
          setSession(null);
          setLoading(false);
        }
      }
    }

    void initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event, nextSession) => {
        if (!mounted) return;

        setSession(nextSession);
        setLoading(false);

        if (!nextSession?.user) {
          return;
        }

        /*
         * Give Supabase's auth state transaction a chance to complete before
         * querying profile tables.
         */
        setTimeout(() => {
          if (!mounted) return;

          void (async () => {
            try {
              const remoteProfile =
                await loadProfileFromSupabase(
                  nextSession.user.id,
                );

              if (remoteProfile) {
                if (mounted) {
                  saveProfile(remoteProfile);
                }

                return;
              }

              /*
               * A new user may have completed onboarding before authentication.
               * Only in that case do we create the initial cloud profile.
               */
              const localProfile = getProfile();

              if (localProfile) {
                await syncAndLoadProfile(
                  nextSession.user.id,
                );
              }
            } catch (error) {
              console.error(
                "[Passr] Failed to restore profile after auth change:",
                error,
              );
            }
          })();
        }, 0);

        /*
         * The event is intentionally not used to blindly sync localStorage.
         *
         * This prevents a stale device cache from overwriting the user's
         * actual account data.
         */
        void event;
      },
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      session,
      loading,

      async sendMagicLink(email: string) {
        const normalizedEmail = email.trim().toLowerCase();

        if (!normalizedEmail) {
          return {
            error: new Error("Please enter your email address."),
          };
        }

        const { error } =
          await supabase.auth.signInWithOtp({
            email: normalizedEmail,
            options: {
              emailRedirectTo:
                window.location.origin,
            },
          });

        return {
          error: error
            ? new Error(error.message)
            : null,
        };
      },

      async signOut() {
        const { error } =
          await supabase.auth.signOut();

        if (error) {
          console.error(
            "[Passr] Failed to sign out:",
            error,
          );
        }

        setSession(null);
      },
    }),
    [session, loading],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider",
    );
  }

  return context;
}