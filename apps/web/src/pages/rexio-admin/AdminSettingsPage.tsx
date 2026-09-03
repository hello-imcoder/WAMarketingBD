import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/admin/ui";
import { AdminNoticeSettings } from "@/components/admin/AdminNoticeSettings";
import { AdminSupportNoticeSetting } from "@/components/admin/AdminSupportNoticeSetting";
import { AdminScreenshotSettings } from "@/components/admin/AdminScreenshotSettings";
import { AdminMinWithdrawSetting } from "@/components/admin/AdminMinWithdrawSetting";
import { AdminTaskLimitSetting } from "@/components/admin/AdminTaskLimitSetting";

export default function AdminSettingsPage() {
  const { t } = useTranslation();
  return (
    <PageHeader
      title={t("admin.settings.title")}
      description={t("admin.settings.description")}
    >
      <div className="grid items-start gap-5 lg:grid-cols-2">
        <AdminNoticeSettings />
        <AdminSupportNoticeSetting />
        <AdminScreenshotSettings />
        <AdminMinWithdrawSetting />
        <AdminTaskLimitSetting />
      </div>
    </PageHeader>
  );
}
