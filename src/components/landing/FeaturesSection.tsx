import { motion } from "framer-motion";
import { Eraser, Sun, Focus, Store, Palette, Maximize, Zap } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const featureKeys = [
  { icon: Eraser, titleKey: "feat.bg.title", descKey: "feat.bg.desc" },
  { icon: Sun, titleKey: "feat.light.title", descKey: "feat.light.desc" },
  { icon: Focus, titleKey: "feat.detail.title", descKey: "feat.detail.desc" },
  { icon: Store, titleKey: "feat.market.title", descKey: "feat.market.desc" },
  { icon: Palette, titleKey: "feat.style.title", descKey: "feat.style.desc" },
  { icon: Maximize, titleKey: "feat.size.title", descKey: "feat.size.desc" },
  { icon: Zap, titleKey: "feat.speed.title", descKey: "feat.speed.desc" },
];

const FeaturesSection = () => {
  const { t } = useLanguage();

  return (
    <section id="features" className="py-16 sm:py-24 bg-card">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12 sm:mb-16"
        >
          <span className="text-sm font-medium text-primary mb-3 block">{t("feat.label")}</span>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4">
            <span className="text-gradient">{t("feat.title")}</span>
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto">
            {t("feat.desc")}
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 max-w-5xl mx-auto">
          {featureKeys.map((feature, i) => (
            <motion.div
              key={feature.titleKey}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="group p-5 sm:p-6 rounded-2xl bg-background border border-border hover:shadow-elevated hover:border-primary/20 transition-all duration-300"
            >
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl gradient-primary flex items-center justify-center mb-4">
                <feature.icon className="h-5 w-5 text-primary-foreground" />
              </div>
              <h3 className="font-display text-base sm:text-lg font-semibold text-foreground mb-2">
                {t(feature.titleKey)}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {t(feature.descKey)}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
