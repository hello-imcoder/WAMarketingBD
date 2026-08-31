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
  screenshotPublicId: z.string().nullable(),
  /**
   * True if the user tapped the wa.me deep-link button before submitting.
   * Logged as wa_link_clicked_at by the Edge Function (fraud signal §8).
   */
  waLinkClicked: z.boolean(),
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

// ─── Inferred types ───────────────────────────────────────────────────────────

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type OnboardingInput = z.infer<typeof onboardingSchema>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
export type PasswordChangeInput = z.infer<typeof passwordChangeSchema>;
export type TaskSubmissionInput = z.infer<typeof taskSubmissionSchema>;
