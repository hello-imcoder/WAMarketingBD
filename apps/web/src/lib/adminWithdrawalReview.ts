// apps/web/src/lib/adminWithdrawalReview.ts
// Shared complete/reject flow for withdrawals — process-withdrawal Edge
// Function with the fn_process_withdrawal RPC fallback (Edge Functions not
// deployed). Used by useAdminWithdrawals and the dashboard action queue.
import { supabase } from "@/lib/supabase";
import { invokeEdgeFunction, EdgeFunctionError } from "@/lib/edgeFunctions";
import type { Session } from "@supabase/supabase-js";

export type WithdrawalErrorCode =
  | "INVALID_INPUT"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "WITHDRAWAL_NOT_FOUND"
  | "ALREADY_PROCESSED"
  | "BELOW_MIN"
  | "INSUFFICIENT_BALANCE"
  | "RATE_LIMITED"
  | "WITHDRAWAL_FAILED"
  | "UNKNOWN_ERROR";

export async function reviewWithdrawal(
  session: Session,
  withdrawalId: string,
  action: "completed" | "rejected",
  adminNote: string | null,
): Promise<WithdrawalErrorCode | null> {
  try {
    await invokeEdgeFunction<{ ok: true; result: "completed" | "rejected" }>(
      "process-withdrawal",
      { withdrawalId, action, adminNote },
      session,
    );
    return null;
  } catch (err) {
    const isMissing =
      (err instanceof EdgeFunctionError && err.status === 404) ||
      (err instanceof TypeError && err.message.includes("fetch"));

    if (isMissing) {
      // Fallback to database RPC since Edge Functions are not deployed
      const { error: rpcError } = await supabase.rpc("fn_process_withdrawal", {
        p_withdrawal_id: withdrawalId,
        p_action: action,
        p_admin_note: adminNote ?? "",
      });

      if (rpcError !== null) {
        const match = rpcError.message.match(/WITHDRAWAL:([A-Z_]+)/);
        if (match && match[1]) {
          return match[1] as WithdrawalErrorCode;
        }
        return "WITHDRAWAL_FAILED";
      }
      return null;
    }

    return err instanceof EdgeFunctionError
      ? (err.code as WithdrawalErrorCode)
      : "UNKNOWN_ERROR";
  }
}
