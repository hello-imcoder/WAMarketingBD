// apps/web/src/components/app/ui/Button.tsx
// User UI kit button — variants map to design tokens (no hardcoded hex).
// With `to`, renders a react-router Link styled as a button.
import type { ReactNode } from "react";
import { Link } from "react-router";

type ButtonVariant =
  | "primary"
  | "success"
  | "danger"
  | "outline"
  | "ghost"
  | "onDark";
type ButtonSize = "sm" | "md";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-primary text-on-primary hover:bg-primary-deep disabled:opacity-50",
  success: "bg-success text-white hover:opacity-90 disabled:opacity-50",
  danger: "bg-danger text-white hover:opacity-90 disabled:opacity-50",
  outline:
    "border border-hairline bg-canvas text-ink hover:bg-canvas-soft disabled:opacity-50",
  ghost: "text-ink-mute hover:bg-canvas-soft hover:text-ink disabled:opacity-50",
  onDark: "border border-sidebar-border text-on-primary hover:bg-sidebar-item-hover",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-[13px] gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
};

const BASE =
  "inline-flex items-center justify-center rounded-md font-medium transition-colors cursor-pointer disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-info";

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  onClick,
  type = "button",
  to,
  className = "",
  children,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  type?: "button" | "submit";
  to?: string;
  className?: string;
  children: ReactNode;
}): React.ReactElement {
  const classes = `${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${className}`;
  if (to !== undefined) {
    return (
      <Link to={to} className={classes}>
        {children}
      </Link>
    );
  }
  return (
    <button
      type={type}
      disabled={disabled === true || loading}
      onClick={onClick}
      className={classes}
    >
      {loading && (
        <span
          aria-hidden
          className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      )}
      {children}
    </button>
  );
}
