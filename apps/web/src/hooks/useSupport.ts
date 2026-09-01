// apps/web/src/hooks/useSupport.ts
// Support tickets (user side, §6.8) — own tickets + their replies via RLS.
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { SupportReply, SupportTicket } from "@wa-marketing-bd/shared-types";

export function useSupport(): {
  tickets: SupportTicket[];
  isLoading: boolean;
  error: string | null;
  reload: () => void;
  createTicket: (subject: string, message: string) => Promise<string | null>;
  addReply: (ticketId: string, body: string) => Promise<string | null>;
  loadReplies: (ticketId: string) => Promise<SupportReply[]>;
} {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
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
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (dbError !== null) {
        setError("load_failed");
      } else {
        setTickets((data ?? []) as SupportTicket[]);
      }
      setIsLoading(false);
    })();
  }, [tick]);

  async function createTicket(subject: string, message: string): Promise<string | null> {
    const { data, error: dbError } = await supabase
      .from("support_tickets")
      .insert({ subject, message, status: "open" })
      .select("id")
      .single();
    if (dbError !== null || data === null) return "submit_failed";
    reload();
    return null;
  }

  async function addReply(ticketId: string, body: string): Promise<string | null> {
    const { error: dbError } = await supabase.from("support_replies").insert({
      ticket_id: ticketId,
      author_id: (await supabase.auth.getSession()).data.session?.user.id ?? "",
      is_admin_reply: false,
      body,
    });
    if (dbError !== null) return "reply_failed";
    return null;
  }

  async function loadReplies(ticketId: string): Promise<SupportReply[]> {
    const { data } = await supabase
      .from("support_replies")
      .select("*")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true });
    return (data ?? []) as SupportReply[];
  }

  return { tickets, isLoading, error, reload, createTicket, addReply, loadReplies };
}
