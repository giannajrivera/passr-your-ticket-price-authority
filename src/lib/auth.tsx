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
  syncProfileToSupabase,
} from "@/lib/profile";

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  sendMagicLink: (
    email: string,
  ) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
};

const AuthContext =
  createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [session, setSession] =
    useState<Session | null>(null);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    let mounted = true;

    async function initializeAuth() {
      try {
        const {
          data,
          error,
        } = await supabase.auth.getSession();

        if (!mounted) return;

        if (error) {
          console.error(
            "Failed to restore Supabase session:",
            error,
          );

          setSession(null);
          setLoading(false);
          return;
        }

        const nextSession = data.session ?? null;

        setSession(nextSession);
        setLoading(false);

        /*
         * If Supabase already has a user, make sure the
         * locally-created Passr profile is synchronized.
         *
         * This is intentionally done after auth state is
         * available so the rest of the app can render.
         */
        if (nextSession?.user) {
          void syncProfileToSupabase(
            nextSession.user.id,
          );
        }
      } catch (error) {
        console.error(
          "Unexpected auth initialization error:",
          error,
        );

        if (!mounted) return;

        setSession(null);
        setLoading(false);
      }
    }

    void initializeAuth();

    const {
      data: {
        subscription,
      },
    } = supabase.auth.onAuthStateChange(
      async (_event, nextSession) => {
        if (!mounted) return;

        setSession(nextSession);
        setLoading(false);

        if (nextSession?.user) {
          /*
           * Do not block the auth callback on profile
           * synchronization. Supabase auth should finish
           * first; profile synchronization can happen
           * immediately afterward.
           */
          setTimeout(() => {
            if (!mounted) return;

            const profile = getProfile();

            if (profile) {
              void syncProfileToSupabase(
                nextSession.user.id,
              );
            }
          }, 0);
        }
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
        const cleanedEmail = email.trim();

        if (!cleanedEmail) {
          return {
            error: new Error(
              "Please enter your email address.",
            ),
          };
        }

        const {
          error,
        } = await supabase.auth.signInWithOtp({
          email: cleanedEmail,
          options: {
            /*
             * Supabase will return the user here after
             * they click the magic link.
             *
             * Using the current origin makes this work
             * both locally and on the published Passr app.
             */
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
        try {
          await supabase.auth.signOut();
        } finally {
          setSession(null);
        }
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