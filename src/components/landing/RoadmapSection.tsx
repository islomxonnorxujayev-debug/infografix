import { motion } from "framer-motion";
import { Video, Users, BarChart3, Layers, Globe } from "lucide-react";

const roadmapItems = [
  { icon: Layers, title: "AI Infografika", desc: "Mahsulot ma'lumotlaridan avtomatik infografika yaratish." },
  { icon: Video, title: "AI Video", desc: "Marketplace listing uchun qisqa mahsulot videolari." },
  { icon: Users, title: "Virtual Model", desc: "AI yaratgan modellar — fotosessiyasiz." },
  { icon: BarChart3, title: "Raqobatchi tahlili", desc: "Raqobatchilar rasmlarini tahlil qilib, tavsiyalar olish." },
  { icon: Globe, title: "Ko'p tilli interfeys", desc: "O'zbek, Rus va Ingliz tillarida to'liq qo'llab-quvvatlash." },
];

const RoadmapSection = () => {
  return (
    <section id="roadmap" className="py-16 sm:py-24">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12 sm:mb-16"
        >
          <span className="text-sm font-medium text-accent mb-3 block">Tez kunda</span>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4">
            <span className="text-gradient">Rejalarimiz</span>
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto">
            Marketplace sotuvchilari uchun eng yaxshi vositalarni yaratmoqdamiz.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 max-w-5xl mx-auto">
          {roadmapItems.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
              className="p-5 sm:p-6 rounded-2xl bg-card border border-dashed border-border hover:border-primary/30 transition-all"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                <item.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-display font-semibold text-foreground mb-1">{item.title}</h3>
              <p className="text-sm text-muted-foreground">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default RoadmapSection;
