// apps/web/src/hooks/useAdminUsers.ts
// Admin user management (§7.4) — list/search + per-user detail views are
// direct admin RLS reads; ban/suspend/verify mutations go through the
// admin-update-user Edge Function (SECURITY.md §1 — server-side only).
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { invokeEdgeFunction, EdgeFunctionError } from "@/lib/edgeFunctions";
import { useAuthStore } from "@/stores/authStore";
import type { Profile } from "@wa-marketing-bd/shared-types";

export type UserActionErrorCode =
  | "INVALID_INPUT"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "SELF_LOCKOUT"
  | "USER_NOT_FOUND"
  | "RATE_LIMITED"
  | "USER_UPDATE_FAILED"
  | "UNKNOWN_ERROR";

export function useAdminUsers(): {
  users: Profile[];
  isLoading: boolean;
  error: string | null;
  search: (term: string) => Promise<void>;
  reload: () => void;
  updateUser: (
    userId: string,
    patch: { isVerified?: boolean; isBanned?: boolean; suspendedAt?: string | null },
  ) => Promise<UserActionErrorCode | null>;
} {
  const session = useAuthStore((s) => s.session);
  const [users, setUsers] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const reload = useCallback((): void => setTick((n) => n + 1), []);

  useEffect(() => {
    void (async () => {
      setIsLoading(true);
      setError(null);
      const { data, error: dbError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (dbError !== null) setError("load_failed");
      else setUsers((data ?? []) as Profile[]);
      setIsLoading(false);
    })();
  }, [tick]);

  async function search(term: string): Promise<void> {
    const trimmed = term.trim();
    if (trimmed === "") {
      reload();
      return;
    }
    setIsLoading(true);
    setError(null);
    const { data, error: dbError } = await supabase
      .from("profiles")
      .select("*")
      .or(`phone.ilike.%${trimmed}%,name.ilike.%${trimmed}%`)
      .limit(50);
    if (dbError !== null) setError("load_failed");
    else setUsers((data ?? []) as Profile[]);
    setIsLoading(false);
  }

  async function updateUser(
    userId: string,
    patch: { isVerified?: boolean; isBanned?: boolean; suspendedAt?: string | null },
  ): Promise<UserActionErrorCode | null> {
    if (session === null) return "UNAUTHORIZED";
    try {
      await invokeEdgeFunction<{ ok: true }>("admin-update-user", { userId, ...patch }, session);
      reload();
      return null;
    } catch (err) {
      return err instanceof EdgeFunctionError ? (err.code as UserActionErrorCode) : "UNKNOWN_ERROR";
    }
  }

  return { users, isLoading, error, search, reload, updateUser };
}
