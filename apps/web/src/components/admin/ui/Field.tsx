// apps/web/src/components/admin/ui/Field.tsx
// Labeled form controls — Input / Textarea / Select share one label style.
import type { ReactNode, TextareaHTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes } from "react";

const controlClass =
  "w-full rounded-md border border-hairline bg-canvas px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-primary focus:outline-none transition-colors disabled:opacity-60";

export function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string | undefined;
  hint?: string | undefined;
  children: ReactNode;
}): React.ReactElement {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-1 block text-[13px] wt-540 text-ink-mute"
      >
        {label}
      </label>
      {children}
      {hint !== undefined && (
        <p className="mt-1 text-xs text-ink-faint">{hint}</p>
      )}
    </div>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>): React.ReactElement {
  const { className = "", ...rest } = props;
  return <input {...rest} className={`${controlClass} ${className}`} />;
}

export function Textarea(
  props: TextareaHTMLAttributes<HTMLTextAreaElement>,
): React.ReactElement {
  const { className = "", ...rest } = props;
  return (
    <textarea
      {...rest}
      className={`${controlClass} min-h-20 resize-y ${className}`}
    />
  );
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>): React.ReactElement {
  const { className = "", ...rest } = props;
  return <select {...rest} className={`${controlClass} ${className}`} />;
}
