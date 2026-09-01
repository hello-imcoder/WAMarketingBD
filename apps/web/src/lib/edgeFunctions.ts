// apps/web/src/lib/edgeFunctions.ts
// Typed client for Supabase Edge Functions. Sends the caller's access token;
// never touches the service-role key.
import type { Session } from "@supabase/supabase-js";
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

export class EdgeFunctionError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
  ) {
    super(`Edge Function error ${String(status)}: ${code}`);
  }
}

interface EdgeOk {
  ok: true;
}

/**
 * Invokes an Edge Function with the current session's access token.
 * Returns the parsed JSON body; throws EdgeFunctionError on non-2xx.
 */
export async function invokeEdgeFunction<T extends EdgeOk>(
  functionName: string,
  body: unknown,
  session: Session,
): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${functionName}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(body),
  });

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    // non-JSON error body
  }

  if (!res.ok) {
    const code =
      typeof data === "object" && data !== null && "error" in data && typeof data.error === "string"
        ? data.error
        : "UNKNOWN_ERROR";
    throw new EdgeFunctionError(code, res.status);
  }
  return data as T;
}
