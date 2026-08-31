// packages/shared-types/src/constants.ts
// Shared enumerations and constants used across apps/web and Edge Functions.
// Edge Functions keep local copies of the specific values they need
// (Supabase deploy bundles only the function's own directory).
//
// IMPORTANT: Postgres native enum types in the DB mirror these values exactly.
// If you add or rename a value here, you must also add it with ALTER TYPE in a new migration.

// ─── Auth / Phone ─────────────────────────────────────────────────────────────

/**
 * The email domain used for synthesized Supabase Auth emails.
 * Phone-number signup converts: 01XXXXXXXXX → 01XXXXXXXXX@phone.wamarketingbd.internal
 * Login does the same conversion before calling supabase.auth.signInWithPassword().
 * This constant is the single source of truth for that domain — never hardcode it elsewhere.
 */
export const PHONE_EMAIL_DOMAIN = "phone.wamarketingbd.internal" as const;

/** Constructs the synthesized email from a Bangladeshi phone number. */
export function phoneToEmail(phone: string): string {
  return `${phone}@${PHONE_EMAIL_DOMAIN}`;
}

// ─── User Roles ───────────────────────────────────────────────────────────────

/** Supabase Auth user roles — mirrors Postgres enum `user_role`. */
export const USER_ROLE = {
  USER: "user",
  SU_ADMIN: "su_admin",
} as const;

export type UserRole = (typeof USER_ROLE)[keyof typeof USER_ROLE];

// ─── Task ─────────────────────────────────────────────────────────────────────

/** Task lifecycle status — mirrors Postgres enum `task_status`. */
export const TASK_STATUS = {
  ACTIVE: "active",
  PAUSED: "paused",
  EXPIRED: "expired",
} as const;

export type TaskStatus = (typeof TASK_STATUS)[keyof typeof TASK_STATUS];

// ─── Submission ───────────────────────────────────────────────────────────────

/** Status of a task submission — mirrors Postgres enum `submission_status`. */
export const SUBMISSION_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
} as const;

export type SubmissionStatus =
  (typeof SUBMISSION_STATUS)[keyof typeof SUBMISSION_STATUS];

/** Maximum length of a rejection reason string (enforced client + Edge Function). */
export const REJECTION_REASON_MAX_LEN = 1000 as const;

// ─── Wallet / Withdrawal ──────────────────────────────────────────────────────

/** Status of a withdrawal request — mirrors Postgres enum `withdrawal_status`. */
export const WITHDRAWAL_STATUS = {
  PENDING: "pending",
  COMPLETED: "completed",
  REJECTED: "rejected",
} as const;

export type WithdrawalStatus =
  (typeof WITHDRAWAL_STATUS)[keyof typeof WITHDRAWAL_STATUS];

/** Supported MFS (Mobile Financial Service) providers — mirrors Postgres enum `mfs_provider`. */
export const MFS_PROVIDER = {
  BKASH: "bkash",
  NAGAD: "nagad",
  ROCKET: "rocket",
  UPAY: "upay",
} as const;

export type MfsProvider = (typeof MFS_PROVIDER)[keyof typeof MFS_PROVIDER];

// ─── Support Tickets ──────────────────────────────────────────────────────────

/** Status of a support ticket — mirrors Postgres enum `ticket_status`. */
export const TICKET_STATUS = {
  OPEN: "open",
  REPLIED: "replied",
  CLOSED: "closed",
} as const;

export type TicketStatus = (typeof TICKET_STATUS)[keyof typeof TICKET_STATUS];

// ─── Removed in Milestone 2 ────────────────────────────────────────────────────
// P2P_STATUS removed: P2P transfers are atomic (committed or rolled back) —
//   there is no "pending" P2P state, so no DB enum or TS constant is needed.
//
// HISTORY_KIND removed: "history" is a derived query across multiple tables,
//   not a dedicated DB table. The filter tabs in the History page UI can use
//   string literals directly without a shared constant.
