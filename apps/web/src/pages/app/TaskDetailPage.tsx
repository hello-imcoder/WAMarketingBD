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
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  ImagePlus,
  MessageCircle,
  Send,
} from "lucide-react";
import { applySeo } from "@/lib/seo";
import { invokeEdgeFunction, EdgeFunctionError } from "@/lib/edgeFunctions";
import { uploadScreenshot, sha256Hex } from "@/lib/cloudinary";
import { getDeviceFingerprint } from "@/lib/fingerprint";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { useTaskDetail } from "@/hooks/useTasks";
import { taskSubmissionSchema } from "@/lib/validators";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  ListSkeleton,
  Modal,
  statusTone,
  useToast,
} from "@/components/app/ui";
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
  const { success: toastSuccess, error: toastError } = useToast();

  const [waLinkClicked, setWaLinkClicked] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
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
          setIsUploading(false);
          if (insertError.code === "23505") {
            toastError(t("task.error.alreadySubmitted"));
          } else {
            toastError(t("task.error.generic"));
          }
          setIsSubmitting(false);
          return;
        }
      }

      toastSuccess(t("task.detail.submitted"));
      window.setTimeout(() => void navigate("/app/task"), 1200);
    } catch (err) {
      setIsUploading(false);
      if (err instanceof EdgeFunctionError) {
        toastError(t(`task.error.${EDGE_ERROR_KEYS[err.code] ?? "generic"}`));
      } else {
        toastError(t("task.error.uploadFailed"));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4" role="status" aria-label={t("common.loading")}>
        <ListSkeleton rows={3} />
      </div>
    );
  }

  if (error !== null || entry === null) {
    return (
      <div>
        <p role="alert" className="text-sm text-danger">
          {t("task.error.notFound")}
        </p>
        <Link to="/app/task" className="auth-link">
          {t("common.back")}
        </Link>
      </div>
    );
  }

  return (
    <TaskDetailBody
      task={entry.task}
      submission={entry.submission}
      waLinkClicked={waLinkClicked}
      file={file}
      isUploading={isUploading}
      isSubmitting={isSubmitting}
      errorMsg={errorMsg}
      screenshotMode={screenshotMode}
      onOpenWhatsApp={openWhatsApp}
      onFileChange={onFileChange}
      onSubmit={() => void handleSubmit()}
    />
  );
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
  screenshotMode,
  onOpenWhatsApp,
  onFileChange,
  onSubmit,
}: BodyProps): React.ReactElement {
  const { t } = useTranslation();
  const alreadySubmitted = submission !== null;
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Local preview of the chosen screenshot (revoked when it changes).
  useEffect(() => {
    if (file === null) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div>
        <Button variant="ghost" size="sm" to="/app/task">
          <ArrowLeft size={16} />
          {t("common.back")}
        </Button>
      </div>

      {/* ── Payout + deadline ─────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="wt-540 m-0 text-3xl text-ink">৳{task.payout_amount}</h1>
        {alreadySubmitted && (
          <Badge tone={statusTone(submission.status)}>
            {t(`task.status.${submission.status}`)}
          </Badge>
        )}
      </div>
      <p className="m-0 flex items-center gap-1.5 text-[13px] text-ink-mute">
        <Clock size={14} />
        {t("task.card.deadline")}: {new Date(task.expires_at).toLocaleString()}
      </p>

      {/* ── WhatsApp instructions ─────────────────────────────────────── */}
      <Card>
        <CardHeader
          title={t("task.detail.whatsappNumber")}
          icon={<MessageCircle size={18} />}
        />
        <CardBody className="flex flex-col gap-4">
          <p className="wt-540 m-0 font-mono text-lg tracking-wide text-ink">
            {task.whatsapp_number}
          </p>
          <div>
            <h2 className="wt-540 mb-1 mt-0 text-sm text-ink-mute">
              {t("task.detail.message")}
            </h2>
            <p className="m-0 whitespace-pre-wrap rounded-md bg-canvas-soft p-3 text-sm text-ink">
              {task.message}
            </p>
          </div>
          <Button
            variant="primary"
            loading={false}
            onClick={() => onOpenWhatsApp(task.whatsapp_number, task.message)}
            disabled={alreadySubmitted}
            className="w-full sm:w-auto"
          >
            <Send size={16} />
            {t("task.detail.openWhatsApp")}
          </Button>
          {waLinkClicked && !alreadySubmitted && (
            <p className="m-0 flex items-center gap-1.5 text-xs text-ink-faint">
              <CheckCircle2 size={13} className="text-success" />
              {t("task.detail.linkClicked")}
            </p>
          )}
        </CardBody>
      </Card>

      {/* ── Status / submit ───────────────────────────────────────────── */}
      {alreadySubmitted ? (
        <Card>
          <CardBody className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <CheckCircle2
                size={18}
                className={submission.status === "rejected" ? "text-danger" : "text-success"}
              />
              <span className="wt-540 text-sm text-ink">
                {t(`task.status.${submission.status}`)}
              </span>
            </div>
            {submission.rejection_reason !== null && (
              <p className="m-0 text-sm text-danger">
                {t("task.detail.rejectionReason")}: {submission.rejection_reason}
              </p>
            )}
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardHeader title={t("task.detail.submitTitle")} icon={<ImagePlus size={18} />} />
          <CardBody className="flex flex-col gap-4">
            {/* Screenshot upload — hidden entirely in 'disabled' mode */}
            {screenshotMode !== "disabled" && (
              <>
                <p className="m-0 text-[13px] text-ink-mute">
                  {screenshotMode === "must"
                    ? t("task.detail.screenshotRequired")
                    : t("task.detail.screenshotOptional")}
                </p>

                <div className="flex flex-wrap items-center gap-3">
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={onFileChange}
                      className="hidden"
                    />
                    <span className="inline-flex h-10 items-center gap-2 rounded-md border border-hairline bg-canvas px-4 text-sm text-ink transition-colors hover:bg-canvas-soft">
                      <ImagePlus size={16} />
                      {t("task.detail.chooseFile")}
                    </span>
                  </label>
                  {previewUrl !== null && (
                    <button
                      type="button"
                      onClick={() => setLightboxOpen(true)}
                      className="cursor-pointer overflow-hidden rounded-md border border-hairline"
                      aria-label={t("task.detail.viewScreenshot")}
                    >
                      <img
                        src={previewUrl}
                        alt={file?.name ?? ""}
                        className="h-14 w-14 object-cover"
                      />
                    </button>
                  )}
                  {file !== null && (
                    <p className="m-0 max-w-full truncate text-xs text-ink-faint">
                      {file.name}
                    </p>
                  )}
                </div>
              </>
            )}

            {errorMsg !== null && (
              <p role="alert" className="m-0 text-sm text-danger">
                {errorMsg}
              </p>
            )}

            <Button
              variant="primary"
              loading={isUploading || isSubmitting}
              disabled={screenshotMode === "must" && file === null}
              onClick={onSubmit}
              className="w-full sm:w-auto"
            >
              {isUploading
                ? t("task.detail.uploading")
                : t("task.detail.submitButton")}
            </Button>
          </CardBody>
        </Card>
      )}

      {/* ── Screenshot lightbox ───────────────────────────────────────── */}
      <Modal
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        title={file?.name ?? t("task.detail.viewScreenshot")}
        maxWidth="max-w-3xl"
      >
        {previewUrl !== null && (
          <img
            src={previewUrl}
            alt={file?.name ?? ""}
            className="max-h-[70dvh] w-full rounded-lg object-contain"
          />
        )}
      </Modal>
    </div>
  );
}
