// apps/web/src/pages/PrivacyPolicyPage.tsx
// Route: "/privacy-policy" — legal boilerplate (owner-reviewable draft, not
// legally final — flagged in the approved Milestone 4 plan).
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { applySeo } from "@/lib/seo";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { ClosingTealBand } from "@/components/landing/ClosingTealBand";

export default function PrivacyPolicyPage(): React.ReactElement {
  const { t } = useTranslation();

  useEffect(() => {
    applySeo({ title: t("legal.privacy.metaTitle"), description: t("legal.privacy.metaDescription") });
  }, [t]);

  return (
    <>
      <main className="legal-page">
        <h1>{t("legal.privacy.title")}</h1>
        <p>{t("legal.privacy.intro")}</p>
        <h2>{t("legal.privacy.dataTitle")}</h2>
        <p>{t("legal.privacy.dataBody")}</p>
        <h2>{t("legal.privacy.useTitle")}</h2>
        <p>{t("legal.privacy.useBody")}</p>
        <h2>{t("legal.privacy.thirdPartyTitle")}</h2>
        <p>{t("legal.privacy.thirdPartyBody")}</p>
        <h2>{t("legal.privacy.rightsTitle")}</h2>
        <p>{t("legal.privacy.rightsBody")}</p>
        <h2>{t("legal.privacy.contactTitle")}</h2>
        <p>{t("legal.privacy.contactBody")}</p>
      </main>
      <ClosingTealBand />
      <SiteFooter />
    </>
  );
}

