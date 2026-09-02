// apps/web/src/pages/rexio-admin/AdminSupportPage.tsx
// Route: "/rexio-admin/support" — two-pane ticket view on desktop (list left,
// thread right), stacked on mobile. Reply + status change (open/replied/closed)
// are direct RLS writes. The Support Notice editor moved to the Settings page.
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/stores/authStore";
import { useAdminSupport } from "@/hooks/useAdminSupport";
import type { SupportReply } from "@wa-marketing-bd/shared-types";
import {
  PageHeader,
  Badge,
  statusTone,
  Button,
  Input,
  EmptyState,
  ListSkeleton,
  useToast,
} from "@/components/admin/ui";

type TicketTab = "all" | "open" | "replied" | "closed";

export default function AdminSupportPage(): React.ReactElement {
  const { t } = useTranslation();
  const session = useAuthStore((s) => s.session);
  const { success, error: toastError } = useToast();
  const { tickets, isLoading, error, loadReplies, reply, setStatus } = useAdminSupport();
  const [tab, setTab] = useState<TicketTab>("all");
  const [openTicketId, setOpenTicketId] = useState<string | null>(null);
  const [replies, setReplies] = useState<SupportReply[]>([]);
  const [repliesLoading, setRepliesLoading] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const visible =
    tab === "all" ? tickets : tickets.filter((ticket) => ticket.status === tab);
  const openTicket = tickets.find((ticket) => ticket.id === openTicketId) ?? null;

  async function openThread(ticketId: string): Promise<void> {
    setOpenTicketId(ticketId);
    setRepliesLoading(true);
    setReplies(await loadReplies(ticketId));
    setRepliesLoading(false);
  }

  async function sendReply(): Promise<void> {
    if (openTicketId === null || session === null || draft.trim() === "") return;
    setSending(true);
    const err = await reply(openTicketId, draft.trim(), session.user.id);
    setSending(false);
    if (err !== null) {
      toastError(t(`admin.error.${err}`));
      return;
    }
    setDraft("");
    setReplies(await loadReplies(openTicketId));
    success(t("admin.support.replySentToast"));
  }

  async function changeStatus(ticketId: string, status: "open" | "replied" | "closed"): Promise<void> {
    const err = await setStatus(ticketId, status);
    if (err !== null) {
      toastError(t(`admin.error.${err}`));
      return;
    }
    await openThread(ticketId);
  }

  const tabs: Array<{ key: TicketTab; label: string }> = [
    { key: "all", label: t("admin.filter.all") },
    { key: "open", label: t("support.status.open") },
    { key: "replied", label: t("support.status.replied") },
    { key: "closed", label: t("support.status.closed") },
  ];

  return (
    <>
      <PageHeader title={t("admin.support.title")} description={t("admin.support.pageDesc")} />

      <div className="mb-4 flex flex-wrap gap-1.5">
        {tabs.map((tabItem) => (
          <button
            key={tabItem.key}
            type="button"
            onClick={() => setTab(tabItem.key)}
            className={`cursor-pointer rounded-full px-3 py-1.5 text-[13px] wt-540 transition-colors ${
              tab === tabItem.key
                ? "bg-primary text-on-primary"
                : "border border-hairline bg-canvas text-ink-mute hover:bg-canvas-soft"
            }`}
          >
            {tabItem.label}
          </button>
        ))}
      </div>

      {error !== null && (
        <p role="alert" className="mb-4 text-sm text-danger">
          {t("admin.error.load_failed")}
        </p>
      )}

      {isLoading ? (
        <ListSkeleton rows={5} />
      ) : visible.length === 0 ? (
        <EmptyState title={t("admin.support.empty")} />
      ) : (
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          {/* ── Ticket list ─────────────────────────────────────────── */}
          <div className="flex flex-col gap-2">
            {visible.map((ticket) => (
              <button
                key={ticket.id}
                type="button"
                onClick={() => void openThread(ticket.id)}
                className={`cursor-pointer rounded-xl border bg-canvas p-4 text-left shadow-1 transition-colors ${
                  openTicketId === ticket.id
                    ? "border-info"
                    : "border-hairline hover:border-ink-faint"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="m-0 truncate text-sm wt-540 text-ink">{ticket.subject}</p>
                  <Badge tone={statusTone(ticket.status)}>
                    {t(`support.status.${ticket.status}`)}
                  </Badge>
                </div>
                <p className="m-0 mt-1 truncate text-xs text-ink-mute">
                  {ticket.userName} · {ticket.userPhone} ·{" "}
                  {new Date(ticket.created_at).toLocaleString()}
                </p>
              </button>
            ))}
          </div>

          {/* ── Thread pane ─────────────────────────────────────────── */}
          <div className="rounded-xl border border-hairline bg-canvas shadow-1">
            {openTicket === null ? (
              <div className="p-4">
                <EmptyState title={t("admin.support.selectTicket")} />
              </div>
            ) : (
              <div className="flex flex-col">
                <div className="border-b border-hairline p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="m-0 wt-540 text-sm text-ink">{openTicket.subject}</p>
                    <Badge tone={statusTone(openTicket.status)}>
                      {t(`support.status.${openTicket.status}`)}
                    </Badge>
                  </div>
                  <p className="m-0 mt-1 text-xs text-ink-mute">
                    {openTicket.userName} · {openTicket.userPhone}
                  </p>
                  <p className="m-0 mt-3 whitespace-pre-wrap text-[13px] text-ink">
                    {openTicket.message}
                  </p>
                </div>

                <div className="flex flex-col gap-2 border-b border-hairline p-5">
                  {repliesLoading && (
                    <p role="status" className="m-0 text-xs text-ink-mute">
                      {t("common.loading")}
                    </p>
                  )}
                  {replies.map((r) => (
                    <div
                      key={r.id}
                      className={`max-w-[85%] rounded-lg px-3 py-2 text-[13px] ${
                        r.is_admin_reply
                          ? "self-end bg-info-soft text-ink"
                          : "self-start bg-canvas-soft text-ink"
                      }`}
                    >
                      <p className="m-0 wt-540 text-xs text-ink-mute">
                        {r.is_admin_reply ? t("support.adminReply") : openTicket.userName}
                      </p>
                      <p className="m-0 whitespace-pre-wrap">{r.body}</p>
                    </div>
                  ))}
                  {!repliesLoading && replies.length === 0 && (
                    <p className="m-0 text-xs text-ink-faint">{t("admin.support.noReplies")}</p>
                  )}
                </div>

                {openTicket.status !== "closed" && (
                  <div className="flex flex-col gap-2 p-5">
                    <div className="flex gap-2">
                      <Input
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        placeholder={t("admin.support.replyPlaceholder")}
                        aria-label={t("admin.support.replyPlaceholder")}
                      />
                      <Button loading={sending} onClick={() => void sendReply()}>
                        {t("admin.support.sendReply")}
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void changeStatus(openTicket.id, "closed")}
                      >
                        {t("admin.support.closeTicket")}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => void changeStatus(openTicket.id, "open")}
                      >
                        {t("admin.support.reopenTicket")}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
