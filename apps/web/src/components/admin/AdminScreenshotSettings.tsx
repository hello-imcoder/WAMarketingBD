// apps/web/src/components/admin/AdminScreenshotSettings.tsx
// Admin toggle for the global screenshot requirement.
// When require_screenshot is true:
//   - TaskDetailPage disables the submit button until a file is selected.
//   - create-submission Edge Function rejects submissions without a screenshot.
// Pattern mirrors AdminNoticeSettings.tsx — direct site_settings update via
// the "site_settings: admin updates" RLS policy (is_su_admin()).
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export function AdminScreenshotSettings(): React.ReactElement {
  const [requireScreenshot, setRequireScreenshot] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetch(): Promise<void> {
      const { data } = await supabase
        .from("site_settings")
        .select("require_screenshot")
        .eq("id", 1)
        .maybeSingle();
      if (data !== null && data !== undefined) {
        setRequireScreenshot(data.require_screenshot ?? false);
      }
      setLoading(false);
    }
    void fetch();
  }, []);

  const handleSave = async (): Promise<void> => {
    setSaving(true);
    await supabase
      .from("site_settings")
      .update({ require_screenshot: requireScreenshot })
      .eq("id", 1);
    alert("Screenshot setting saved!");
    setSaving(false);
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
        🖼️ Screenshot Requirement
      </h2>
      <p style={{ color: "var(--color-ink-mute)", fontSize: "14px", margin: "0 0 var(--spacing-lg)" }}>
        When set to Required, users must upload a screenshot before they can submit a task.
      </p>

      <div style={{ marginBottom: "var(--spacing-lg)" }}>
        <label
          htmlFor="screenshot-requirement"
          style={{ display: "block", fontSize: "14px", marginBottom: "var(--spacing-xs)", fontVariationSettings: '"wght" 500' }}
        >
          🔘 Screenshot Upload
        </label>
        <select
          id="screenshot-requirement"
          value={requireScreenshot ? "required" : "optional"}
          onChange={(e) => setRequireScreenshot(e.target.value === "required")}
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
          <option value="required">🔴 Required — users must upload a screenshot</option>
          <option value="optional">🟢 Optional — screenshot upload is not mandatory</option>
        </select>
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
        💾 {saving ? "Saving…" : "Save Screenshot Setting"}
      </button>
    </div>
  );
}
