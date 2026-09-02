// apps/web/src/components/admin/AdminSupportNoticeSettings.tsx
// Support page notice editor (site_settings.support_notice_text /
// is_support_notice_active). Extracted from AdminSupportPage — lives on the
// Settings page now. i18n keys reuse admin.support.notice*.
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Megaphone } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Card, CardHeader, CardBody, Field, Textarea, Select, Button, useToast } from "./ui";

export function AdminSupportNoticeSettings(): React.ReactElement {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [noticeText, setNoticeText] = useState("");
  const [noticeActive, setNoticeActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchNotice(): Promise<void> {
      const { data } = await supabase
        .from("site_settings")
        .select("support_notice_text, is_support_notice_active")
        .eq("id", 1)
        .maybeSingle();
      if (data !== null && data !== undefined) {
        setNoticeText(data.support_notice_text ?? "");
        setNoticeActive(data.is_support_notice_active ?? false);
      }
      setLoading(false);
    }
    void fetchNotice();
  }, []);

  async function handleSave(): Promise<void> {
    setSaving(true);
    const { error } = await supabase
      .from("site_settings")
      .update({ support_notice_text: noticeText, is_support_notice_active: noticeActive })
      .eq("id", 1);
    setSaving(false);
    if (error !== null) {
      toast("error", t("admin.error.settings_failed"));
      return;
    }
    toast("success", t("admin.support.noticeSaved"));
  }

  return (
    <Card>
      <CardHeader
        title={t("admin.support.noticeTitle")}
        description={t("admin.support.noticeDescription")}
        icon={<Megaphone size={18} />}
      />
      <CardBody className="flex flex-col gap-4">
        {loading ? (
          <p role="status" className="m-0 text-sm text-ink-mute">
            {t("common.loading")}
          </p>
        ) : (
          <>
            <Field label={t("admin.support.noticeText")} htmlFor="support-notice-text">
              <Textarea
                id="support-notice-text"
                rows={4}
                value={noticeText}
                onChange={(e) => setNoticeText(e.target.value)}
                placeholder={t("admin.support.noticePlaceholder")}
              />
            </Field>
            <Field label={t("admin.support.noticeStatus")} htmlFor="support-notice-status">
              <Select
                id="support-notice-status"
                value={noticeActive ? "active" : "inactive"}
                onChange={(e) => setNoticeActive(e.target.value === "active")}
              >
                <option value="active">{t("admin.support.noticeStatusActive")}</option>
                <option value="inactive">{t("admin.support.noticeStatusInactive")}</option>
              </Select>
            </Field>
            <div>
              <Button loading={saving} onClick={() => void handleSave()}>
                {t("admin.support.noticeSave")}
              </Button>
            </div>
          </>
        )}
      </CardBody>
    </Card>
  );
}
