// apps/web/src/components/landing/ClosingTealBand.tsx
// Deep-teal closing CTA band — every marketing page resolves here (DESIGN.md).
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

export function ClosingTealBand(): React.ReactElement {
  const { t } = useTranslation();

  return (
    <section className="landing-teal-band">
      <h2 className="landing-teal-band-title">{t("landing.tealBand.title")}</h2>
      <Link to="/reg" className="landing-teal-cta">
        {t("landing.tealBand.cta")}
      </Link>
    </section>
  );
}
