import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { SiteSettings } from "@wa-marketing-bd/shared-types";
import { NoticeModal } from "@/components/app/NoticeModal";

export function AdminNoticeSettings() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [text, setText] = useState("");
  const [isActive, setIsActive] = useState(false);
  const [showTest, setShowTest] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase.from("site_settings").select("*").eq("id", 1).maybeSingle();
      if (data) {
        setSettings(data as SiteSettings);
        setText(data.admin_notice_text || "");
        setIsActive(data.is_admin_notice_active || false);
      }
      setLoading(false);
    }
    fetch();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const updated_at = new Date().toISOString();
    
    await supabase.from("site_settings").update({
      admin_notice_text: text,
      is_admin_notice_active: isActive,
      admin_notice_updated_at: updated_at,
    }).eq("id", 1);
    
    alert("Saved successfully!");
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
        🔔 Popup Notification
      </h2>
      <p style={{ color: "var(--color-ink-mute)", fontSize: "14px", margin: "0 0 var(--spacing-lg)" }}>
        When users log in, this message will display as a popup if active.
      </p>

      <div style={{ marginBottom: "var(--spacing-md)" }}>
        <label style={{ display: "block", fontSize: "14px", marginBottom: "var(--spacing-xs)", fontVariationSettings: '"wght" 500', color: "inherit" }}>
          📝 Popup Message
        </label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write popup message..."
          rows={5}
          style={{
            width: "100%",
            border: "1px solid var(--color-hairline)",
            borderRadius: "var(--rounded-sm)",
            padding: "var(--spacing-sm)",
            fontSize: "14px",
            resize: "vertical",
            background: "transparent",
            color: "var(--color-ink)",
          }}
        />
      </div>

      <div style={{ marginBottom: "var(--spacing-lg)" }}>
        <label style={{ display: "block", fontSize: "14px", marginBottom: "var(--spacing-xs)", fontVariationSettings: '"wght" 500', color: "inherit" }}>
          🔘 Status
        </label>
        <select
          value={isActive ? "active" : "inactive"}
          onChange={(e) => setIsActive(e.target.value === "active")}
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
          <option value="active">✅ Active</option>
          <option value="inactive">❌ Inactive</option>
        </select>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <button
          onClick={handleSave}
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
          💾 Save Popup
        </button>
        <button
          onClick={() => setShowTest(true)}
          style={{
            background: "#F49405",
            color: "white",
            border: "none",
            borderRadius: "var(--rounded-md)",
            padding: "12px",
            fontSize: "15px",
            fontVariationSettings: '"wght" 600',
            cursor: "pointer",
            width: "100%",
          }}
        >
          🔔 Test Popup
        </button>
      </div>

      {showTest && (
        <NoticeModal
          noticeText={text}
          onDismiss={() => setShowTest(false)}
        />
      )}
    </div>
  );
}
