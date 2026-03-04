import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";

const marketplaces = [
  { name: "Uzum Market", ratio: "3:4", size: "1080×1440", color: "hsl(234 89% 60%)" },
  { name: "Wildberries", ratio: "1:1", size: "1000×1000", color: "hsl(280 70% 55%)" },
  { name: "Ozon", ratio: "3:4", size: "Auto", color: "hsl(210 90% 50%)" },
  { name: "Amazon", ratio: "4:5", size: "Auto", color: "hsl(30 90% 50%)" },
  { name: "Universal", ratio: "1:1", size: "Custom", color: "hsl(162 72% 46%)" },
];

const MarketplaceSection = () => {
  const { t } = useLanguage();

  return (
    <section id="how-it-works" className="py-16 sm:py-24">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12 sm:mb-16"
        >
          <span className="text-sm font-medium text-primary mb-3 block">{t("market.label")}</span>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4">
            {t("market.title1")} <span className="text-gradient">{t("market.titleHighlight")}</span> {t("market.title2")}
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto">
            {t("market.desc")}
          </p>
        </motion.div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4 max-w-4xl mx-auto">
          {marketplaces.map((mp, i) => (
            <motion.div
              key={mp.name}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="p-4 sm:p-5 rounded-2xl bg-card border border-border hover:shadow-elevated transition-all text-center group hover:border-primary/20"
            >
              <div
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl mx-auto mb-3 flex items-center justify-center text-primary-foreground text-xs font-bold font-display"
                style={{ background: mp.color }}
              >
                {mp.ratio}
              </div>
              <h3 className="font-display font-semibold text-foreground text-xs sm:text-sm">{mp.name}</h3>
              <p className="text-muted-foreground text-xs mt-1">{mp.size}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default MarketplaceSection;
