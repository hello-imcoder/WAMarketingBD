// packages/shared-types/src/constants.ts
// Shared enumerations and constants used across apps/web and Edge Functions.
// Edge Functions keep local copies of the specific values they need
// (Supabase deploy bundles only the function's own directory).

// ─── Task ────────────────────────────────────────────────────────────────────

/** Status of a task submission. */
export const SUBMISSION_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
} as const;

export type SubmissionStatus =
  (typeof SUBMISSION_STATUS)[keyof typeof SUBMISSION_STATUS];

// ─── Wallet / Withdrawal ─────────────────────────────────────────────────────

/** Status of a withdrawal request. */
export const WITHDRAWAL_STATUS = {
  PENDING: "pending",
  COMPLETED: "completed",
  REJECTED: "rejected",
} as const;

export type WithdrawalStatus =
  (typeof WITHDRAWAL_STATUS)[keyof typeof WITHDRAWAL_STATUS];

/** Supported MFS (Mobile Financial Service) providers in Bangladesh. */
export const MFS_PROVIDER = {
  BKASH: "bkash",
  NAGAD: "nagad",
  ROCKET: "rocket",
  UPAY: "upay",
} as const;

export type MfsProvider = (typeof MFS_PROVIDER)[keyof typeof MFS_PROVIDER];

// ─── P2P Transfer ────────────────────────────────────────────────────────────

/** Status of a P2P transfer. */
export const P2P_STATUS = {
  COMPLETED: "completed",
  FAILED: "failed",
} as const;

export type P2pStatus = (typeof P2P_STATUS)[keyof typeof P2P_STATUS];

// ─── History / Ledger ────────────────────────────────────────────────────────

/** Entry kind for the history/activity log. */
export const HISTORY_KIND = {
  TASK: "task",
  REFERRAL: "referral",
  P2P: "p2p",
  WITHDRAWAL: "withdrawal",
} as const;

export type HistoryKind = (typeof HISTORY_KIND)[keyof typeof HISTORY_KIND];

// ─── Support Tickets ─────────────────────────────────────────────────────────

/** Status of a support ticket. */
export const TICKET_STATUS = {
  OPEN: "open",
  REPLIED: "replied",
  CLOSED: "closed",
} as const;

export type TicketStatus = (typeof TICKET_STATUS)[keyof typeof TICKET_STATUS];

// ─── User Roles ──────────────────────────────────────────────────────────────

/** Supabase Auth user roles. */
export const USER_ROLE = {
  USER: "user",
  SU_ADMIN: "su_admin",
} as const;

export type UserRole = (typeof USER_ROLE)[keyof typeof USER_ROLE];
