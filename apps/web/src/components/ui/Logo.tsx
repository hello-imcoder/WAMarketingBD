// apps/web/src/components/ui/Logo.tsx
// Brand logo — badge glyph (agent-generated, see scripts/generate-icons.ts) +
// wordmark rendered as HTML text so it uses the real Inter Variable font.
// variant "dark" = for dark/indigo surfaces (light wordmark text).

interface LogoProps {
  variant?: "light" | "dark";
  /** Renders the badge without the wordmark (favicon-style usage). */
  badgeOnly?: boolean;
}

export function Logo({ variant = "light", badgeOnly = false }: LogoProps): React.ReactElement {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "var(--spacing-md)",
      }}
    >
      <svg
        width="36"
        height="36"
        viewBox="0 0 128 128"
        role="img"
        aria-label="WA Marketing BD"
      >
        <rect width="128" height="128" rx="28" fill="#1b1938" />
        <path
          d="M64 26c-19.9 0-36 13.4-36 30 0 9.5 5.4 18 13.8 23.5-.7 4.6-2.9 9.3-6.6 12.9-.9.9-.2 2.4 1 2.3 7-.6 13.2-3 17.9-6.2 3.2.8 6.5 1.2 9.9 1.2 19.9 0 36-13.4 36-30S83.9 26 64 26z"
          fill="#c9b4fa"
        />
        <circle cx="46" cy="56" r="6" fill="#1b1938" />
        <circle cx="64" cy="56" r="6" fill="#1b1938" />
        <circle cx="82" cy="56" r="6" fill="#1b1938" />
        <circle cx="96" cy="94" r="18" fill="#0e3030" />
        <path
          d="M88 94l6 6 11-12"
          stroke="#c9b4fa"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
      {!badgeOnly && (
        <span
          style={{
            fontFamily: "var(--font-sans)",
            fontVariationSettings: '"wght" 540',
            fontSize: "20px",
            letterSpacing: "-0.4px",
            color: variant === "dark" ? "#ffffff" : "var(--color-primary)",
          }}
        >
          WA Marketing BD
        </span>
      )}
    </span>
  );
}
