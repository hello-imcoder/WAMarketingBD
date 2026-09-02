// apps/web/src/hooks/useAdminUsers.ts
// Admin user management (§7.4) — list/search with server pagination and status
// filter (direct admin RLS reads); ban/suspend/verify mutations go through the
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

export type UserStatusFilter = "all" | "verified" | "banned" | "suspended";

export function useAdminUserActions(): {
  updateUser: (
    userId: string,
    patch: { isVerified?: boolean; isBanned?: boolean; suspendedAt?: string | null },
  ) => Promise<UserActionErrorCode | null>;
} {
  const session = useAuthStore((s) => s.session);

  async function updateUser(
    userId: string,
    patch: { isVerified?: boolean; isBanned?: boolean; suspendedAt?: string | null },
  ): Promise<UserActionErrorCode | null> {
    if (session === null) return "UNAUTHORIZED";
    try {
      await invokeEdgeFunction<{ ok: true }>("admin-update-user", { userId, ...patch }, session);
      return null;
    } catch (err) {
      return err instanceof EdgeFunctionError ? (err.code as UserActionErrorCode) : "UNKNOWN_ERROR";
    }
  }

  return { updateUser };
}

export function useAdminUsers(options: {
  page: number; // 1-based
  pageSize: number;
  status: UserStatusFilter;
  term: string;
}): {
  users: Profile[];
  total: number;
  isLoading: boolean;
  error: string | null;
  reload: () => void;
} {
  const { page, pageSize, status, term } = options;
  const [users, setUsers] = useState<Profile[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const reload = useCallback((): void => setTick((n) => n + 1), []);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      setIsLoading(true);
      setError(null);
      const from = (page - 1) * pageSize;
      let query = supabase
        .from("profiles")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, from + pageSize - 1);
      if (status === "verified") query = query.eq("is_verified", true);
      if (status === "banned") query = query.eq("is_banned", true);
      if (status === "suspended") query = query.not("suspended_at", "is", null);
      const trimmed = term.trim();
      if (trimmed !== "") {
        query = query.or(`phone.ilike.%${trimmed}%,name.ilike.%${trimmed}%`);
      }
      const { data, count, error: dbError } = await query;
      if (!mounted) return;
      if (dbError !== null) setError("load_failed");
      else {
        setUsers((data ?? []) as Profile[]);
        setTotal(count ?? 0);
      }
      setIsLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [tick, page, pageSize, status, term]);

  return { users, total, isLoading, error, reload };
}
