// apps/web/src/pages/app/TaskDetailPage.tsx
// Route: "/app/task/:taskId" — task detail + submit flow (§6.2).
//  - Shows WhatsApp number, exact message, payout, deadline.
//  - wa.me deep-link button opens https://wa.me/<number>?text=<url-encoded-message>.
//  - Screenshot upload mode comes from site_settings.screenshot_mode:
//    'must' (required to submit) · 'optional' (default) · 'disabled' (upload
//    UI hidden entirely). create-submission enforces 'must' server-side.
//  - Submission is created server-side by the create-submission Edge Function
//    (approved decision (a)) — it captures IP and validates eligibility.
//    FALLBACK: if the Edge Function is not deployed/unreachable (404/network),
//    the client falls back to a direct RLS INSERT on `submissions` (the
//    "submissions: users insert own" policy in 0012_rls.sql enforces
//    user_id = auth.uid() and status = 'pending' server-side). ip_address is
//    left null in the fallback — it cannot be captured client-side (spoofable).
import { useEffect, useState, type ChangeEvent } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router";
import { applySeo } from "@/lib/seo";
import { invokeEdgeFunction, EdgeFunctionError } from "@/lib/edgeFunctions";
import { uploadScreenshot, sha256Hex } from "@/lib/cloudinary";
import { getDeviceFingerprint } from "@/lib/fingerprint";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { useTaskDetail } from "@/hooks/useTasks";
import { taskSubmissionSchema } from "@/lib/validators";
import type { ScreenshotMode } from "@wa-marketing-bd/shared-types";

interface CreateSubmissionResponse {
  ok: true;
  submissionId: string;
}

const EDGE_ERROR_KEYS: Record<string, string> = {
  RATE_LIMITED: "rateLimited",
  TASK_EXPIRED: "taskExpired",
  TASK_FULL: "taskFull",
  ALREADY_SUBMITTED: "alreadySubmitted",
  BANNED: "banned",
  SCREENSHOT_REQUIRED: "screenshotRequired",
  UNAUTHORIZED: "generic",
  INVALID_INPUT: "generic",
  TASK_NOT_FOUND: "generic",
  SUBMISSION_FAILED: "generic",
};

