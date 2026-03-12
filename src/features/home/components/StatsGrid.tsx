import { motion, Variants } from "framer-motion";
import { Card } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface StatConfig {
  label: string;
  value: number | string;
  icon: LucideIcon;
  color: string;
  bg: string;
}

interface StatsGridProps {
  stats: StatConfig[];
  variants?: Variants;
}

export default function StatsGrid({ stats, variants }: StatsGridProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5">
      {stats.map((stat, i) => (
        <motion.div key={i} variants={variants}>
          <Card
            variant="glass"
            className="p-5 md:p-6 rounded-2xl h-full hover:-translate-y-1 hover:shadow-xl transition-all duration-500 group"
          >
            <div className={`p-3 ${stat.bg} rounded-xl w-fit mb-3 group-hover:scale-110 transition-transform duration-500`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <div className={`text-3xl md:text-4xl font-black tracking-tighter ${stat.color} leading-none`}>
              {stat.value}
            </div>
            <div className="text-sm text-muted-foreground mt-1 font-medium">
              {stat.label}
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
