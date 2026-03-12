import { motion, Variants } from "framer-motion";
import { Card } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface FeatureConfig {
  title: string;
  desc: string;
  icon: LucideIcon;
  color: string;
  bg: string;
  border: string;
}

interface FeatureGridProps {
  features: FeatureConfig[];
  variants?: Variants;
}

export default function FeatureGrid({ features, variants }: FeatureGridProps) {
  return (
    <div className="grid md:grid-cols-3 gap-6 md:gap-8">
      {features.map((f, i) => (
        <motion.div key={i} variants={variants}>
          <Card
            variant="glass"
            className={`p-8 rounded-3xl h-full border border-border/50 ${f.border} transition-all duration-500 group hover:shadow-2xl hover:shadow-primary/5`}
          >
            <div className={`w-14 h-14 ${f.bg} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 shadow-inner`}>
              <f.icon className={`w-7 h-7 ${f.color}`} />
            </div>
            <h3 className="text-xl font-bold mb-3 group-hover:text-primary transition-colors">
              {f.title}
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              {f.desc}
            </p>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
