// apps/web/src/pages/TermsOfServicePage.tsx
// Route: "/terms-of-service" — legal boilerplate (owner-reviewable draft, not
// legally final — flagged in the approved Milestone 4 plan).
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { applySeo } from "@/lib/seo";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { ClosingTealBand } from "@/components/landing/ClosingTealBand";

export default function TermsOfServicePage(): React.ReactElement {
  const { t } = useTranslation();

  useEffect(() => {
    applySeo({ title: t("legal.terms.metaTitle"), description: t("legal.terms.metaDescription") });
  }, [t]);

  return (
    <>
      <main className="legal-page">
        <h1>{t("legal.terms.title")}</h1>
        <p>{t("legal.terms.intro")}</p>
        <h2>{t("legal.terms.accountsTitle")}</h2>
        <p>{t("legal.terms.accountsBody")}</p>
        <h2>{t("legal.terms.tasksTitle")}</h2>
        <p>{t("legal.terms.tasksBody")}</p>
        <h2>{t("legal.terms.paymentsTitle")}</h2>
        <p>{t("legal.terms.paymentsBody")}</p>
        <h2>{t("legal.terms.conductTitle")}</h2>
        <p>{t("legal.terms.conductBody")}</p>
        <h2>{t("legal.terms.terminationTitle")}</h2>
        <p>{t("legal.terms.terminationBody")}</p>
        <h2>{t("legal.terms.liabilityTitle")}</h2>
        <p>{t("legal.terms.liabilityBody")}</p>
        <h2>{t("legal.terms.changesTitle")}</h2>
        <p>{t("legal.terms.changesBody")}</p>
      </main>
      <ClosingTealBand />
      <SiteFooter />
    </>
  );
}

