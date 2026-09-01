// apps/web/src/pages/app/HistoryPage.tsx
// Route: "/app/history" — all of the user's own logs (§6.6), tabbed:
// All / Task / Referral / P2P / Withdrawal. Read-only client-side queries.
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { applySeo } from "@/lib/seo";
import { useHistory } from "@/hooks/useHistory";

const TABS = ["all", "task", "referral", "p2p", "withdrawal"] as const;

type Tab = (typeof TABS)[number];

const TAB_STYLES: React.CSSProperties = {
  display: "flex",
  gap: "var(--spacing-sm)",
  marginBottom: "var(--spacing-xl)",
  flexWrap: "wrap",
};

export default function HistoryPage(): React.ReactElement {
  const { t } = useTranslation();
  const { entries, isLoading, error } = useHistory();
  const [tab, setTab] = useState<Tab>("all");

  useEffect(() => {
    applySeo({ title: t("history.meta.title"), description: t("history.meta.description") });
  }, [t]);

  const visible = tab === "all" ? entries : entries.filter((e) => e.type === tab);

  return (
    <main
      style={{
        padding: "var(--spacing-xl)",
        maxWidth: "640px",
        margin: "0 auto",
        paddingBottom: "96px",
      }}
    >
      <h1 style={{ fontSize: "28px", fontVariationSettings: '"wght" 540', margin: "0 0 16px" }}>
        {t("history.title")}
      </h1>

      <div role="tablist" aria-label={t("history.title")} style={TAB_STYLES}>
        {TABS.map((tb) => (
          <button
            key={tb}
            role="tab"
            aria-selected={tab === tb}
            type="button"
            onClick={() => setTab(tb)}
            style={{
              padding: "var(--spacing-sm) var(--spacing-lg)",
              borderRadius: "var(--rounded-md)",
              border: `1px solid ${tab === tb ? "var(--color-primary)" : "var(--color-hairline)"}`,
              background: tab === tb ? "var(--color-primary)" : "var(--color-canvas)",
              color: tab === tb ? "var(--color-on-primary)" : "var(--color-ink)",
              fontSize: "14px",
              fontVariationSettings: '"wght" 600',
              cursor: "pointer",
            }}
          >
            {t(`history.tab.${tb}`)}
          </button>
        ))}
      </div>

      {isLoading && <p role="status">{t("common.loading")}</p>}
      {error !== null && (
        <p role="alert" className="auth-error">
          {t("history.error.loadFailed")}
        </p>
      )}
      {!isLoading && error === null && visible.length === 0 && (
        <p style={{ color: "var(--color-ink-mute)" }}>{t("history.empty")}</p>
      )}

      <div style={{ display: "grid", gap: "var(--spacing-md)" }}>
        {visible.map((e) => (
          <div
            key={e.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              gap: "var(--spacing-md)",
              border: "1px solid var(--color-hairline)",
              borderRadius: "var(--rounded-md)",
              padding: "var(--spacing-lg)",
            }}
          >
            <div>
              <p style={{ margin: 0, fontSize: "14px", fontVariationSettings: '"wght" 600' }}>
                {t(`history.entry.${e.descKey}`, e.descParams ?? {})}
              </p>
              <p style={{ margin: 0, fontSize: "12px", color: "var(--color-ink-faint)" }}>
                {new Date(e.date).toLocaleString()} · {t(`history.status.${e.status}`)}
              </p>
            </div>
            <strong
              style={{
                fontVariationSettings: '"wght" 540',
                color: e.amount > 0 ? "#1a7a3c" : e.amount < 0 ? "var(--color-ink)" : "var(--color-ink-mute)",
              }}
            >
              {e.amount > 0 ? "+" : ""}৳{e.amount}
            </strong>
          </div>
        ))}
      </div>
    </main>
  );
}
