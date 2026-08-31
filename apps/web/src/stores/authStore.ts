// apps/web/src/stores/authStore.ts
// Zustand v5 auth store — single source of truth for session + profile.
// Hydration strategy: getSession() on mount → fetch profile → onAuthStateChange subscription.
// Role gating uses profile.role fetched from DB — never a JWT claim alone (§12).
import { create } from "zustand";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@wa-marketing-bd/shared-types";

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  /** True until both session and profile have been resolved on app load. */
  isLoading: boolean;
  /** Derived: name has been set → onboarding is complete. */
  isOnboardingComplete: boolean;

  // Internal setters used by initAuth hydration
  _setSession: (session: Session | null) => void;
  _setProfile: (profile: Profile | null) => void;
  _setLoading: (loading: boolean) => void;

  // Public actions
  signOut: () => Promise<void>;
  /** Re-fetch profile from DB and update store. Call after any profile mutation. */
  refreshProfile: () => Promise<void>;
}

function deriveOnboardingComplete(profile: Profile | null): boolean {
  return profile !== null && profile.name.trim().length > 0;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  profile: null,
  isLoading: true,
  isOnboardingComplete: false,

  _setSession: (session) => set({ session }),
  _setProfile: (profile) =>
    set({ profile, isOnboardingComplete: deriveOnboardingComplete(profile) }),
  _setLoading: (isLoading) => set({ isLoading }),

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, profile: null, isOnboardingComplete: false });
  },

  refreshProfile: async () => {
    const { session } = get();
    if (!session) return;
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .single<Profile>();
    const profile = data ?? null;
    set({ profile, isOnboardingComplete: deriveOnboardingComplete(profile) });
  },
}));

// ─── Internal helper ──────────────────────────────────────────────────────────

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single<Profile>();
  return data ?? null;
}

// ─── App-level hydration — called once from main.tsx ─────────────────────────
// Restores session from localStorage, fetches profile, subscribes to auth state changes.
// Must be called before the first render that needs auth state.

export async function initAuth(): Promise<void> {
  const store = useAuthStore.getState();

  // 1. Restore persisted session
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) {
    const profile = await fetchProfile(session.user.id);

    // Ban check: sign out immediately if account is banned or suspended
    if (profile && (profile.is_banned || profile.suspended_at !== null)) {
      await supabase.auth.signOut();
      store._setSession(null);
      store._setProfile(null);
    } else {
      store._setSession(session);
      store._setProfile(profile);
    }
  }

  store._setLoading(false);

  // 2. Subscribe to ongoing auth state changes for the lifetime of the app
  supabase.auth.onAuthStateChange(async (event, newSession) => {
    const currentStore = useAuthStore.getState();
    if (event === "SIGNED_IN" && newSession) {
      const profile = await fetchProfile(newSession.user.id);
      if (profile && (profile.is_banned || profile.suspended_at !== null)) {
        await supabase.auth.signOut();
        currentStore._setSession(null);
        currentStore._setProfile(null);
      } else {
        currentStore._setSession(newSession);
        currentStore._setProfile(profile);
      }
    } else if (event === "SIGNED_OUT") {
      currentStore._setSession(null);
      currentStore._setProfile(null);
    } else if (event === "TOKEN_REFRESHED" && newSession) {
      currentStore._setSession(newSession);
    }
  });
}
