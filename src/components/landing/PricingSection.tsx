import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { Link } from "react-router-dom";

const tiers = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Try it out",
    features: ["3 image generations", "Standard resolution", "All style presets", "All marketplace formats"],
    cta: "Get Started",
    highlighted: false,
  },
  {
    name: "Basic",
    price: "$19",
    period: "/month",
    description: "For growing sellers",
    features: ["50 images/month", "High resolution", "All style presets", "All marketplace formats", "Priority support"],
    cta: "Start Basic",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$49",
    period: "/month",
    description: "For power sellers",
    features: [
      "Unlimited standard images",
      "High resolution",
      "All enhancements",
      "Batch processing",
      "Priority support",
      "Download history",
    ],
    cta: "Start Pro",
    highlighted: true,
  },
  {
    name: "Premium",
    price: "$79",
    period: "/month",
    description: "Maximum quality",
    features: [
      "Unlimited images",
      "4K resolution",
      "Advanced lighting",
      "Priority processing",
      "API access",
      "Dedicated support",
      "Custom presets",
    ],
    cta: "Start Premium",
    highlighted: false,
  },
];

const PricingSection = () => {
  return (
    <section id="pricing" className="py-24 bg-card">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-sm font-medium text-primary mb-3 block">Pricing</span>
          <h2 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4">
            Simple, Transparent <span className="text-gradient">Pricing</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Start free. Upgrade when you need more. Cancel anytime.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {tiers.map((tier, i) => (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className={`relative p-6 rounded-2xl border transition-all ${
                tier.highlighted
                  ? "bg-foreground text-background border-foreground shadow-glow scale-[1.02]"
                  : "bg-background border-border hover:shadow-elevated"
              }`}
            >
              {tier.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full gradient-primary text-primary-foreground text-xs font-semibold">
                  Most Popular
                </div>
              )}
              <div className="mb-6">
                <h3 className={`font-display text-lg font-semibold ${tier.highlighted ? "text-background" : "text-foreground"}`}>
                  {tier.name}
                </h3>
                <p className={`text-sm mt-1 ${tier.highlighted ? "text-background/60" : "text-muted-foreground"}`}>
                  {tier.description}
                </p>
              </div>
              <div className="mb-6">
                <span className={`font-display text-4xl font-bold ${tier.highlighted ? "text-background" : "text-foreground"}`}>
                  {tier.price}
                </span>
                <span className={`text-sm ${tier.highlighted ? "text-background/60" : "text-muted-foreground"}`}>
                  {tier.period}
                </span>
              </div>
              <ul className="space-y-3 mb-8">
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
      </div>
    </section>
  );
};

export default PricingSection;
