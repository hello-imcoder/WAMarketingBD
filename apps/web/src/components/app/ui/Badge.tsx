// apps/web/src/components/app/ui/Badge.tsx
// Status pill — color per submission/withdrawal/task/ticket status via tokens.
export type BadgeTone =
  | "pending"
  | "success"
  | "danger"
  | "neutral"
  | "active"
  | "info"
  | "warning";

const TONES: Record<BadgeTone, string> = {
  pending: "bg-warning-soft text-warning",
  success: "bg-success-soft text-success",
  danger: "bg-danger-soft text-danger",
  neutral: "bg-canvas-soft text-ink-mute",
  active: "bg-success-soft text-success",
  info: "bg-info-soft text-info",
  warning: "bg-warning-soft text-warning",
};

export function Badge({
  tone = "neutral",
  className = "",
  children,
}: {
  tone?: BadgeTone;
  className?: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs wt-540 ${TONES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

// Map a domain status string to a badge tone (i18n label resolved by caller).
export function statusTone(status: string): BadgeTone {
  switch (status) {
    case "approved":
    case "completed":
    case "active":
      return "success";
    case "pending":
    case "open":
    case "replied":
      return "pending";
    case "rejected":
      return "danger";
    case "closed":
      return "neutral";
    case "paused":
      return "info";
    default:
      return "neutral";
  }
}
