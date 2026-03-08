import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, Upload, Wand2, Download } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { useState, useEffect } from "react";

const showcaseItems = [
  { before: "/images/before-1.jpg", after: "/images/after-1.jpg", labelKey: "hero.showcase1" },
  { before: "/images/before-2.jpg", after: "/images/after-2.jpg", labelKey: "hero.showcase2" },
  { before: "/images/before-3.jpg", after: "/images/after-3.jpg", labelKey: "hero.showcase3" },
];

const HeroSection = () => {
  const { t } = useLanguage();
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % showcaseItems.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

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

        {/* Before / After Showcase */}
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.6 }}
          className="mt-12 sm:mt-16 max-w-5xl mx-auto"
        >
          <div className="relative rounded-2xl overflow-hidden shadow-elevated border border-border bg-card p-1.5 sm:p-2">
            <div className="rounded-xl overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeIndex}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.5 }}
                  className="grid grid-cols-2 gap-0"
                >
                  {/* Before */}
                  <div className="relative aspect-[3/4] sm:aspect-[4/3] bg-muted">
                    <img
                      src={showcaseItems[activeIndex].before}
                      alt={t("hero.before")}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-3 left-3 sm:top-4 sm:left-4">
                      <span className="px-3 py-1 rounded-full bg-destructive/90 text-destructive-foreground text-xs sm:text-sm font-semibold backdrop-blur-sm">
                        {t("hero.before")}
                      </span>
                    </div>
                  </div>

                  {/* After */}
                  <div className="relative aspect-[3/4] sm:aspect-[4/3] bg-card">
                    <img
                      src={showcaseItems[activeIndex].after}
                      alt={t("hero.after")}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-3 right-3 sm:top-4 sm:right-4">
                      <span className="px-3 py-1 rounded-full bg-accent/90 text-accent-foreground text-xs sm:text-sm font-semibold backdrop-blur-sm">
                        {t("hero.after")}
                      </span>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Divider line */}
              <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[3px] bg-primary/60 z-10 pointer-events-none" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary flex items-center justify-center shadow-lg pointer-events-none">
                <Wand2 className="h-4 w-4 sm:h-5 sm:w-5 text-primary-foreground" />
              </div>
            </div>

            {/* Dots indicator */}
            <div className="flex items-center justify-center gap-2 pt-3 pb-1">
              {showcaseItems.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveIndex(i)}
                  className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full transition-all duration-300 ${
                    i === activeIndex ? "bg-primary w-6 sm:w-8" : "bg-muted-foreground/30"
                  }`}
                />
              ))}
            </div>
          </div>

          <p className="text-center text-sm text-muted-foreground mt-4">
            {t("hero.showcaseDesc")}
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
