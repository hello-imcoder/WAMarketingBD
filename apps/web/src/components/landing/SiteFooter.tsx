// apps/web/src/components/landing/SiteFooter.tsx
// Site-wide footer (DESIGN.md footer-light) — 4 link columns + legal row.
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { Logo } from "@/components/ui/Logo";

export function SiteFooter(): React.ReactElement {
  const { t } = useTranslation();

  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div style={{ marginBottom: "var(--spacing-xxl)" }}>
          <Logo />
        </div>
        <div className="site-footer-grid">
          <div>
            <h3 className="site-footer-heading">{t("landing.footer.productTitle")}</h3>
            <Link className="site-footer-link" to="/reg">
              {t("landing.footer.productSignup")}
            </Link>
            <Link className="site-footer-link" to="/login">
              {t("landing.footer.productLogin")}
            </Link>
          </div>
          <div>
            <h3 className="site-footer-heading">{t("landing.footer.howItWorksTitle")}</h3>
            <Link className="site-footer-link" to="/#how-it-works">
              {t("landing.footer.howItWorksLink")}
            </Link>
            <Link className="site-footer-link" to="/#faq">
              {t("landing.footer.faqLink")}
            </Link>
          </div>
          <div>
            <h3 className="site-footer-heading">{t("landing.footer.legalTitle")}</h3>
            <Link className="site-footer-link" to="/privacy-policy">
              {t("landing.footer.privacyLink")}
            </Link>
            <Link className="site-footer-link" to="/terms-of-service">
              {t("landing.footer.termsLink")}
            </Link>
          </div>
          <div>
            <h3 className="site-footer-heading">{t("landing.footer.supportTitle")}</h3>
            <span className="site-footer-link">{t("landing.footer.supportText")}</span>
          </div>
        </div>
        <div className="site-footer-legal">
          © {new Date().getFullYear()} SpritexAI · {t("landing.footer.rights")}
        </div>
      </div>
    </footer>
  );
}
