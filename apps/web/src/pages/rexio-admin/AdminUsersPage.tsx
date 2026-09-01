// apps/web/src/pages/rexio-admin/AdminUsersPage.tsx
// Route: "/rexio-admin/users" — user list/search (§7.4). Reads via admin RLS.
// Ban/suspend/verify mutations live on the detail page (Edge Function path).
import { useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { useAdminUsers } from "@/hooks/useAdminUsers";

export default function AdminUsersPage(): React.ReactElement {
  const { t } = useTranslation();
  const { users, isLoading, error, search } = useAdminUsers();
  const [term, setTerm] = useState("");

  return (
    <div style={{ display: "grid", gap: "var(--spacing-lg)" }}>
      <h1 style={{ fontSize: "22px", fontVariationSettings: '"wght" 540', margin: 0 }}>
        {t("admin.users.title")}
      </h1>
      <form onSubmit={(e) => { e.preventDefault(); void search(term); }} style={{ display: "flex", gap: "var(--spacing-sm)" }}>
        <input value={term} onChange={(e) => setTerm(e.target.value)} placeholder={t("admin.users.searchPlaceholder")}
          style={{ flex: 1, padding: "10px 12px", border: "1px solid var(--color-hairline)", borderRadius: "var(--rounded-sm)", fontSize: "14px" }} />
        <button type="submit" style={{ padding: "10px 16px", borderRadius: "var(--rounded-sm)", border: "none", background: "var(--color-primary)", color: "var(--color-on-primary)", fontSize: "13px", fontVariationSettings: '"wght" 600', cursor: "pointer" }}>
          {t("admin.users.searchButton")}
        </button>
      </form>
      {isLoading && <p role="status">{t("common.loading")}</p>}
      {error !== null && <p role="alert">{t("admin.error.load_failed")}</p>}
      <div style={{ display: "grid", gap: "var(--spacing-md)" }}>
        {users.map((u) => (
          <Link key={u.id} to={`/rexio-admin/users/${u.id}`}
            style={{ border: "1px solid var(--color-hairline)", borderRadius: "var(--rounded-md)", padding: "var(--spacing-lg)", background: "var(--color-canvas)", textDecoration: "none", color: "var(--color-ink)", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "var(--spacing-md)" }}>
            <div>
              <p style={{ margin: 0, fontSize: "14px", fontVariationSettings: '"wght" 600' }}>{u.name === "" ? "—" : u.name}</p>
              <p style={{ margin: "4px 0 0", fontSize: "13px", color: "var(--color-ink-mute)" }}>{u.phone}</p>
            </div>
            <div style={{ display: "flex", gap: "var(--spacing-sm)", alignItems: "center", fontSize: "12px" }}>
              {u.is_verified && <span style={{ color: "var(--color-surface-teal-deep)" }}>{t("admin.users.verified")}</span>}
              {u.is_banned && <span style={{ color: "#b3261e" }}>{t("admin.users.banned")}</span>}
              {u.suspended_at !== null && <span style={{ color: "#b3261e" }}>{t("admin.users.suspended")}</span>}
              {u.role === "su_admin" && <span style={{ color: "var(--color-ink-faint)" }}>{t("admin.users.admin")}</span>}
            </div>
          </Link>
        ))}
        {!isLoading && users.length === 0 && <p style={{ color: "var(--color-ink-mute)" }}>{t("admin.users.empty")}</p>}
      </div>
    </div>
  );
}
