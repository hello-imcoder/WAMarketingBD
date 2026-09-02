// apps/web/src/pages/rexio-admin/AdminSupportPage.tsx
// Route: "/rexio-admin/support" — ticket list + thread view + reply +
// status change (open/replied/closed). Direct RLS-scoped writes:
// support_replies admin INSERT (is_admin_reply=true) + tickets admin UPDATE.
// Also contains a "Support Notice" editor that writes to site_settings
// (support_notice_text / is_support_notice_active), shown to users on the
// Support tab in SupportSection.tsx.
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/stores/authStore";
import { useAdminSupport } from "@/hooks/useAdminSupport";
import { supabase } from "@/lib/supabase";
import type { SupportReply } from "@wa-marketing-bd/shared-types";

export default function AdminSupportPage(): React.ReactElement {
  const { t } = useTranslation();
  const session = useAuthStore((s) => s.session);
  const { tickets, isLoading, error, loadReplies, reply, setStatus } = useAdminSupport();
  const [openTicketId, setOpenTicketId] = useState<string | null>(null);
  const [replies, setReplies] = useState<SupportReply[]>([]);
  const [draft, setDraft] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  // ── Support Notice editor state ───────────────────────────────────────────
  const [noticeText, setNoticeText] = useState("");
  const [noticeActive, setNoticeActive] = useState(false);
  const [noticeLoading, setNoticeLoading] = useState(true);
  const [noticeSaving, setNoticeSaving] = useState(false);

  useEffect(() => {
    async function fetchNotice(): Promise<void> {
      const { data } = await supabase
        .from("site_settings")
        .select("support_notice_text, is_support_notice_active")
        .eq("id", 1)
        .maybeSingle();
      if (data !== null && data !== undefined) {
        setNoticeText(data.support_notice_text ?? "");
        setNoticeActive(data.is_support_notice_active ?? false);
      }
      setNoticeLoading(false);
    }
    void fetchNotice();
  }, []);

  async function handleNoticeSave(): Promise<void> {
    setNoticeSaving(true);
    await supabase
      .from("site_settings")
      .update({ support_notice_text: noticeText, is_support_notice_active: noticeActive })
      .eq("id", 1);
    setNoticeSaving(false);
    alert(t("admin.support.noticeSaved"));
  }

  async function openThread(ticketId: string): Promise<void> {
    setOpenTicketId(ticketId);
    setActionError(null);
    setReplies(await loadReplies(ticketId));
  }

  async function sendReply(): Promise<void> {
    if (openTicketId === null || session === null || draft.trim() === "") return;
    setActionError(null);
    const err = await reply(openTicketId, draft.trim(), session.user.id);
    if (err !== null) setActionError(err);
    else {
      setDraft("");
      setReplies(await loadReplies(openTicketId));
    }
  }

  async function changeStatus(ticketId: string, status: "open" | "replied" | "closed"): Promise<void> {
    setActionError(null);
    const err = await setStatus(ticketId, status);
    if (err !== null) setActionError(err);
  }

  return (
    <div style={{ display: "grid", gap: "var(--spacing-xl)" }}>
      <h1 style={{ fontSize: "22px", fontVariationSettings: '"wght" 540', margin: 0 }}>
        {t("admin.support.title")}
      </h1>

      {/* ── Support Notice Editor ───────────────────────────────────────── */}
      <div
        style={{
          border: "1px solid var(--color-hairline)",
          borderRadius: "var(--rounded-lg)",
          padding: "var(--spacing-xl)",
          background: "var(--color-canvas)",
        }}
      >
        <h2 style={{ fontSize: "16px", margin: "0 0 var(--spacing-sm)", fontVariationSettings: '"wght" 600' }}>
          📢 {t("admin.support.noticeTitle")}
        </h2>
        <p style={{ color: "var(--color-ink-mute)", fontSize: "13px", margin: "0 0 var(--spacing-md)" }}>
          {t("admin.support.noticeDescription")}
        </p>
        {noticeLoading ? (
          <p role="status">{t("common.loading")}</p>
        ) : (
          <>
            <div style={{ marginBottom: "var(--spacing-md)" }}>
              <label
                htmlFor="support-notice-text"
                style={{ display: "block", fontSize: "13px", fontVariationSettings: '"wght" 500', marginBottom: "4px" }}
              >
                {t("admin.support.noticeText")}
              </label>
              <textarea
                id="support-notice-text"
                rows={4}
                value={noticeText}
                onChange={(e) => setNoticeText(e.target.value)}
                placeholder={t("admin.support.noticePlaceholder")}
                style={{
                  width: "100%",
                  border: "1px solid var(--color-hairline)",
                  borderRadius: "var(--rounded-sm)",
                  padding: "var(--spacing-sm)",
                  fontSize: "14px",
                  resize: "vertical",
                  background: "transparent",
                  color: "var(--color-ink)",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div style={{ marginBottom: "var(--spacing-lg)" }}>
              <label
                htmlFor="support-notice-status"
                style={{ display: "block", fontSize: "13px", fontVariationSettings: '"wght" 500', marginBottom: "4px" }}
              >
                {t("admin.support.noticeStatus")}
              </label>
              <select
                id="support-notice-status"
                value={noticeActive ? "active" : "inactive"}
                onChange={(e) => setNoticeActive(e.target.value === "active")}
                style={{
                  width: "100%",
                  border: "1px solid var(--color-hairline)",
                  borderRadius: "var(--rounded-sm)",
                  padding: "var(--spacing-sm)",
                  fontSize: "14px",
                  background: "transparent",
                  color: "var(--color-ink)",
                }}
              >
                <option value="active">✅ {t("admin.support.noticeStatusActive")}</option>
                <option value="inactive">❌ {t("admin.support.noticeStatusInactive")}</option>
              </select>
            </div>
            <button
              type="button"
              onClick={() => void handleNoticeSave()}
              disabled={noticeSaving}
              style={{
                background: "var(--color-primary)",
                color: "var(--color-on-primary)",
                border: "none",
                borderRadius: "var(--rounded-md)",
                padding: "10px 20px",
                fontSize: "14px",
                fontVariationSettings: '"wght" 600',
                cursor: noticeSaving ? "not-allowed" : "pointer",
              }}
            >
              {noticeSaving ? t("common.saving") : t("admin.support.noticeSave")}
            </button>
          </>
        )}
      </div>

      {/* ── Ticket list ─────────────────────────────────────────────────── */}
      {isLoading && <p role="status">{t("common.loading")}</p>}
      {error !== null && <p role="alert">{t("admin.error.load_failed")}</p>}
      {actionError !== null && <p role="alert" style={{ color: "#b3261e" }}>{t(`admin.error.${actionError}`)}</p>}
      <div style={{ display: "grid", gap: "var(--spacing-md)" }}>
        {tickets.map((ticket) => (
          <div key={ticket.id} style={{ border: "1px solid var(--color-hairline)", borderRadius: "var(--rounded-md)", padding: "var(--spacing-lg)", background: "var(--color-canvas)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "var(--spacing-md)" }}>
              <div>
                <p style={{ margin: 0, fontSize: "14px", fontVariationSettings: '"wght" 600' }}>{ticket.subject}</p>
                <p style={{ margin: "4px 0 0", fontSize: "12px", color: "var(--color-ink-mute)" }}>
                  {ticket.userName} · {ticket.userPhone} · {new Date(ticket.created_at).toLocaleString()}
                </p>
                <p style={{ margin: "8px 0 0", fontSize: "13px", whiteSpace: "pre-wrap" }}>{ticket.message}</p>
              </div>
              <div style={{ display: "flex", gap: "var(--spacing-sm)", alignItems: "flex-start" }}>
                <span style={{ fontSize: "12px", color: ticket.status === "closed" ? "var(--color-ink-faint)" : "var(--color-surface-teal-deep)" }}>
                  {t(`support.status.${ticket.status}`)}
                </span>
                <button type="button" onClick={() => void openThread(ticket.id)}
                  style={{ padding: "8px 12px", borderRadius: "var(--rounded-sm)", border: "1px solid var(--color-hairline)", background: "transparent", fontSize: "12px", cursor: "pointer" }}>
                  {openTicketId === ticket.id ? t("admin.support.hideThread") : t("admin.support.viewThread")}
                </button>
              </div>
            </div>

            {openTicketId === ticket.id && (
              <div style={{ marginTop: "var(--spacing-lg)", borderTop: "1px solid var(--color-hairline)", paddingTop: "var(--spacing-lg)" }}>
                {replies.map((r) => (
                  <p key={r.id} style={{ margin: "0 0 8px", fontSize: "13px" }}>
                    <strong>{r.is_admin_reply ? t("support.adminReply") : ticket.userName}:</strong> {r.body}
                  </p>
                ))}
                {ticket.status !== "closed" && (
                  <div style={{ display: "flex", gap: "var(--spacing-sm)", marginTop: "var(--spacing-md)", flexWrap: "wrap" }}>
                    <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={t("admin.support.replyPlaceholder")}
                      style={{ flex: 1, minWidth: "220px", padding: "10px 12px", border: "1px solid var(--color-hairline)", borderRadius: "var(--rounded-sm)", fontSize: "14px" }} />
                    <button type="button" onClick={() => void sendReply()}
                      style={{ padding: "10px 16px", borderRadius: "var(--rounded-sm)", border: "none", background: "var(--color-primary)", color: "var(--color-on-primary)", fontSize: "13px", fontVariationSettings: '"wght" 600', cursor: "pointer" }}>
                      {t("admin.support.sendReply")}
                    </button>
                    <button type="button" onClick={() => void changeStatus(ticket.id, "closed")}
                      style={{ padding: "10px 16px", borderRadius: "var(--rounded-sm)", border: "1px solid var(--color-hairline)", background: "transparent", fontSize: "13px", cursor: "pointer" }}>
                      {t("admin.support.closeTicket")}
                    </button>
                    <button type="button" onClick={() => void changeStatus(ticket.id, "open")}
                      style={{ padding: "10px 16px", borderRadius: "var(--rounded-sm)", border: "1px solid var(--color-hairline)", background: "transparent", fontSize: "13px", cursor: "pointer" }}>
                      {t("admin.support.reopenTicket")}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        {!isLoading && tickets.length === 0 && <p style={{ color: "var(--color-ink-mute)" }}>{t("admin.support.empty")}</p>}
      </div>
    </div>
  );
}
