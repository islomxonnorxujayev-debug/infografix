import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, Upload, Wand2, Download } from "lucide-react";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";

const HeroSection = () => {
  const { t } = useLanguage();

  return (
    <section className="relative pt-28 sm:pt-32 pb-16 sm:pb-20 overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] md:w-[800px] h-[400px] md:h-[600px] rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-4xl mx-auto"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <Wand2 className="h-4 w-4" />
            {t("hero.badge")}
          </div>

          <h1 className="font-display text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight text-foreground leading-[1.1] mb-6">
            {t("hero.title1")}{" "}
            <span className="text-gradient">{t("hero.titleHighlight")}</span>{" "}
            {t("hero.title2")}
          </h1>

          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 sm:mb-10 leading-relaxed">
            {t("hero.desc")}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-12 sm:mb-16">
            <Button size="lg" className="gradient-primary border-0 text-base px-8 h-12 w-full sm:w-auto" asChild>
              <Link to="/signup">
                {t("hero.cta")}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="text-base px-8 h-12 w-full sm:w-auto" asChild>
              <a href="#how-it-works">{t("hero.howItWorks")}</a>
            </Button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="max-w-3xl mx-auto"
        >
          <div className="grid grid-cols-3 gap-3 sm:gap-8">
            {[
              { icon: Upload, label: t("hero.step1"), desc: t("hero.step1Desc") },
              { icon: Wand2, label: t("hero.step2"), desc: t("hero.step2Desc") },
              { icon: Download, label: t("hero.step3"), desc: t("hero.step3Desc") },
            ].map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 + i * 0.15 }}
                className="flex flex-col items-center text-center"
              >
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-card shadow-elevated flex items-center justify-center mb-3">
                  <step.icon className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                </div>
                <span className="font-display font-semibold text-foreground text-sm sm:text-base">{step.label}</span>
                <span className="text-xs sm:text-sm text-muted-foreground mt-1">{step.desc}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.6 }}
          className="mt-12 sm:mt-16 max-w-5xl mx-auto"
        >
          <div className="relative rounded-2xl overflow-hidden shadow-elevated border border-border bg-card p-1.5 sm:p-2">
            <div className="rounded-xl bg-muted aspect-[16/9] flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 flex">
                <div className="w-1/2 bg-muted flex items-center justify-center border-r-2 border-primary/30">
                  <div className="text-center p-4 sm:p-6">
                    <div className="w-20 h-20 sm:w-32 sm:h-32 md:w-48 md:h-48 rounded-xl bg-secondary mx-auto mb-3 sm:mb-4 flex items-center justify-center">
                      <Upload className="h-8 w-8 sm:h-12 sm:w-12 text-muted-foreground/40" />
                    </div>
                    <span className="text-xs sm:text-sm font-medium text-muted-foreground">{t("gen.original")}</span>
                  </div>
                </div>
                <div className="w-1/2 bg-card flex items-center justify-center">
                  <div className="text-center p-4 sm:p-6">
                    <div className="w-20 h-20 sm:w-32 sm:h-32 md:w-48 md:h-48 rounded-xl mx-auto mb-3 sm:mb-4 flex items-center justify-center shadow-glow" style={{ background: 'linear-gradient(135deg, hsl(234 89% 60% / 0.08), hsl(262 83% 58% / 0.08))' }}>
                      <Wand2 className="h-8 w-8 sm:h-12 sm:w-12 text-primary" />
                    </div>
                    <span className="text-xs sm:text-sm font-medium text-foreground">{t("gen.aiResult")}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