export default function TaskDetailPage(): React.ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { taskId } = useParams<{ taskId: string }>();
  const { session } = useAuthStore();
  const { entry, isLoading, error } = useTaskDetail(taskId, session);

  const [waLinkClicked, setWaLinkClicked] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [screenshotMode, setScreenshotMode] = useState<ScreenshotMode>("optional");

  useEffect(() => {
    applySeo({ title: t("task.detail.metaTitle"), description: t("task.detail.metaDescription") });
  }, [t]);

  // Fetch global screenshot mode setting once on mount.
  useEffect(() => {
    async function fetchScreenshotSetting(): Promise<void> {
      const { data } = await supabase
        .from("site_settings")
        .select("screenshot_mode")
        .eq("id", 1)
        .maybeSingle();
      if (data !== null && data !== undefined) {
        const m = (data.screenshot_mode as ScreenshotMode | null) ?? "optional";
        setScreenshotMode(m === "must" || m === "disabled" ? m : "optional");
      }
    }
    void fetchScreenshotSetting();
  }, []);

  function openWhatsApp(number: string, message: string): void {
    setWaLinkClicked(true);
    const url = `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
    // Give the click-flag state a tick to register before navigation.
    window.setTimeout(() => {
      window.open(url, "_blank", "noopener,noreferrer");
    }, 50);
  }

  function onFileChange(e: ChangeEvent<HTMLInputElement>): void {
    setFile(e.target.files?.[0] ?? null);
  }

  async function handleSubmit(): Promise<void> {
    if (entry === null || session === null || isSubmitting) return;
    setErrorMsg(null);

    // Client-side enforcement: 'must' requires a file before submitting.
    if (screenshotMode === "must" && file === null) {
      setErrorMsg(t("task.error.screenshotRequired"));
      return;
    }

    setIsSubmitting(true);

    try {
      let screenshotPublicId: string | null = null;
      let screenshotHash: string | null = null;
      if (file !== null) {
        setIsUploading(true);
        const upload = await uploadScreenshot(file);
        screenshotHash = await sha256Hex(await file.arrayBuffer());
        screenshotPublicId = upload.publicId;
        setIsUploading(false);
      }

      const deviceFingerprint = await getDeviceFingerprint();
      const input = taskSubmissionSchema.parse({
        taskId: entry.task.id,
        screenshotPublicId,
        screenshotHash,
        waLinkClicked,
        deviceFingerprint,
      });

      try {
        const res = await invokeEdgeFunction<CreateSubmissionResponse>(
          "create-submission",
          input,
          session,
        );
        void res;
      } catch (err) {
        // Fallback path: Edge Function missing (404) or unreachable (CORS/
        // network). The RLS insert policy enforces ownership server-side.
        // Server-side eligibility (task active/not full, duplicates, rate
        // limit) is enforced by the UNIQUE(user_id, task_id) constraint and
        // the task filters in useTasks; server-side re-check happens at
        // review time (verify-submission/fn_verify_submission).
        const isMissing =
          (err instanceof EdgeFunctionError && err.status === 404) ||
          (err instanceof TypeError && err.message.includes("fetch"));
        if (!isMissing) throw err;

        const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string | undefined;
        const { error: insertError } = await supabase.from("submissions").insert({
          task_id: input.taskId,
          user_id: session.user.id,
          status: "pending",
          screenshot_url:
            screenshotPublicId !== null && cloudName !== undefined && cloudName !== ""
              ? `https://res.cloudinary.com/${cloudName}/image/upload/${screenshotPublicId}`
              : null,
          screenshot_hash: screenshotHash,
          wa_link_clicked_at: waLinkClicked ? new Date().toISOString() : null,
          device_fingerprint: deviceFingerprint,
        });
        if (insertError !== null) {
          // unique violation 23505 → duplicate submission
          if (insertError.code === "23505") {
            setErrorMsg(t("task.error.alreadySubmitted"));
          } else {
            setErrorMsg(t("task.error.generic"));
          }
          setIsUploading(false);
          return;
        }
      }

      setSuccess(true);
      window.setTimeout(() => void navigate("/app/task"), 1200);
    } catch (err) {
      setIsUploading(false);
      if (err instanceof EdgeFunctionError) {
        setErrorMsg(t(`task.error.${EDGE_ERROR_KEYS[err.code] ?? "generic"}`));
      } else {
        setErrorMsg(t("task.error.uploadFailed"));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <main style={{ padding: "var(--spacing-xl)" }} role="status">
        {t("common.loading")}
      </main>
    );
  }

  if (error !== null || entry === null) {
    return (
      <main style={{ padding: "var(--spacing-xl)" }}>
        <p role="alert" className="auth-error">
          {t("task.error.notFound")}
        </p>
        <Link to="/app/task" className="auth-link">
          {t("common.back")}
        </Link>
      </main>
    );
  }

  return <TaskDetailBody
    task={entry.task}
    submission={entry.submission}
    waLinkClicked={waLinkClicked}
    file={file}
    isUploading={isUploading}
    isSubmitting={isSubmitting}
    errorMsg={errorMsg}
    success={success}
    screenshotMode={screenshotMode}
    onOpenWhatsApp={openWhatsApp}
    onFileChange={onFileChange}
    onSubmit={() => void handleSubmit()}
  />;
}

// ─── Presentational body ──────────────────────────────────────────────────────

interface BodyProps {
  task: import("@wa-marketing-bd/shared-types").Task;
  submission: import("@wa-marketing-bd/shared-types").Submission | null;
  waLinkClicked: boolean;
  file: File | null;
  isUploading: boolean;
  isSubmitting: boolean;
  errorMsg: string | null;
  success: boolean;
  screenshotMode: ScreenshotMode;
  onOpenWhatsApp: (number: string, message: string) => void;
  onFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onSubmit: () => void;
}

