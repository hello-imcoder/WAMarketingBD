// apps/web/src/components/landing/LandingHero.tsx
// Indigo hero canvas (DESIGN.md) — violet-sky atmospheric backdrop, pill CTAs.
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { Logo } from "@/components/ui/Logo";

export function LandingHero(): React.ReactElement {
  const { t } = useTranslation();

  return (
    <section className="landing-hero">
      <div className="landing-hero-glow" aria-hidden="true" />
      <div className="landing-hero-inner">
        <Logo variant="dark" />
        <h1 className="landing-hero-headline">{t("landing.hero.headline")}</h1>
        <p className="landing-hero-lead">{t("landing.hero.lead")}</p>
        <Link to="/reg" className="landing-hero-cta landing-hero-cta-primary">
          {t("landing.hero.ctaPrimary")}
        </Link>
        <Link to="/login" className="landing-hero-cta landing-hero-cta-secondary">
          {t("landing.hero.ctaSecondary")}
        </Link>
      </div>
    </section>
  );
}
