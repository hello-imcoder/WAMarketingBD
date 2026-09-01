// apps/web/src/components/landing/LandingFeatures.tsx
// Soft-canvas body section — feature cards + MFS provider strip.
import { useTranslation } from "react-i18next";

const FEATURES = ["tasks", "payouts", "referral", "p2p", "secure", "support"] as const;
const PROVIDERS = ["bKash", "Nagad", "Rocket", "Upay"] as const;

export function LandingFeatures(): React.ReactElement {
  const { t } = useTranslation();

  return (
    <section className="landing-section landing-section-soft">
      <div className="landing-section-inner">
        <h2 className="landing-section-title">{t("landing.features.title")}</h2>
        <div className="landing-card-grid">
          {FEATURES.map((f) => (
            <div className="landing-card" key={f}>
              <h3 className="landing-card-title">{t(`landing.features.${f}Title`)}</h3>
              <p className="landing-card-body">{t(`landing.features.${f}Body`)}</p>
            </div>
          ))}
        </div>
        <div className="landing-mfs-row">
          {PROVIDERS.map((p) => (
            <span className="landing-mfs-pill" key={p}>
              {p}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
