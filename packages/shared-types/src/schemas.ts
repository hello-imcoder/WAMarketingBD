// packages/shared-types/src/schemas.ts
// Zod v4 schemas for runtime validation — used on the client (apps/web)
// and duplicated locally inside Edge Functions that need them
// (Supabase deploy bundles only the function's own directory).
// v1: WhatsApp-send tasks only (REQUIREMENT.md §14 — no generic task type).
// §12: dual validation — client AND Edge Function both validate independently.

import { z } from "zod";
import { MFS_PROVIDER, REJECTION_REASON_MAX_LEN } from "./constants.js";

// ─── Auth ─────────────────────────────────────────────────────────────────────

/** Bangladeshi phone numbers: 11 digits starting with 01[3-9]. */
export const phoneSchema = z
  .string()
  .regex(/^01[3-9]\d{8}$/, "Enter a valid 11-digit Bangladeshi phone number");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password too long");

export const signupSchema = z.object({
  phone: phoneSchema,
  password: passwordSchema,
  /** Optional referral code from a referral link. 8 alphanum chars. */
  referralCodeUsed: z.string().length(8).optional(),
});

export const loginSchema = z.object({
  phone: phoneSchema,
  password: passwordSchema,
});

export const onboardingSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  email: z.string().email("Enter a valid email").optional().or(z.literal("")),
});

// Settings page — profile update
export const profileUpdateSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long").optional(),
  email: z.string().email("Enter a valid email").optional().or(z.literal("")),
});

export const passwordChangeSchema = z.object({
  currentPassword: passwordSchema,
  newPassword: passwordSchema,
});

// ─── Task Submission ──────────────────────────────────────────────────────────

export const taskSubmissionSchema = z.object({
  taskId: z.string().uuid(),
  /** Cloudinary public_id of the uploaded screenshot, or null if not provided (optional per §6.2). */
  screenshotPublicId: z.string().min(1).max(255).nullable(),
  /** SHA-256 hex of the uploaded file — duplicate/reuse detection (§8). null if no screenshot. */
  screenshotHash: z
    .string()
    .regex(/^[0-9a-f]{64}$/, "Screenshot hash must be a 64-char lowercase SHA-256 hex")
    .nullable(),
  /**
   * True if the user tapped the wa.me deep-link button on the task page before
   * submitting (fraud signal §8 — stored as wa_link_clicked_at).
   */
  waLinkClicked: z.boolean(),
  /**
   * Client-computed device fingerprint (canvas + UA + screen hash — §8 fraud signal).
   * Inherently client-computed; the trustworthy ip_address is captured server-side
   * from x-forwarded-for by the create-submission Edge Function.
   */
  deviceFingerprint: z.string().min(8).max(128).nullable(),
});

// Admin action on a submission (used by verify-submission Edge Function)
export const adminSubmissionActionSchema = z.object({
  submissionId: z.string().uuid(),
  action: z.enum(["approved", "rejected"]),
  rejectionReason: z
    .string()
    .max(REJECTION_REASON_MAX_LEN, `Rejection reason must be ≤ ${REJECTION_REASON_MAX_LEN} characters`)
    .nullable(),
});

export type AdminSubmissionActionInput = z.infer<typeof adminSubmissionActionSchema>;

// ─── Wallet / Withdrawal ──────────────────────────────────────────────────────

export const withdrawalRequestSchema = z.object({
  amount: z
    .number()
    .int("Amount must be a whole number (BDT taka)")
    .positive("Amount must be positive"),
  provider: z.enum(
    Object.values(MFS_PROVIDER) as [string, ...string[]],
    { message: "Select a valid MFS provider" },
  ),
  /** MFS account number to send to — must be a valid phone number. */
  accountNumber: phoneSchema,
});

// Admin action on a withdrawal request (used by process-withdrawal Edge Function)
export const adminWithdrawalActionSchema = z.object({
  withdrawalId: z.string().uuid(),
  action: z.enum(["completed", "rejected"]),
  adminNote: z.string().max(500, "Note too long").nullable(),
});

export type WithdrawalRequestInput = z.infer<typeof withdrawalRequestSchema>;
export type AdminWithdrawalActionInput = z.infer<typeof adminWithdrawalActionSchema>;

