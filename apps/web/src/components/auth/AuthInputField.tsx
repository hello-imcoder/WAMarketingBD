// apps/web/src/components/auth/AuthInputField.tsx
// Reusable labeled input for auth/settings forms.
// Keeps consistent styling in one place (DESIGN.md text-input token).
import type { HTMLInputTypeAttribute } from "react";

interface AuthInputFieldProps {
  id: string;
  label: string;
  type: HTMLInputTypeAttribute;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  required?: boolean;
}

export function AuthInputField({
  id,
  label,
  type,
  value,
  onChange,
  placeholder,
  autoComplete,
  inputMode,
  required = false,
}: AuthInputFieldProps): React.ReactElement {
  return (
    <div style={{ marginBottom: "var(--spacing-lg)" }}>
      <label
        htmlFor={id}
        style={{
          display: "block",
          fontFamily: "var(--font-sans)",
          fontSize: "var(--text-caption-size)",
          fontWeight: 540,
          color: "var(--color-ink)",
          marginBottom: "var(--spacing-xs)",
        }}
      >
        {label}
      </label>
      <input
        id={id}
        type={type}
        inputMode={inputMode}
        autoComplete={autoComplete}
        required={required}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          padding: "10px 12px",
          fontFamily: "var(--font-sans)",
          fontSize: "var(--text-body-md-size)",
          color: "var(--color-ink)",
          backgroundColor: "var(--color-canvas)",
          border: "1px solid var(--color-hairline)",
          borderRadius: "var(--rounded-sm)",
          outline: "none",
          boxSizing: "border-box",
        }}
      />
    </div>
  );
}
