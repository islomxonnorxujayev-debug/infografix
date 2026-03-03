import { motion } from "framer-motion";
import { Video, Users, BarChart3, FlaskConical, Globe, Layers } from "lucide-react";

const roadmapItems = [
  { icon: Layers, title: "AI Infographic Generator", desc: "Auto-create marketplace infographics from your product data." },
  { icon: Video, title: "AI Video Generator", desc: "Produce short product videos optimized for marketplace listings." },
  { icon: Users, title: "Virtual Model", desc: "AI-generated models wearing your products — no photoshoot needed." },
  { icon: BarChart3, title: "Competitor Analyzer", desc: "Analyze competitor images and get optimization suggestions." },
  { icon: FlaskConical, title: "A/B Image Testing", desc: "Test image variations and find out which converts better." },
  { icon: Globe, title: "Multi-language Support", desc: "Full support for Uzbek, Russian, and English interfaces." },
];

const RoadmapSection = () => {
  return (
    <section id="roadmap" className="py-24">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-sm font-medium text-accent mb-3 block">Coming Soon</span>
          <h2 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4">
            What's on the <span className="text-gradient">Roadmap</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            We're building the ultimate toolkit for marketplace sellers. Here's what's next.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {roadmapItems.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
              className="p-6 rounded-2xl bg-card border border-dashed border-border hover:border-primary/30 transition-all"
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
