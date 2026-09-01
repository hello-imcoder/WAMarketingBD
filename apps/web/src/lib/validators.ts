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
  profileUpdateSchema,
  passwordChangeSchema,
  taskSubmissionSchema,
  adminSubmissionActionSchema,
  withdrawalRequestSchema,
  adminWithdrawalActionSchema,
  p2pLookupSchema,
  p2pTransferSchema,
  supportTicketSchema,
  supportReplySchema,
  MFS_PROVIDER,
  TASK_STATUS,
  SUBMISSION_STATUS,
  WITHDRAWAL_STATUS,
  TICKET_STATUS,
} from "@wa-marketing-bd/shared-types";

export type {
  SignupInput,
  LoginInput,
  OnboardingInput,
  ProfileUpdateInput,
  PasswordChangeInput,
  TaskSubmissionInput,
  AdminSubmissionActionInput,
  WithdrawalRequestInput,
  AdminWithdrawalActionInput,
  P2pLookupInput,
  P2pTransferInput,
  SupportTicketInput,
  SupportReplyInput,
} from "@wa-marketing-bd/shared-types";
