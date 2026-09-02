// apps/web/src/components/admin/AdminMinWithdrawalSetting.tsx
// Minimum withdrawal amount editor (site_settings.min_withdrawal_amount).
// Extracted from AdminWithdrawalPage — lives on the Settings page now.
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Landmark } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Card, CardHeader, CardBody, Button, Input, useToast } from "./ui";

export function AdminMinWithdrawalSetting(): React.ReactElement {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [current, setCurrent] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load(): Promise<void> {
      const { data } = await supabase
        .from("site_settings")
        .select("min_withdrawal_amount")
        .eq("id", 1)
        .maybeSingle();
      if (data !== null && data !== undefined) {
        setCurrent(data.min_withdrawal_amount);
      }
      setLoading(false);
    }
    void load();
  }, []);

  async function save(): Promise<void> {
    const amount = Number(draft);
    if (!Number.isInteger(amount) || amount <= 0) {
      toast("error", t("admin.error.validation_failed"));
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("site_settings")
      .update({ min_withdrawal_amount: amount })
      .eq("id", 1);
    setSaving(false);
    if (error !== null) {
      toast("error", t("admin.error.settings_failed"));
      return;
    }
    setCurrent(amount);
    setEditing(false);
    toast("success", t("admin.settings.minWithdrawalSaved"));
  }

  return (
    <Card>
      <CardHeader
        title={t("admin.settings.minWithdrawalTitle")}
        description={t("admin.settings.minWithdrawalDesc")}
        icon={<Landmark size={18} />}
      />
      <CardBody>
        {loading ? (
          <p role="status" className="m-0 text-sm text-ink-mute">
            {t("common.loading")}
          </p>
        ) : !editing ? (
          <div className="flex items-center gap-4">
            <span className="wt-540 text-2xl text-ink">৳{current ?? "—"}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setDraft(String(current ?? ""));
                setEditing(true);
              }}
            >
              {t("admin.withdrawals.editMin")}
            </Button>
          </div>
        ) : (
          <div className="flex max-w-xs items-center gap-2">
            <Input
              value={draft}
              inputMode="numeric"
              onChange={(e) => setDraft(e.target.value)}
              aria-label={t("admin.settings.minWithdrawalTitle")}
            />
            <Button size="sm" loading={saving} onClick={() => void save()}>
              {t("admin.tasks.saveButton")}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
              {t("common.cancel")}
            </Button>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
