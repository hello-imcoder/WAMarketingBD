// apps/web/src/components/admin/AdminScreenshotSettings.tsx
// Admin control for the task-submission screenshot requirement.
// Three modes (site_settings.screenshot_mode, 0023_screenshot_mode.sql):
//   must     — users MUST upload a screenshot; submissions without one are
//              rejected client- and server-side
//   optional — upload allowed but never required (default)
//   disabled — the screenshot upload UI is hidden entirely on the task form
// Pattern mirrors AdminNoticeSettings.tsx — direct site_settings update via
// the "site_settings: admin updates" RLS policy (is_su_admin()).
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabase";
import type { ScreenshotMode } from "@wa-marketing-bd/shared-types";

export function AdminScreenshotSettings(): React.ReactElement {
  const { t } = useTranslation();
  const [mode, setMode] = useState<ScreenshotMode>("optional");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetch(): Promise<void> {
      const { data } = await supabase
        .from("site_settings")
        .select("screenshot_mode")
        .eq("id", 1)
        .maybeSingle();
      if (data !== null && data !== undefined) {
        const m = data.screenshot_mode as ScreenshotMode | null;
        setMode(m === "must" || m === "disabled" ? m : "optional");
      }
      setLoading(false);
    }
    void fetch();
  }, []);

  const handleSave = async (): Promise<void> => {
    setSaving(true);
    const { error } = await supabase
      .from("site_settings")
      .update({ screenshot_mode: mode, require_screenshot: mode === "must" })
      .eq("id", 1);
    setSaving(false);
    if (error !== null) {
      alert(t("admin.error.settings_failed"));
      return;
    }
    alert(t("admin.screenshotSetting.saved"));
  };

  if (loading) return <div>Loading settings...</div>;

  return (
    <div
      style={{
        border: "1px solid var(--color-hairline)",
        borderRadius: "var(--rounded-lg)",
        padding: "var(--spacing-xl)",
        background: "var(--color-canvas)",
        marginTop: "var(--spacing-xl)",
      }}
    >
      <h2 style={{ fontSize: "18px", margin: "0 0 var(--spacing-sm)", fontVariationSettings: '"wght" 600' }}>
        🖼️ {t("admin.screenshotSetting.title")}
      </h2>
      <p style={{ color: "var(--color-ink-mute)", fontSize: "14px", margin: "0 0 var(--spacing-lg)" }}>
        {t("admin.screenshotSetting.description")}
      </p>

      <div style={{ marginBottom: "var(--spacing-lg)" }}>
        <label
          htmlFor="screenshot-mode"
          style={{ display: "block", fontSize: "14px", marginBottom: "var(--spacing-xs)", fontVariationSettings: '"wght" 500' }}
        >
          🔘 {t("admin.screenshotSetting.modeLabel")}
        </label>
        <select
          id="screenshot-mode"
          value={mode}
          onChange={(e) => setMode(e.target.value as ScreenshotMode)}
          style={{
            width: "100%",
            border: "1px solid var(--color-hairline)",
            borderRadius: "var(--rounded-sm)",
            padding: "var(--spacing-sm)",
            fontSize: "14px",
            background: "transparent",
            color: "var(--color-ink)",
          }}
        >
          <option value="must">🔴 {t("admin.screenshotSetting.must")}</option>
          <option value="optional">🟢 {t("admin.screenshotSetting.optional")}</option>
          <option value="disabled">⛔ {t("admin.screenshotSetting.disabled")}</option>
        </select>
        <p style={{ color: "var(--color-ink-faint)", fontSize: "12px", margin: "6px 0 0" }}>
          {mode === "must" && t("admin.screenshotSetting.mustHint")}
          {mode === "optional" && t("admin.screenshotSetting.optionalHint")}
          {mode === "disabled" && t("admin.screenshotSetting.disabledHint")}
        </p>
      </div>

      <button
        type="button"
        onClick={() => void handleSave()}
        disabled={saving}
        style={{
          background: "#00A389",
          color: "white",
          border: "none",
          borderRadius: "var(--rounded-md)",
          padding: "12px",
          fontSize: "15px",
          fontVariationSettings: '"wght" 600',
          cursor: saving ? "not-allowed" : "pointer",
          width: "100%",
        }}
      >
        💾 {saving ? t("common.saving") : t("admin.screenshotSetting.save")}
      </button>
    </div>
  );
}
