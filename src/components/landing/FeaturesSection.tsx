import { motion } from "framer-motion";
import {
  Eraser, Sun, Focus, Store, Palette, Maximize, Zap
} from "lucide-react";

const features = [
  {
    icon: Eraser,
    title: "Fonni olib tashlash",
    description: "AI mahsulotni aniq kesib oladi — toza qirralar, istalgan fonga tayyor.",
  },
  {
    icon: Sun,
    title: "Studio yorug'ligi",
    description: "Professional yorug'lik avtomatik qo'llanadi — soyalar, yaltiroqlik va chuqurlik.",
  },
  {
    icon: Focus,
    title: "Detal aniqligi",
    description: "Tekstura va mayda detallarni kuchaytiradi, tabiiy ko'rinishni saqlagan holda.",
  },
  {
    icon: Store,
    title: "Marketplace optimizatsiya",
    description: "Uzum, Wildberries, Ozon uchun to'g'ri o'lcham va formatda avtomatik tayyorlash.",
  },
  {
    icon: Palette,
    title: "6 ta stil preset",
    description: "Oq studio fonidan premium qora fonigacha — kerakli kayfiyatni tanlang.",
  },
  {
    icon: Maximize,
    title: "4K sifat",
    description: "Rasmlarni sifat yo'qotmasdan yuqori resolutsiyaga kengaytirish.",
  },
  {
    icon: Zap,
    title: "Tez ishlash",
    description: "Natijani soniyalarda oling. Butun katalogni batch rejimda ishlating.",
  },
];

const FeaturesSection = () => {
  return (
    <section id="features" className="py-16 sm:py-24 bg-card">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12 sm:mb-16"
        >
          <span className="text-sm font-medium text-primary mb-3 block">Imkoniyatlar</span>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4">
            Professional rasm uchun{" "}
            <span className="text-gradient">barcha kerakli vositalar</span>
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto">
            Studio sifatidagi fotosurat — brauzeringizda. Uskunasiz, fotografsiz.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 max-w-5xl mx-auto">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
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
                {feature.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
