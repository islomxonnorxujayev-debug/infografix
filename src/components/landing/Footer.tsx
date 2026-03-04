import { Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";

const Footer = () => {
  const { t } = useLanguage();

  return (
    <footer className="border-t border-border bg-card py-8 sm:py-12">
      <div className="container mx-auto px-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6">
          <div className="flex items-center gap-2">
            <div className="gradient-primary rounded-lg p-1.5">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-display text-lg font-bold text-foreground">Infografix AI</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">{t("footer.features")}</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">{t("footer.pricing")}</a>
            <Link to="/login" className="hover:text-foreground transition-colors">{t("footer.login")}</Link>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2026 Infografix AI
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
