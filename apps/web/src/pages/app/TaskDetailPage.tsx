// apps/web/src/pages/app/TaskDetailPage.tsx
// Route: "/app/task/:taskId" — task detail + submit flow (§6.2).
//  - Shows WhatsApp number, exact message, payout, deadline.
//  - wa.me deep-link button opens https://wa.me/<number>?text=<url-encoded-message>.
//  - Optional Cloudinary screenshot upload (unsigned preset).
//  - Submission is created server-side by the create-submission Edge Function
//    (approved decision (a)) — it captures IP and validates eligibility.
import { useEffect, useState, type ChangeEvent } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router";
import { applySeo } from "@/lib/seo";
import { invokeEdgeFunction, EdgeFunctionError } from "@/lib/edgeFunctions";
import { uploadScreenshot, sha256Hex } from "@/lib/cloudinary";
import { getDeviceFingerprint } from "@/lib/fingerprint";
import { useAuthStore } from "@/stores/authStore";
import { useTaskDetail } from "@/hooks/useTasks";
import { taskSubmissionSchema } from "@/lib/validators";

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

  useEffect(() => {
    applySeo({ title: t("task.detail.metaTitle"), description: t("task.detail.metaDescription") });
  }, [t]);

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

      const res = await invokeEdgeFunction<CreateSubmissionResponse>(
        "create-submission",
        input,
        session,
      );
      void res;
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
          <p style={{ color: "var(--color-ink-mute)", fontSize: "14px", margin: "0 0 16px" }}>
            {t("task.detail.screenshotOptional")}
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

          {errorMsg !== null && (
            <p role="alert" className="auth-error">
              {errorMsg}
            </p>
          )}

          <button
            type="button"
            className="auth-submit-btn"
            onClick={onSubmit}
            disabled={isSubmitting || isUploading}
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
