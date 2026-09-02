// apps/web/src/pages/rexio-admin/AdminSettingsPage.tsx
// Route: "/rexio-admin/settings" — all admin controls in one place:
// popup notice, support notice, screenshot mode, minimum withdrawal amount.
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/admin/ui";
import { AdminNoticeSettings } from "@/components/admin/AdminNoticeSettings";
import { AdminSupportNoticeSettings } from "@/components/admin/AdminSupportNoticeSettings";
import { AdminScreenshotSettings } from "@/components/admin/AdminScreenshotSettings";
import { AdminMinWithdrawalSetting } from "@/components/admin/AdminMinWithdrawalSetting";

export default function AdminSettingsPage(): React.ReactElement {
  const { t } = useTranslation();
  return (
    <>
      <PageHeader
        title={t("admin.settings.title")}
        description={t("admin.settings.description")}
      />
      <div className="grid items-start gap-5 xl:grid-cols-2">
        <AdminNoticeSettings />
        <AdminSupportNoticeSettings />
        <AdminScreenshotSettings />
        <AdminMinWithdrawalSetting />
      </div>
    </>
  );
}
