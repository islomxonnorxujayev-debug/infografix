import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { Link } from "react-router-dom";

const tiers = [
  {
    name: "Bepul",
    price: "$0",
    period: "",
    description: "Sinab ko'ring",
    features: [
      "15 ta rasm generatsiya",
      "Standart sifat",
      "Barcha stil presetlar",
      "Barcha marketplace formatlar",
    ],
    cta: "Boshlash",
    highlighted: false,
  },
  {
    name: "Starter",
    price: "$9",
    period: "/oy",
    description: "Boshlang'ich sotuvchilar uchun",
    features: [
      "100 ta rasm/oy",
      "Yuqori sifat (HD)",
      "Barcha stil presetlar",
      "Barcha marketplace formatlar",
      "Telegram bot orqali ishlash",
    ],
    cta: "Starter tanlash",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$29",
    period: "/oy",
    description: "Faol sotuvchilar uchun",
    features: [
      "Cheksiz standart rasmlar",
      "HD sifat",
      "Barcha kengaytmalar",
      "Batch ishlash",
      "Tezkor support",
      "Yuklab olish tarixi",
    ],
    cta: "Pro tanlash",
    highlighted: true,
  },
  {
    name: "Business",
    price: "$59",
    period: "/oy",
    description: "Katta do'konlar uchun",
    features: [
      "Cheksiz rasmlar",
      "4K sifat",
      "Kengaytirilgan yorug'lik",
      "Tezkor ishlash",
      "API kirish",
      "Shaxsiy support",
      "Maxsus presetlar",
    ],
    cta: "Business tanlash",
    highlighted: false,
  },
];

const PricingSection = () => {
  return (
    <section id="pricing" className="py-16 sm:py-24 bg-card">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12 sm:mb-16"
        >
          <span className="text-sm font-medium text-primary mb-3 block">Narxlar</span>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4">
            Sodda va <span className="text-gradient">arzon narxlar</span>
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto">
            Bepul boshlang. Kerak bo'lganda kengaytiring. Istalgan vaqtda bekor qiling.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 max-w-6xl mx-auto">
          {tiers.map((tier, i) => (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className={`relative p-5 sm:p-6 rounded-2xl border transition-all ${
                tier.highlighted
                  ? "bg-foreground text-background border-foreground shadow-glow scale-[1.02]"
                  : "bg-background border-border hover:shadow-elevated"
              }`}
            >
              {tier.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full gradient-primary text-primary-foreground text-xs font-semibold">
                  Eng ommabop
                </div>
              )}
              <div className="mb-5 sm:mb-6">
                <h3 className={`font-display text-lg font-semibold ${tier.highlighted ? "text-background" : "text-foreground"}`}>
                  {tier.name}
                </h3>
                <p className={`text-sm mt-1 ${tier.highlighted ? "text-background/60" : "text-muted-foreground"}`}>
                  {tier.description}
                </p>
              </div>
              <div className="mb-5 sm:mb-6">
                <span className={`font-display text-3xl sm:text-4xl font-bold ${tier.highlighted ? "text-background" : "text-foreground"}`}>
                  {tier.price}
                </span>
                <span className={`text-sm ${tier.highlighted ? "text-background/60" : "text-muted-foreground"}`}>
                  {tier.period}
                </span>
              </div>
              <ul className="space-y-2.5 sm:space-y-3 mb-6 sm:mb-8">
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
                asChild
              >
                <Link to="/signup">{tier.cta}</Link>
              </Button>
            </motion.div>
          ))}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-8 max-w-lg mx-auto">
          💡 Bir rasm generatsiya qilish taxminan $0.03-0.05 turadi. Starter rejada har bir rasm atigi ~$0.09, Pro rejada esa cheksiz!
        </p>
      </div>
    </section>
  );
};

export default PricingSection;
