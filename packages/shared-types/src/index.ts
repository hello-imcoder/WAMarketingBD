// packages/shared-types/src/index.ts
// Public surface of the shared-types package.
// Import from "@wa-marketing-bd/shared-types" in apps/web.
// Edge Functions keep local copies of the specific types they need.

export * from "./constants.js";
export * from "./schemas.js";

// ─── Database row types ───────────────────────────────────────────────────────
// These match the SQL schema applied in Milestone 2 migrations exactly.
// Column types: integer → number, text → string, boolean → boolean,
//   timestamptz → string (ISO 8601), uuid → string, inet → string.
// Nullable columns are typed as `T | null`.

import type {
  UserRole,
  TaskStatus,
  SubmissionStatus,
  WithdrawalStatus,
  MfsProvider,
  TicketStatus,
} from "./constants.js";

// ── profiles (0002_profiles.sql) ──────────────────────────────────────────────
export type Profile = {
  id: string;              // uuid — matches auth.users.id
  phone: string;           // 11-digit Bangladeshi phone
  name: string;
  email: string | null;    // optional (collected at onboarding)
  role: UserRole;
  referral_code: string;   // 8-char alphanumeric, generated at signup
  referred_by: string | null; // profiles.id of referrer
  is_verified: boolean;    // admin-set manual verification (§5)
  is_banned: boolean;      // (§7.4)
  suspended_at: string | null; // timestamptz — null = not suspended
  created_at: string;
  updated_at: string;
  last_seen_notice_at: string | null;
};

// ── tasks (0003_tasks.sql) ────────────────────────────────────────────────────
export type Task = {
  id: string;
  whatsapp_number: string; // 7–15 digits, no leading +
  message: string;         // Message to send via WhatsApp
  payout_amount: number;   // BDT taka (integer, positive)
  max_completions: number;
  completion_count: number;
  expires_at: string;      // timestamptz
  status: TaskStatus;
  created_by: string;      // auth.users.id — always su_admin
  created_at: string;
  updated_at: string;
};

// ── submissions (0004_submissions.sql) ────────────────────────────────────────
export type Submission = {
  id: string;
  task_id: string;
  user_id: string;
  status: SubmissionStatus;
  screenshot_url: string | null;      // Cloudinary URL; optional per §6.2
  screenshot_hash: string | null;     // SHA-256 hex; null if no screenshot (§8)
  rejection_reason: string | null;    // required when status = 'rejected' (§7.2)
  wa_link_clicked_at: string | null;  // timestamptz; fraud signal (§8)
  ip_address: string | null;          // fraud signal (§8)
  device_fingerprint: string | null;  // fraud signal (§8)
  submitted_at: string;
  reviewed_at: string | null;
};

// ── wallets (0005_wallets.sql) ────────────────────────────────────────────────
export type Wallet = {
  id: string;
  user_id: string;
  balance_total: number;    // BDT taka — verified + pending (stored, §6.3)
  balance_verified: number; // BDT taka — withdrawable (stored, §6.3)
  updated_at: string;
};

// ── withdrawals (0006_withdrawals.sql) ────────────────────────────────────────
export type Withdrawal = {
  id: string;
  user_id: string;
  amount: number;           // BDT taka (integer, positive)
  provider: MfsProvider;
  account_number: string;   // MFS account to send to
  status: WithdrawalStatus;
  admin_note: string | null; // optional admin note on completion/rejection
  requested_at: string;
  processed_at: string | null;
};

// ── p2p_transfers (0007_p2p_transfers.sql) ────────────────────────────────────
export type P2pTransfer = {
  id: string;
  sender_id: string;
  recipient_id: string;
  amount: number;   // BDT taka (integer, positive)
  transferred_at: string;
  // No status — transfers are atomic (committed or rolled back entirely)
  // No fee/limit fields — explicitly out of scope for v1 (§14)
};

// ── referrals (0008_referrals.sql) ────────────────────────────────────────────
export type Referral = {
  id: string;
  referrer_id: string;
  referred_id: string;
  bonus_amount: number;        // BDT taka — snapshot at referral creation time
  bonus_paid: boolean;         // true once credited to referrer's wallet
  triggered_at: string | null; // set when referred user's first task is approved (§6.5)
  created_at: string;
};

// ── support_tickets (0009_support.sql) ────────────────────────────────────────
export type SupportTicket = {
  id: string;
  user_id: string;
  subject: string;
  message: string; // user's opening message
  status: TicketStatus;
  created_at: string;
  updated_at: string;
  // No admin_reply column — replies are in support_replies table (approved decision)
};

// ── support_replies (0009_support.sql) ────────────────────────────────────────
export type SupportReply = {
  id: string;
  ticket_id: string;
  author_id: string;     // auth.users.id — user or admin
  is_admin_reply: boolean;
  body: string;
  created_at: string;
};

// ── site_settings (0010_site_settings.sql) ────────────────────────────────────
export type SiteSettings = {
  id: 1;                         // singleton — always 1
  min_withdrawal_amount: number; // BDT taka, admin-configurable (§7.3)
  referral_bonus_amount: number; // BDT taka, admin-configurable (kickoff Q9)
  updated_at: string;
  admin_notice_text: string | null;
  is_admin_notice_active: boolean;
  admin_notice_updated_at: string | null;
  support_notice_text: string | null;
  is_support_notice_active: boolean;
  require_screenshot: boolean;
};

// ── rate_limit_counters (0011_rate_limit_counters.sql) ────────────────────────
// Internal table — not exposed to client code directly.
// Used by Edge Functions via service-role key only.
export type RateLimitCounter = {
  id: string;
  key: string;          // e.g. 'login:ip:1.2.3.4'
  count: number;
  window_start: string; // timestamptz
  expires_at: string;   // timestamptz
};
