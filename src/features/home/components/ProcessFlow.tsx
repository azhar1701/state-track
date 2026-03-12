import { motion, Variants } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface StepConfig {
  step: number;
  title: string;
  desc: string;
  icon: LucideIcon;
  gradient: string;
}

interface ProcessFlowProps {
  steps: StepConfig[];
  variants?: Variants;
}

export default function ProcessFlow({ steps, variants }: ProcessFlowProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
      {/* Connector lines (Desktop) */}
      <div className="hidden md:block absolute top-12 left-[15%] right-[15%] h-1 bg-muted/20 overflow-hidden">
        <motion.div 
          initial={{ x: "-100%" }}
          animate={{ x: "100%" }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          className="w-full h-full bg-gradient-to-r from-transparent via-primary/40 to-transparent"
        />
      </div>

      {steps.map((s, i) => (
        <motion.div
          key={i}
          variants={variants}
          className="relative z-10 flex flex-col items-center text-center group"
          whileHover={{ y: -5 }}
        >
          <div className="relative">
            <div className={`w-24 h-24 rounded-3xl bg-gradient-to-br ${s.gradient} p-0.5 shadow-2xl transition-all duration-500 group-hover:scale-105 group-hover:shadow-primary/20`}>
              <div className="w-full h-full bg-background/80 backdrop-blur-xl rounded-[22px] flex items-center justify-center relative overflow-hidden glass-surface border border-white/10">
                <div className={`absolute inset-0 bg-gradient-to-br ${s.gradient} opacity-5 group-hover:opacity-10 transition-opacity`} />
                <s.icon className="w-10 h-10 text-foreground relative z-10 transition-transform duration-500 group-hover:scale-110" />
              </div>
            </div>
            
            {/* Step Number with Glass Effect */}
            <div className="absolute -top-3 -right-3 w-9 h-9 flex items-center justify-center relative">
              <div className="absolute inset-0 bg-primary/90 backdrop-blur-sm rounded-xl rotate-12 group-hover:rotate-0 transition-transform duration-500 shadow-lg border border-white/20" />
              <span className="relative z-10 text-primary-foreground font-black text-sm italic">{s.step}</span>
            </div>
          </div>

          <h3 className="text-xl font-bold mt-8 mb-2 bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">{s.title}</h3>
          <p className="text-muted-foreground text-sm max-w-[200px] leading-relaxed">
            {s.desc}
          </p>
        </motion.div>
      ))}
    </div>
  );
}
