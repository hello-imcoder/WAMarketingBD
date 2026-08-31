// packages/shared-types/src/index.ts
// Public surface of the shared-types package.
// Import from "@wa-marketing-bd/shared-types" in apps/web.

export * from "./constants.js";
export * from "./schemas.js";

// ─── Database row types ───────────────────────────────────────────────────────
// Placeholder types matching the planned schema (Milestone 2).
// These will be replaced with generated types from Supabase once the schema exists.

export type Profile = {
  id: string; // uuid — matches auth.users.id
  phone: string;
  name: string;
  email: string | null;
  referral_code: string;
  referred_by: string | null; // profile.id of referrer
  is_verified: boolean;
  is_banned: boolean;
  role: import("./constants.js").UserRole;
  created_at: string;
};

export type Task = {
  id: string;
  whatsapp_number: string;
  message: string;
  payout_amount: number; // BDT taka (integer)
  max_completions: number;
  completion_count: number;
  expires_at: string;
  is_paused: boolean;
  created_at: string;
};

export type Submission = {
  id: string;
  task_id: string;
  user_id: string;
  status: import("./constants.js").SubmissionStatus;
  screenshot_public_id: string | null;
  screenshot_hash: string | null; // SHA-256 for duplicate detection (§8)
  rejection_reason: string | null;
  ip_address: string | null; // fraud signal (§8)
  device_fingerprint: string | null; // fraud signal (§8)
  wa_link_clicked_at: string | null; // fraud signal (§8)
  submitted_at: string;
  reviewed_at: string | null;
};

export type Wallet = {
  id: string;
  user_id: string;
  balance_total: number; // verified + pending (BDT taka)
  balance_verified: number; // withdrawable (BDT taka)
  updated_at: string;
};

export type Withdrawal = {
  id: string;
  user_id: string;
  amount: number;
  provider: import("./constants.js").MfsProvider;
  account_number: string;
  status: import("./constants.js").WithdrawalStatus;
  requested_at: string;
  processed_at: string | null;
};

export type P2pTransfer = {
  id: string;
  sender_id: string;
  recipient_id: string;
  amount: number;
  status: import("./constants.js").P2pStatus;
  transferred_at: string;
};

export type Referral = {
  id: string;
  referrer_id: string;
  referred_id: string;
  bonus_amount: number;
  bonus_paid: boolean;
  first_task_completed_at: string | null; // bonus triggers here (§6.5)
  created_at: string;
};

export type SupportTicket = {
  id: string;
  user_id: string;
  subject: string;
  message: string;
  status: import("./constants.js").TicketStatus;
  admin_reply: string | null;
  created_at: string;
  replied_at: string | null;
};

export type SiteSettings = {
  id: number; // singleton row (id = 1)
  min_withdrawal_amount: number; // BDT taka, admin-configurable (§7.3)
  referral_bonus_amount: number; // BDT taka, admin-configurable (kickoff Q9)
  updated_at: string;
};
