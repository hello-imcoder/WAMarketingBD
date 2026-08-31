// apps/web/src/lib/validators.ts
// Thin re-export of shared-types Zod schemas for use inside apps/web.
// Import from here (not directly from @wa-marketing-bd/shared-types) so
// the import path stays consistent across the app.

export {
  phoneSchema,
  passwordSchema,
  signupSchema,
  loginSchema,
  onboardingSchema,
  taskSubmissionSchema,
  withdrawalSchema,
  p2pTransferSchema,
  supportTicketSchema,
  ticketReplySchema,
} from "@wa-marketing-bd/shared-types";

export type {
  SignupInput,
  LoginInput,
  OnboardingInput,
  TaskSubmissionInput,
  WithdrawalInput,
  P2pTransferInput,
  SupportTicketInput,
  TicketReplyInput,
} from "@wa-marketing-bd/shared-types";
