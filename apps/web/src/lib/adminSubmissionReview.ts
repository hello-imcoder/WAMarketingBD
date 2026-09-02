// apps/web/src/lib/adminSubmissionReview.ts
// Shared approve/reject flow for submissions — verify-submission Edge Function
// with the fn_verify_submission RPC fallback (Edge Functions not deployed).
// Used by useAdminSubmissions, the dashboard queue, and the task detail page.
import { supabase } from "@/lib/supabase";
import { invokeEdgeFunction, EdgeFunctionError } from "@/lib/edgeFunctions";
import type { Session } from "@supabase/supabase-js";

export type ReviewErrorCode =
  | "INVALID_INPUT"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "SUBMISSION_NOT_FOUND"
  | "TASK_FULL"
  | "ALREADY_REVIEWED"
  | "RATE_LIMITED"
  | "VERIFICATION_FAILED"
  | "UNKNOWN_ERROR";

export async function reviewSubmission(
  session: Session,
  submissionId: string,
  action: "approved" | "rejected",
  rejectionReason: string | null,
): Promise<ReviewErrorCode | null> {
  try {
    await invokeEdgeFunction<{ ok: true; result: "approved" | "rejected" }>(
      "verify-submission",
      { submissionId, action, rejectionReason },
      session,
    );
    return null;
  } catch (err) {
    const isMissing =
      (err instanceof EdgeFunctionError && err.status === 404) ||
      (err instanceof TypeError && err.message.includes("fetch"));

    if (isMissing) {
      // Fallback to database RPC since Edge Functions are not deployed
      const { error: rpcError } = await supabase.rpc("fn_verify_submission", {
        p_submission_id: submissionId,
        p_action: action,
        p_rejection_reason: rejectionReason ?? "",
      });

      if (rpcError !== null) {
        // Extract error code from Postgres EXCEPTION 'SUBMISSION:CODE'
        const match = rpcError.message.match(/SUBMISSION:([A-Z_]+)/);
        if (match && match[1]) {
          return match[1] as ReviewErrorCode;
        }
        return "VERIFICATION_FAILED";
      }
      return null;
    }
    return err instanceof EdgeFunctionError ? (err.code as ReviewErrorCode) : "UNKNOWN_ERROR";
  }
}
