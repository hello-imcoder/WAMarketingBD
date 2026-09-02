// apps/web/src/components/admin/AdminScreenshotSettings.tsx
// Admin control for the task-submission screenshot requirement.
// Three modes (site_settings.screenshot_mode, 0023_screenshot_mode.sql):
//   must     — users MUST upload a screenshot; submissions without one are
//              rejected client- and server-side
//   optional — upload allowed but never required (default)
//   disabled — the screenshot upload UI is hidden entirely on the task form
// Shown on the Settings page; save feedback via toast (no alert()).
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Camera } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { ScreenshotMode } from "@wa-marketing-bd/shared-types";
import { Card, CardHeader, CardBody, Field, Select, Button, useToast } from "./ui";

export function AdminScreenshotSettings(): React.ReactElement {
  const { t } = useTranslation();
  const { toast } = useToast();
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
      toast("error", t("admin.error.settings_failed"));
      return;
    }
    toast("success", t("admin.screenshotSetting.saved"));
  };

  return (
    <Card>
      <CardHeader
        title={t("admin.screenshotSetting.title")}
        description={t("admin.screenshotSetting.description")}
        icon={<Camera size={18} />}
      />
      <CardBody className="flex flex-col gap-4">
        {loading ? (
          <p className="m-0 text-sm text-ink-mute">Loading…</p>
        ) : (
          <>
            <Field label={t("admin.screenshotSetting.modeLabel")} htmlFor="screenshot-mode"
              hint={
                mode === "must" ? t("admin.screenshotSetting.mustHint")
                : mode === "optional" ? t("admin.screenshotSetting.optionalHint")
                : t("admin.screenshotSetting.disabledHint")
              }
            >
              <Select
                id="screenshot-mode"
                value={mode}
                onChange={(e) => setMode(e.target.value as ScreenshotMode)}
              >
                <option value="must">{t("admin.screenshotSetting.must")}</option>
                <option value="optional">{t("admin.screenshotSetting.optional")}</option>
                <option value="disabled">{t("admin.screenshotSetting.disabled")}</option>
              </Select>
            </Field>
            <div>
              <Button loading={saving} onClick={() => void handleSave()}>
                {t("admin.screenshotSetting.save")}
              </Button>
            </div>
          </>
        )}
      </CardBody>
    </Card>
  );
}