// ─── P2P Transfer ─────────────────────────────────────────────────────────────

/** Step 1: look up recipient by phone to show name preview before transfer (§6.4). */
export const p2pLookupSchema = z.object({
  recipientPhone: phoneSchema,
});

/** Step 2: execute the transfer after user confirms recipient name. */
export const p2pTransferSchema = z.object({
  recipientPhone: phoneSchema,
  amount: z
    .number()
    .int("Amount must be a whole number (BDT taka)")
    .positive("Amount must be positive"),
});

export type P2pLookupInput = z.infer<typeof p2pLookupSchema>;
export type P2pTransferInput = z.infer<typeof p2pTransferSchema>;

// ─── Support ──────────────────────────────────────────────────────────────────

export const supportTicketSchema = z.object({
  subject: z.string().min(1, "Subject is required").max(200, "Subject too long"),
  message: z.string().min(1, "Message is required").max(5000, "Message too long"),
});

/** Reply to a support ticket — used by both users and admin. */
export const supportReplySchema = z.object({
  ticketId: z.string().uuid(),
  body: z.string().min(1, "Reply is required").max(5000, "Reply too long"),
});

export type SupportTicketInput = z.infer<typeof supportTicketSchema>;
export type SupportReplyInput = z.infer<typeof supportReplySchema>;

// Admin action on a user account (used by admin-update-user Edge Function, M11).
// At least one of isVerified/isBanned/suspendedAt must be provided (refinement).
export const adminUserActionSchema = z
  .object({
    userId: z.string().uuid(),
    isVerified: z.boolean().optional(),
    isBanned: z.boolean().optional(),
    /** ISO timestamptz to suspend now, or null to clear suspension. */
    suspendedAt: z.string().datetime({ offset: true }).nullable().optional(),
  })
  .refine(
    (v) =>
      v.isVerified !== undefined || v.isBanned !== undefined || v.suspendedAt !== undefined,
    { message: "At least one of isVerified, isBanned, suspendedAt is required" },
  );

export type AdminUserActionInput = z.infer<typeof adminUserActionSchema>;

// Admin task create/update (§7.1 — direct RLS-scoped writes via is_su_admin()).
// whatsappNumbers accepts one or many numbers separated by commas, semicolons,
// or newlines; each individual number must be 7–15 digits (no leading +/spaces).
// useAdminTasks.createTask() splits the string and inserts one task row per number.
export const adminTaskCreateSchema = z.object({
  whatsappNumbers: z
    .string()
    .min(1, "At least one WhatsApp number is required")
    .refine(
      (raw) => {
        const nums = raw.split(/[\n,;]+/).map((n) => n.trim()).filter((n) => n.length > 0);
        return nums.length > 0 && nums.every((n) => /^[0-9]{7,15}$/.test(n));
      },
      "Each number must be 7–15 digits (no spaces, no +). Separate multiple numbers with commas or newlines.",
    ),
  message: z.string().min(1, "Message is required").max(2000, "Message too long"),
  payoutAmount: z.number().int("Payout must be a whole number (BDT taka)").positive("Payout must be positive"),
  maxCompletions: z.number().int().positive("Max completions must be positive"),
  /** ISO timestamptz — must be in the future at creation time. */
  expiresAt: z.string().min(1, "Expiry is required"),
});

export const adminTaskUpdateSchema = z.object({
  taskId: z.string().uuid(),
  whatsappNumber: z.string().regex(/^[0-9]{7,15}$/).optional(),
  message: z.string().min(1).max(2000).optional(),
  payoutAmount: z.number().int().positive().optional(),
  maxCompletions: z.number().int().positive().optional(),
  expiresAt: z.string().min(1).optional(),
  status: z.enum(["active", "paused"]).optional(),
});

export type AdminTaskCreateInput = z.infer<typeof adminTaskCreateSchema>;
export type AdminTaskUpdateInput = z.infer<typeof adminTaskUpdateSchema>;

// ─── Inferred types ───────────────────────────────────────────────────────────

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type OnboardingInput = z.infer<typeof onboardingSchema>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
export type PasswordChangeInput = z.infer<typeof passwordChangeSchema>;
export type TaskSubmissionInput = z.infer<typeof taskSubmissionSchema>;