function TaskDetailBody({
  task,
  submission,
  waLinkClicked,
  file,
  isUploading,
  isSubmitting,
  errorMsg,
  success,
  screenshotMode,
  onOpenWhatsApp,
  onFileChange,
  onSubmit,
}: BodyProps): React.ReactElement {
  const { t } = useTranslation();
  const alreadySubmitted = submission !== null;

  return (
    <main
      style={{
        padding: "var(--spacing-xl)",
        maxWidth: "640px",
        margin: "0 auto",
        paddingBottom: "96px",
      }}
    >
      <Link to="/app/task" className="auth-link" style={{ fontSize: "14px" }}>
        ← {t("common.back")}
      </Link>

      <h1 style={{ fontSize: "28px", fontVariationSettings: '"wght" 540', margin: "16px 0 8px" }}>
        ৳{task.payout_amount}
      </h1>
      <p style={{ color: "var(--color-ink-mute)", margin: "0 0 24px" }}>
        {t("task.card.deadline")}: {new Date(task.expires_at).toLocaleString()}
      </p>

      <section
        style={{
          border: "1px solid var(--color-hairline)",
          borderRadius: "var(--rounded-lg)",
          padding: "var(--spacing-xl)",
          marginBottom: "var(--spacing-xl)",
        }}
      >
        <h2 style={{ fontSize: "16px", fontVariationSettings: '"wght" 600', margin: "0 0 8px" }}>
          {t("task.detail.whatsappNumber")}
        </h2>
        <p style={{ margin: "0 0 16px", fontFamily: "monospace", fontSize: "18px" }}>
          {task.whatsapp_number}
        </p>
        <h2 style={{ fontSize: "16px", fontVariationSettings: '"wght" 600', margin: "0 0 8px" }}>
          {t("task.detail.message")}
        </h2>
        <p
          style={{
            margin: "0 0 16px",
            whiteSpace: "pre-wrap",
            background: "var(--color-canvas-soft)",
            padding: "var(--spacing-lg)",
            borderRadius: "var(--rounded-md)",
          }}
        >
          {task.message}
        </p>
        <button
          type="button"
          className="auth-submit-btn"
          onClick={() => onOpenWhatsApp(task.whatsapp_number, task.message)}
          disabled={alreadySubmitted}
        >
          {t("task.detail.openWhatsApp")}
        </button>
        {waLinkClicked && !alreadySubmitted && (
          <p style={{ fontSize: "12px", color: "var(--color-ink-faint)", margin: "8px 0 0" }}>
            {t("task.detail.linkClicked")}
          </p>
        )}
      </section>

      {alreadySubmitted ? (
        <p role="status" className="settings-success">
          {t(`task.status.${submission.status}`)}
          {submission.rejection_reason !== null && (
            <>
              <br />
              {t("task.detail.rejectionReason")}: {submission.rejection_reason}
            </>
          )}
        </p>
      ) : success ? (
        <p role="status" className="settings-success">
          {t("task.detail.submitted")}
        </p>
      ) : (
        <section>
          <h2 style={{ fontSize: "20px", fontVariationSettings: '"wght" 540', margin: "0 0 8px" }}>
            {t("task.detail.submitTitle")}
          </h2>

          {/* Screenshot upload — hidden entirely in 'disabled' mode */}
          {screenshotMode !== "disabled" && (
            <>
              <p style={{ color: "var(--color-ink-mute)", fontSize: "14px", margin: "0 0 16px" }}>
                {screenshotMode === "must"
                  ? t("task.detail.screenshotRequired")
                  : t("task.detail.screenshotOptional")}
              </p>

              <input
                type="file"
                accept="image/*"
                onChange={onFileChange}
                style={{ marginBottom: "var(--spacing-lg)" }}
              />
              {file !== null && (
                <p style={{ fontSize: "12px", color: "var(--color-ink-faint)", margin: "0 0 12px" }}>
                  {file.name}
                </p>
              )}
            </>
          )}

          {errorMsg !== null && (
            <p role="alert" className="auth-error">
              {errorMsg}
            </p>
          )}

          <button
            type="button"
            className="auth-submit-btn"
            onClick={onSubmit}
            disabled={isSubmitting || isUploading || (screenshotMode === "must" && file === null)}
          >
            {isUploading
              ? t("task.detail.uploading")
              : isSubmitting
                ? t("common.saving")
                : t("task.detail.submitButton")}
          </button>
        </section>
      )}
    </main>
  );
}
