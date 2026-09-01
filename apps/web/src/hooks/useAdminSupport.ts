// apps/web/src/hooks/useAdminSupport.ts
// Admin support response (§7.5) — direct RLS-scoped writes:
// replies INSERT with is_admin_reply=true; ticket status updates.
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { SupportReply, SupportTicket } from "@wa-marketing-bd/shared-types";

export interface AdminTicketView extends SupportTicket {
  userName: string;
  userPhone: string;
}

interface JoinedTicket {
  id: string;
  user_id: string;
  subject: string;
  message: string;
  status: SupportTicket["status"];
  created_at: string;
  updated_at: string;
  profiles: { name: string; phone: string } | null;
}

export function useAdminSupport(): {
  tickets: AdminTicketView[];
  isLoading: boolean;
  error: string | null;
  reload: () => void;
  loadReplies: (ticketId: string) => Promise<SupportReply[]>;
  reply: (ticketId: string, body: string, adminId: string) => Promise<string | null>;
  setStatus: (ticketId: string, status: SupportTicket["status"]) => Promise<string | null>;
} {
  const [tickets, setTickets] = useState<AdminTicketView[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const reload = useCallback((): void => setTick((n) => n + 1), []);

  useEffect(() => {
    void (async () => {
      setIsLoading(true);
      setError(null);
      const { data, error: dbError } = await supabase
        .from("support_tickets")
        .select("*, profiles(name, phone)")
        .order("updated_at", { ascending: false })
        .limit(100);
      if (dbError !== null) setError("load_failed");
      else
        setTickets(
          ((data ?? []) as JoinedTicket[]).map((t) => ({
            id: t.id,
            user_id: t.user_id,
            subject: t.subject,
            message: t.message,
            status: t.status,
            created_at: t.created_at,
            updated_at: t.updated_at,
            userName: t.profiles?.name ?? "—",
            userPhone: t.profiles?.phone ?? "—",
          })),
        );
      setIsLoading(false);
    })();
  }, [tick]);

  async function loadReplies(ticketId: string): Promise<SupportReply[]> {
    const { data } = await supabase
      .from("support_replies")
      .select("*")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true });
    return (data ?? []) as SupportReply[];
  }

  async function reply(ticketId: string, body: string, adminId: string): Promise<string | null> {
    const { error: dbError } = await supabase.from("support_replies").insert({
      ticket_id: ticketId,
      author_id: adminId,
      is_admin_reply: true,
      body,
    });
    if (dbError !== null) return "reply_failed";
    // Replying marks the ticket as replied (admin RLS update policy).
    await supabase.from("support_tickets").update({ status: "replied" }).eq("id", ticketId);
    reload();
    return null;
  }

  async function setStatus(ticketId: string, status: SupportTicket["status"]): Promise<string | null> {
    const { error: dbError } = await supabase
      .from("support_tickets")
      .update({ status })
      .eq("id", ticketId);
    if (dbError !== null) return "status_failed";
    reload();
    return null;
  }

  return { tickets, isLoading, error, reload, loadReplies, reply, setStatus };
}
