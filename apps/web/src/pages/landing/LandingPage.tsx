// apps/web/src/pages/landing/LandingPage.tsx
// Route: "/" — marketing landing page (REQUIREMENT.md §9).
// DESIGN.md three-canvas rhythm: indigo hero → white/soft body → teal closing band.
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { applySeo } from "@/lib/seo";
import { LandingHero } from "@/components/landing/LandingHero";
import { LandingHowItWorks } from "@/components/landing/LandingHowItWorks";
import { LandingFeatures } from "@/components/landing/LandingFeatures";
import { LandingFaq } from "@/components/landing/LandingFaq";
import { ClosingTealBand } from "@/components/landing/ClosingTealBand";
import { SiteFooter } from "@/components/landing/SiteFooter";

export default function LandingPage(): React.ReactElement {
  const { t } = useTranslation();

  useEffect(() => {
    applySeo({
      title: t("landing.meta.title"),
      description: t("landing.meta.description"),
    });
  }, [t]);

  return (
    <>
      <LandingHero />
      <LandingHowItWorks />
      <LandingFeatures />
      <LandingFaq />
      <ClosingTealBand />
      <SiteFooter />
    </>
  );
}

