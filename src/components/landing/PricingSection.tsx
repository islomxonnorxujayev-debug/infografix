import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";

const PricingSection = () => {
  const { t } = useLanguage();

  const tiers = [
    {
      name: t("price.free"),
      price: "0",
      period: ` ${t("bal.sum")}`,
      description: t("price.freeDesc"),
      perImage: "",
      features: [t("price.freeFeat1"), t("price.freeFeat2")],
      cta: t("price.start"),
      highlighted: false,
    },
    {
      name: `1 ${t("price.imageGen")}`,
      price: "4 999",
      period: ` ${t("bal.sum")}`,
      description: t("price.onetime"),
      perImage: `4 999 ${t("bal.perImage")}`,
      features: [`1 ${t("price.imageGen")}`, t("price.hd"), t("price.allFormats"), t("price.viaTelegram")],
      cta: t("price.buy"),
      highlighted: false,
    },
    {
      name: `10 ${t("price.imageGen")}`,
      price: "45 000",
      period: ` ${t("bal.sum")}`,
      description: t("price.small"),
      perImage: `4 500 ${t("bal.perImage")}`,
      features: [`10 ${t("price.imageGen")}`, t("price.hd"), t("price.allFormats"), t("price.viaTelegram"), `10% ${t("price.saving")}`],
      cta: t("price.buy"),
      highlighted: false,
    },
    {
      name: `15 ${t("price.imageGen")}`,
      price: "55 000",
      period: ` ${t("bal.sum")}`,
      description: t("price.medium"),
      perImage: `3 667 ${t("bal.perImage")}`,
      features: [`15 ${t("price.imageGen")}`, t("price.hd"), t("price.allFormats"), t("price.viaTelegram"), `27% ${t("price.saving")}`],
      cta: t("price.buy"),
      highlighted: false,
    },
    {
      name: `20 ${t("price.imageGen")}`,
      price: "65 000",
      period: ` ${t("bal.sum")}`,
      description: t("price.active"),
      perImage: `3 250 ${t("bal.perImage")}`,
      features: [`20 ${t("price.imageGen")}`, t("price.hd"), t("price.allFormats"), t("price.viaTelegram"), `35% ${t("price.saving")}`],
      cta: t("price.buy"),
      highlighted: true,
    },
    {
      name: `50 ${t("price.imageGen")}`,
      price: "149 000",
      period: ` ${t("bal.sum")}`,
      description: t("price.big"),
      perImage: `2 980 ${t("bal.perImage")}`,
      features: [`50 ${t("price.imageGen")}`, t("price.hd"), t("price.allFormats"), t("price.batch"), t("price.fastSupport"), `40% ${t("price.saving")}`],
      cta: t("price.buy"),
      highlighted: false,
    },
    {
      name: `100 ${t("price.imageGen")}`,
      price: "249 999",
      period: ` ${t("bal.sum")}`,
      description: t("price.business"),
      perImage: `2 500 ${t("bal.perImage")}`,
      features: [`100 ${t("price.imageGen")}`, t("price.hd"), t("price.allFormats"), t("price.batch"), t("price.personalSupport"), `50% ${t("price.saving")}`],
      cta: t("price.buy"),
      highlighted: false,
    },
  ];

  return (
    <section id="pricing" className="py-16 sm:py-24 bg-card">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12 sm:mb-16"
        >
          <span className="text-sm font-medium text-primary mb-3 block">{t("price.label")}</span>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4">
            {t("price.title")} <span className="text-gradient">{t("price.titleHighlight")}</span>
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto">
            {t("price.desc")}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5 max-w-7xl mx-auto">
          {tiers.map((tier, i) => (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
              className={`relative p-5 sm:p-6 rounded-2xl border transition-all ${
                tier.highlighted
                  ? "bg-foreground text-background border-foreground shadow-glow scale-[1.02]"
                  : "bg-background border-border hover:shadow-elevated"
              }`}
            >
              {tier.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full gradient-primary text-primary-foreground text-xs font-semibold whitespace-nowrap">
                  {t("price.popular")}
                </div>
              )}
              <div className="mb-4">
                <h3 className={`font-display text-lg font-semibold ${tier.highlighted ? "text-background" : "text-foreground"}`}>
                  {tier.name}
                </h3>
                <p className={`text-sm mt-1 ${tier.highlighted ? "text-background/60" : "text-muted-foreground"}`}>
                  {tier.description}
                </p>
              </div>
              <div className="mb-1">
                <span className={`font-display text-2xl sm:text-3xl font-bold ${tier.highlighted ? "text-background" : "text-foreground"}`}>
                  {tier.price}
                </span>
                <span className={`text-sm ${tier.highlighted ? "text-background/60" : "text-muted-foreground"}`}>
                  {tier.period}
                </span>
              </div>
              {tier.perImage && (
                <p className={`text-xs mb-4 ${tier.highlighted ? "text-accent" : "text-primary"}`}>
                  ≈ {tier.perImage}
                </p>
              )}
              {!tier.perImage && <div className="mb-4" />}
              <ul className="space-y-2 mb-6">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className={`h-4 w-4 mt-0.5 shrink-0 ${tier.highlighted ? "text-accent" : "text-primary"}`} />
                    <span className={tier.highlighted ? "text-background/80" : "text-muted-foreground"}>{f}</span>
                  </li>
                ))}
              </ul>
              <Button
                className={`w-full ${tier.highlighted ? "bg-background text-foreground hover:bg-background/90" : "gradient-primary border-0"}`}
                variant={tier.highlighted ? "secondary" : "default"}
                size="sm"
                asChild
              >
                <Link to="/signup">{tier.cta}</Link>
              </Button>
            </motion.div>
          ))}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-8 max-w-lg mx-auto">
          {t("price.hint")}
        </p>
      </div>
    </section>
  );
};

export default PricingSection;
