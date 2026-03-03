import { motion } from "framer-motion";
import {
  Eraser, Sun, Focus, Layers, Palette, Maximize,
  Store, Zap, Shield
} from "lucide-react";

const features = [
  {
    icon: Eraser,
    title: "Smart Background Removal",
    description: "AI precisely cuts out your product with clean edges, ready for any background.",
  },
  {
    icon: Sun,
    title: "Studio Lighting Simulation",
    description: "Professional lighting applied automatically — soft shadows, highlights, and depth.",
  },
  {
    icon: Focus,
    title: "Detail Sharpening",
    description: "Enhance textures and fine details while maintaining a natural, non-processed look.",
  },
  {
    icon: Store,
    title: "Marketplace Optimization",
    description: "Auto-format for Uzum, Wildberries, Ozon, Amazon with correct ratios and padding.",
  },
  {
    icon: Palette,
    title: "6 Style Presets",
    description: "From clean white studio to premium dark luxury — choose the perfect mood.",
  },
  {
    icon: Maximize,
    title: "4K AI Upscale",
    description: "Upscale images to high resolution without losing quality. Print-ready output.",
  },
  {
    icon: Layers,
    title: "Realistic Shadows",
    description: "Ground shadows and reflections that make products look professionally photographed.",
  },
  {
    icon: Zap,
    title: "Fast Processing",
    description: "Get results in seconds, not hours. Batch process your entire catalog efficiently.",
  },
  {
    icon: Shield,
    title: "Commercial Quality",
    description: "No cartoon effects. Real e-commerce photography standard that converts visitors to buyers.",
  },
];

const FeaturesSection = () => {
  return (
    <section id="features" className="py-24 bg-card">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-sm font-medium text-primary mb-3 block">Features</span>
          <h2 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4">
            Everything You Need for{" "}
            <span className="text-gradient">Perfect Product Photos</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Professional photography studio in your browser. No equipment, no photographer, no hassle.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="group p-6 rounded-2xl bg-background border border-border hover:shadow-elevated hover:border-primary/20 transition-all duration-300"
            >
              <div className="w-11 h-11 rounded-xl gradient-primary flex items-center justify-center mb-4">
                <feature.icon className="h-5 w-5 text-primary-foreground" />
              </div>
              <h3 className="font-display text-lg font-semibold text-foreground mb-2">
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
