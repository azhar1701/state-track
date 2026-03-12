import { motion, useReducedMotion } from "framer-motion";

interface LiveMarqueeProps {
  items: string[];
}

export default function LiveMarquee({ items }: LiveMarqueeProps) {
  const prefersReducedMotion = useReducedMotion();
  if (items.length === 0) return null;

  const doubled = [...items, ...items];

  return (
    <div className="relative overflow-hidden py-4" aria-hidden="true">
      <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-background to-transparent z-10" />
      <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-background to-transparent z-10" />
      <motion.div
        className="flex gap-6 whitespace-nowrap"
        animate={prefersReducedMotion ? {} : { x: ["0%", "-50%"] }}
        transition={{
          duration: 30,
          ease: "linear",
          repeat: Infinity,
        }}
      >
        {doubled.map((text, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-card border border-border text-sm text-muted-foreground shadow-soft"
          >
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            {text}
          </span>
        ))}
      </motion.div>
    </div>
  );
}
