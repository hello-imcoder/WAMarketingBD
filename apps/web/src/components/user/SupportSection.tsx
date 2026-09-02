// apps/web/src/components/user/SupportSection.tsx
// Support section of Settings (§6.7) — open a ticket, list own tickets,
// view a ticket thread with replies (admin responses come in Milestone 11).
// Fetches support_notice_text from site_settings and shows it as a popup
// modal (using NoticeModal) when is_support_notice_active is true.
import { useState, useEffect, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useSupport } from "@/hooks/useSupport";
import { supabase } from "@/lib/supabase";
import { supportTicketSchema, supportReplySchema } from "@/lib/validators";
import { NoticeModal } from "@/components/app/NoticeModal";
import type { SupportReply, SupportTicket } from "@wa-marketing-bd/shared-types";

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px",
  marginBottom: "var(--spacing-lg)",
  border: "1px solid var(--color-hairline)",
  borderRadius: "var(--rounded-sm)",
  fontSize: "16px",
  boxSizing: "border-box",
};

export function SupportSection(): React.ReactElement {
  const { t } = useTranslation();
  const { tickets, isLoading, error, createTicket, addReply, loadReplies } = useSupport();

  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
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
    setSuccess(false);
    const parsed = supportTicketSchema.safeParse({ subject, message });
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? t("auth.error.generic"));
      return;
    }
    setIsSaving(true);
    const errKey = await createTicket(parsed.data.subject, parsed.data.message);
    setIsSaving(false);
    if (errKey !== null) {
      setFormError(t(`support.error.${errKey}`));
      return;
    }
    setSubject("");
    setMessage("");
    setSuccess(true);
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
      setReplyError(t(`support.error.${errKey}`));
      return;
    }
    setReplies(await loadReplies(openTicket.id));
    setReplyText("");
  }

  return (
    <section className="settings-section">
      <h2 className="settings-section-title">{t("support.title")}</h2>

      {/* Admin support notice — popup modal */}
      {supportNotice !== null && showNoticeModal && (
        <NoticeModal
          noticeText={supportNotice}
          onDismiss={() => setShowNoticeModal(false)}
        />
      )}

      {openTicket !== null ? (
        <div>
          <button
            type="button"
            className="auth-submit-btn"
            style={{ maxWidth: "120px" }}
            onClick={() => setOpenTicket(null)}
          >
            {t("common.back")}
          </button>
          <h3 style={{ fontSize: "20px", fontVariationSettings: '"wght" 540', margin: "16px 0 4px" }}>
            {openTicket.subject}
          </h3>
          <p style={{ margin: "0 0 16px", fontSize: "12px", color: "var(--color-ink-faint)" }}>
            {t(`support.status.${openTicket.status}`)} · {new Date(openTicket.created_at).toLocaleString()}
          </p>
          <p
            style={{
              whiteSpace: "pre-wrap",
              background: "var(--color-canvas-soft)",
              padding: "var(--spacing-lg)",
              borderRadius: "var(--rounded-md)",
            }}
          >
            {openTicket.message}
          </p>
          {replies.map((r) => (
            <div
              key={r.id}
              style={{
                border: "1px solid var(--color-hairline)",
                borderRadius: "var(--rounded-md)",
                padding: "var(--spacing-lg)",
                marginBottom: "var(--spacing-md)",
                background: r.is_admin_reply ? "var(--color-canvas-soft)" : "var(--color-canvas)",
              }}
            >
              <p style={{ margin: "0 0 4px", fontSize: "12px", color: "var(--color-ink-faint)" }}>
                {r.is_admin_reply ? t("support.adminReply") : t("support.you")} ·{" "}
                {new Date(r.created_at).toLocaleString()}
              </p>
              <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{r.body}</p>
            </div>
          ))}
          {openTicket.status !== "closed" && (
            <div style={{ marginTop: "var(--spacing-lg)" }}>
              <label htmlFor="sp-reply" style={{ display: "block", fontSize: "14px", fontVariationSettings: '"wght" 600', margin: "0 0 4px" }}>
                {t("support.replyLabel")}
              </label>
              <textarea
                id="sp-reply"
                rows={3}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                style={inputStyle}
              />
              {replyError !== null && (
                <p role="alert" className="auth-error">
                  {replyError}
                </p>
              )}
              <button
                type="button"
                className="auth-submit-btn"
                style={{ maxWidth: "200px" }}
                onClick={() => void handleReply()}
                disabled={replyText === ""}
              >
                {t("support.replyButton")}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div>
          <form onSubmit={(e) => void handleSubmit(e)} noValidate>
            <label htmlFor="sp-subject" style={{ display: "block", fontSize: "14px", fontVariationSettings: '"wght" 600', margin: "0 0 4px" }}>
              {t("support.subject")}
            </label>
            <input
              id="sp-subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              style={inputStyle}
            />
            <label htmlFor="sp-message" style={{ display: "block", fontSize: "14px", fontVariationSettings: '"wght" 600', margin: "0 0 4px" }}>
              {t("support.message")}
            </label>
            <textarea
              id="sp-message"
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              style={inputStyle}
            />
            {formError !== null && (
              <p role="alert" className="auth-error">
                {formError}
              </p>
            )}
            {success && (
              <p role="status" className="settings-success">
                {t("support.created")}
              </p>
            )}
            <button type="submit" className="auth-submit-btn" disabled={isSaving} style={{ maxWidth: "240px" }}>
              {isSaving ? t("common.saving") : t("support.submit")}
            </button>
          </form>

          <h3 style={{ fontSize: "18px", fontVariationSettings: '"wght" 540', margin: "var(--spacing-xxl) 0 var(--spacing-md)" }}>
            {t("support.yourTickets")}
          </h3>
          {isLoading && <p role="status">{t("common.loading")}</p>}
          {error !== null && (
            <p role="alert" className="auth-error">
              {t("support.error.load_failed")}
            </p>
          )}
          {!isLoading && error === null && tickets.length === 0 && (
            <p style={{ color: "var(--color-ink-mute)", fontSize: "14px" }}>{t("support.empty")}</p>
          )}
          {tickets.map((tk) => (
            <button
              key={tk.id}
              type="button"
              onClick={() => void openThread(tk)}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                border: "1px solid var(--color-hairline)",
                borderRadius: "var(--rounded-md)",
                padding: "var(--spacing-lg)",
                marginBottom: "var(--spacing-md)",
                background: "var(--color-canvas)",
                cursor: "pointer",
              }}
            >
              <strong style={{ fontSize: "14px" }}>{tk.subject}</strong>
              <span style={{ float: "right", fontSize: "12px", color: "var(--color-ink-mute)" }}>
                {t(`support.status.${tk.status}`)}
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
