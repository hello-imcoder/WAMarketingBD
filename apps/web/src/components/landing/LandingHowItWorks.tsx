// apps/web/src/components/landing/LandingHowItWorks.tsx
// White body section — the 4-step task flow (§6.2 in plain language).
import { useTranslation } from "react-i18next";

const STEPS = ["browse", "send", "submit", "earn"] as const;

export function LandingHowItWorks(): React.ReactElement {
  const { t } = useTranslation();

  return (
    <section className="landing-section" id="how-it-works">
      <div className="landing-section-inner">
        <h2 className="landing-section-title">{t("landing.howItWorks.title")}</h2>
        <div className="landing-card-grid">
          {STEPS.map((step, i) => (
            <div className="landing-card" key={step}>
              <p className="landing-step-number">{t(`landing.howItWorks.step_${i + 1}_label`)}</p>
              <h3 className="landing-card-title">{t(`landing.howItWorks.${step}Title`)}</h3>
              <p className="landing-card-body">{t(`landing.howItWorks.${step}Body`)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
