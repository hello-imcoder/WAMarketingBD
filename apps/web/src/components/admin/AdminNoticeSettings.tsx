// apps/web/src/components/admin/AdminNoticeSettings.tsx
// Popup notice editor (site_settings.admin_notice_text / is_admin_notice_active).
// Shown on the Settings page; save feedback via toast (no alert()).
import { useEffect, useState } from "react";
import { BellRing } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { NoticeModal } from "@/components/app/NoticeModal";
import { Card, CardHeader, CardBody, Field, Textarea, Select, Button, useToast } from "./ui";

export function AdminNoticeSettings(): React.ReactElement {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [isActive, setIsActive] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showTest, setShowTest] = useState(false);

  useEffect(() => {
    async function fetch(): Promise<void> {
      const { data } = await supabase.from("site_settings").select("*").eq("id", 1).maybeSingle();
      if (data) {
        setText(data.admin_notice_text || "");
        setIsActive(data.is_admin_notice_active || false);
      }
      setLoading(false);
    }
    void fetch();
  }, []);

  const handleSave = async (): Promise<void> => {
    setSaving(true);
    const { error } = await supabase
      .from("site_settings")
      .update({
        admin_notice_text: text,
        is_admin_notice_active: isActive,
        admin_notice_updated_at: new Date().toISOString(),
      })
      .eq("id", 1);
    setSaving(false);
    if (error !== null) {
      toast("error", "Could not save the settings.");
      return;
    }
    toast("success", "Popup notice saved.");
  };

  return (
    <Card>
      <CardHeader
        title="Popup Notification"
        description="When users log in, this message displays as a popup if active."
        icon={<BellRing size={18} />}
      />
      <CardBody className="flex flex-col gap-4">
        {loading ? (
          <p className="m-0 text-sm text-ink-mute">Loading…</p>
        ) : (
          <>
            <Field label="Popup Message" htmlFor="admin-notice-text">
              <Textarea
                id="admin-notice-text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Write popup message…"
                rows={5}
              />
            </Field>
            <Field label="Status" htmlFor="admin-notice-status">
              <Select
                id="admin-notice-status"
                value={isActive ? "active" : "inactive"}
                onChange={(e) => setIsActive(e.target.value === "active")}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Select>
            </Field>
            <div className="flex gap-2">
              <Button loading={saving} onClick={() => void handleSave()}>
                Save Popup
              </Button>
              <Button variant="outline" onClick={() => setShowTest(true)}>
                Test Popup
              </Button>
            </div>
            {showTest && (
              <NoticeModal noticeText={text} onDismiss={() => setShowTest(false)} />
            )}
          </>
        )}
      </CardBody>
    </Card>
  );
}
