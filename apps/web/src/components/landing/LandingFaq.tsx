// apps/web/src/components/landing/LandingFaq.tsx
// White body section — frequently asked questions.
import { useTranslation } from "react-i18next";

const QUESTIONS = [
  "earn",
  "withdraw",
  "screenshot",
  "multiple",
  "referral",
  "fees",
] as const;

export function LandingFaq(): React.ReactElement {
  const { t } = useTranslation();

  return (
    <section className="landing-section" id="faq">
      <div className="landing-section-inner">
        <h2 className="landing-section-title">{t("landing.faq.title")}</h2>
        {QUESTIONS.map((q) => (
          <div className="landing-faq-item" key={q}>
            <h3 className="landing-faq-q">{t(`landing.faq.${q}Q`)}</h3>
            <p className="landing-card-body">{t(`landing.faq.${q}A`)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
