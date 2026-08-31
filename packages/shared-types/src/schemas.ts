// packages/shared-types/src/schemas.ts
// Zod schemas for runtime validation — used on the client (apps/web)
// and duplicated locally inside Edge Functions that need them.
// v1: WhatsApp-send tasks only (REQUIREMENT.md §14 — no generic task type).

import { z } from "zod";
import { MFS_PROVIDER } from "./constants.js";

// ─── Auth ────────────────────────────────────────────────────────────────────

/** Phone numbers in Bangladesh: 11-digit starting with 01 */
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
});

export const loginSchema = z.object({
  phone: phoneSchema,
  password: passwordSchema,
});

export const onboardingSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  email: z.string().email("Enter a valid email").optional().or(z.literal("")),
});

// ─── Task Submission ─────────────────────────────────────────────────────────

export const taskSubmissionSchema = z.object({
  taskId: z.string().uuid(),
  /** Cloudinary public_id of the uploaded screenshot, or null if not provided. */
  screenshotPublicId: z.string().nullable(),
});

// ─── Withdrawal ──────────────────────────────────────────────────────────────

export const withdrawalSchema = z.object({
  amount: z
    .number()
    .positive("Amount must be positive")
    .int("Amount must be a whole number (BDT taka)"),
  provider: z.enum(
    Object.values(MFS_PROVIDER) as [string, ...string[]],
    { message: "Select a valid MFS provider" },
  ),
  accountNumber: phoneSchema,
});

// ─── P2P Transfer ────────────────────────────────────────────────────────────

export const p2pTransferSchema = z.object({
  recipientPhone: phoneSchema,
  amount: z
    .number()
    .positive("Amount must be positive")
    .int("Amount must be a whole number (BDT taka)"),
});

// ─── Support Ticket ──────────────────────────────────────────────────────────

export const supportTicketSchema = z.object({
  subject: z.string().min(1, "Subject is required").max(200, "Subject too long"),
  message: z.string().min(1, "Message is required").max(5000, "Message too long"),
});

export const ticketReplySchema = z.object({
  ticketId: z.string().uuid(),
  message: z.string().min(1, "Reply is required").max(5000, "Reply too long"),
});

// ─── Inferred types ──────────────────────────────────────────────────────────

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type OnboardingInput = z.infer<typeof onboardingSchema>;
export type TaskSubmissionInput = z.infer<typeof taskSubmissionSchema>;
export type WithdrawalInput = z.infer<typeof withdrawalSchema>;
export type P2pTransferInput = z.infer<typeof p2pTransferSchema>;
export type SupportTicketInput = z.infer<typeof supportTicketSchema>;
export type TicketReplyInput = z.infer<typeof ticketReplySchema>;
