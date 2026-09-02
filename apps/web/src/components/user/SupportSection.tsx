// apps/web/src/components/user/SupportSection.tsx
// Support section of Settings (§6.7) — open a ticket, list own tickets,
// view a ticket thread with replies (admin responses come in Milestone 11).
// Fetches support_notice_text from site_settings and shows it as a popup
// modal (using NoticeModal) when is_support_notice_active is true.
import { useState, useEffect, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, LifeBuoy, MessageSquare, Send } from "lucide-react";
import { useSupport } from "@/hooks/useSupport";
import { supabase } from "@/lib/supabase";
import { supportTicketSchema, supportReplySchema } from "@/lib/validators";
import { NoticeModal } from "@/components/app/NoticeModal";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  Field,
  Input,
  ListSkeleton,
  Textarea,
  statusTone,
  useToast,
} from "@/components/app/ui";
import type { SupportReply, SupportTicket } from "@wa-marketing-bd/shared-types";

export function SupportSection(): React.ReactElement {
  const { t } = useTranslation();
  const { tickets, isLoading, error, createTicket, addReply, loadReplies } = useSupport();
  const { success: toastSuccess, error: toastError } = useToast();

  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [openTicket, setOpenTicket] = useState<SupportTicket | null>(null);
  const [replies, setReplies] = useState<SupportReply[]>([]);
  const [replyText, setReplyText] = useState("");
  const [replyError, setReplyError] = useState<string | null>(null);

  // ── Support notice from site_settings ──────────────────────────────────
  const [supportNotice, setSupportNotice] = useState<string | null>(null);
  const [showNoticeModal, setShowNoticeModal] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function fetchNotice(): Promise<void> {
      const { data } = await supabase
        .from("site_settings")
        .select("support_notice_text, is_support_notice_active")
        .eq("id", 1)
        .maybeSingle();
      if (
        mounted &&
        data !== null &&
        data !== undefined &&
        data.is_support_notice_active === true &&
        typeof data.support_notice_text === "string" &&
        data.support_notice_text.trim() !== ""
      ) {
        setSupportNotice(data.support_notice_text);
        setShowNoticeModal(true);
      }
    }
    void fetchNotice();
    return () => { mounted = false; };
  }, []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setFormError(null);
    const parsed = supportTicketSchema.safeParse({ subject, message });
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? t("auth.error.generic"));
      return;
    }
    setIsSaving(true);
    const errKey = await createTicket(parsed.data.subject, parsed.data.message);
    setIsSaving(false);
    if (errKey !== null) {
      toastError(t(`support.error.${errKey}`));
      return;
    }
    setSubject("");
    setMessage("");
    toastSuccess(t("support.created"));
  }

  async function openThread(ticket: SupportTicket): Promise<void> {
    setOpenTicket(ticket);
    setReplies(await loadReplies(ticket.id));
    setReplyText("");
    setReplyError(null);
  }

  async function handleReply(): Promise<void> {
    if (openTicket === null) return;
    setReplyError(null);
    const parsed = supportReplySchema.safeParse({ ticketId: openTicket.id, body: replyText });
    if (!parsed.success) {
      setReplyError(parsed.error.issues[0]?.message ?? t("auth.error.generic"));
      return;
    }
    const errKey = await addReply(parsed.data.ticketId, parsed.data.body);
    if (errKey !== null) {
      toastError(t(`support.error.${errKey}`));
      return;
    }
    setReplies(await loadReplies(openTicket.id));
    setReplyText("");
    toastSuccess(t("support.replySent"));
  }

  // ── Ticket thread view ──────────────────────────────────────────────────
  if (openTicket !== null) {
    return (
      <div className="flex flex-col gap-4">
        <div>
          <Button variant="ghost" size="sm" onClick={() => setOpenTicket(null)}>
            <ArrowLeft size={16} />
            {t("common.back")}
          </Button>
        </div>

        <Card>
          <CardHeader
            title={openTicket.subject}
            description={`${t(`support.status.${openTicket.status}`)} · ${new Date(openTicket.created_at).toLocaleString()}`}
            actions={
              <Badge tone={statusTone(openTicket.status)}>
                {t(`support.status.${openTicket.status}`)}
              </Badge>
            }
          />
          <CardBody className="flex flex-col gap-3">
            <p className="m-0 whitespace-pre-wrap rounded-lg bg-canvas-soft p-4 text-sm text-ink">
              {openTicket.message}
            </p>

            {replies.map((r) => (
              <div
                key={r.id}
                className={`rounded-lg border p-4 ${
                  r.is_admin_reply
                    ? "border-info-soft bg-info-soft/40"
                    : "border-hairline bg-canvas"
                }`}
              >
                <p className="m-0 mb-1 text-xs text-ink-faint">
                  {r.is_admin_reply ? t("support.adminReply") : t("support.you")} ·{" "}
                  {new Date(r.created_at).toLocaleString()}
                </p>
                <p className="m-0 whitespace-pre-wrap text-sm text-ink">{r.body}</p>
              </div>
            ))}

            {openTicket.status !== "closed" && (
              <div className="mt-2 flex flex-col gap-3 border-t border-hairline pt-4">
                <Field label={t("support.replyLabel")} htmlFor="sp-reply">
                  <Textarea
                    id="sp-reply"
                    rows={3}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                  />
                </Field>
                {replyError !== null && (
                  <p role="alert" className="m-0 text-sm text-danger">
                    {replyError}
                  </p>
                )}
                <Button
                  variant="primary"
                  onClick={() => void handleReply()}
                  disabled={replyText === ""}
                  className="w-full sm:w-auto"
                >
                  <Send size={15} />
                  {t("support.replyButton")}
                </Button>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    );
  }

  // ── Ticket list + new-ticket form ────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4">
      {/* Admin support notice — popup modal */}
      {supportNotice !== null && showNoticeModal && (
        <NoticeModal
          noticeText={supportNotice}
          onDismiss={() => setShowNoticeModal(false)}
        />
      )}

      <Card>
        <CardHeader title={t("support.title")} icon={<LifeBuoy size={18} />} />
        <CardBody>
          <form onSubmit={(e) => void handleSubmit(e)} noValidate className="flex flex-col gap-4">
            <Field label={t("support.subject")} htmlFor="sp-subject">
              <Input
                id="sp-subject"
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </Field>
            <Field label={t("support.message")} htmlFor="sp-message">
              <Textarea
                id="sp-message"
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </Field>
            {formError !== null && (
              <p role="alert" className="m-0 text-sm text-danger">
                {formError}
              </p>
            )}
            <Button type="submit" loading={isSaving} className="w-full sm:w-auto">
              {t("support.submit")}
            </Button>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={t("support.yourTickets")} icon={<MessageSquare size={18} />} />
        <CardBody className="flex flex-col gap-3">
          {isLoading && <ListSkeleton rows={3} rowClass="h-14" />}

          {error !== null && (
            <p role="alert" className="m-0 text-sm text-danger">
              {t("support.error.load_failed")}
            </p>
          )}

          {!isLoading && error === null && tickets.length === 0 ? (
            <EmptyState icon={<MessageSquare size={28} />} title={t("support.empty")} />
          ) : (
            tickets.length > 0 && (
              <div className="divide-y divide-hairline overflow-hidden rounded-lg border border-hairline">
                {tickets.map((tk) => (
                  <button
                    key={tk.id}
                    type="button"
                    onClick={() => void openThread(tk)}
                    className="flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-canvas-soft"
                  >
                    <span className="wt-540 truncate text-sm text-ink">{tk.subject}</span>
                    <Badge tone={statusTone(tk.status)}>
                      {t(`support.status.${tk.status}`)}
                    </Badge>
                  </button>
                ))}
              </div>
            )
          )}
        </CardBody>
      </Card>
    </div>
  );
}
