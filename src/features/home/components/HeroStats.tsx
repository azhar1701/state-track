import { motion, useReducedMotion } from "framer-motion";
import { BarChart3 } from "lucide-react";

interface HeroStatsProps {
  stats: {
    total: number;
    baru: number;
    diproses: number;
    selesai: number;
  };
}

export default function HeroStats({ stats }: HeroStatsProps) {
  const prefersReducedMotion = useReducedMotion();
  
  return (
    <div className="relative w-full h-full min-h-[340px] md:min-h-[420px] flex items-center justify-center">
      {/* Background depth elements */}
      <motion.div
        animate={
          prefersReducedMotion
            ? {}
            : { scale: [1, 1.15, 1], opacity: [0.4, 0.6, 0.4] }
        }
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute w-64 h-64 md:w-80 md:h-80 bg-primary/15 rounded-full blur-[90px]"
      />
      <motion.div
        animate={
          prefersReducedMotion
            ? {}
            : { scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }
        }
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2,
        }}
        className="absolute w-52 h-52 md:w-72 md:h-72 bg-accent/10 rounded-full blur-[70px] translate-x-12 -translate-y-12"
      />

      {/* Floating real-stats card */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 1, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-[300px] md:w-[360px]"
      >
        <div className="rounded-3xl bg-card/40 backdrop-blur-2xl border border-white/10 shadow-lifted p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center shadow-inner">
                <BarChart3 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">Status Terkini</div>
                <div className="text-sm font-bold">Ringkasan SDA</div>
              </div>
            </div>
            <div className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Laporan Baru", value: stats.baru, color: "text-amber-500", bg: "bg-amber-500/10" },
              { label: "Diproses", value: stats.diproses, color: "text-primary", bg: "bg-primary/10" },
              { label: "Selesai", value: stats.selesai, color: "text-green-500", bg: "bg-green-500/10" },
              { label: "Total", value: stats.total, color: "text-foreground", bg: "bg-muted/50" },
            ].map((s) => (
              <div
                key={s.label}
                className={`rounded-2xl ${s.bg} border border-white/5 p-4 transition-all duration-300 hover:border-white/10`}
              >
                <div className={`text-2xl md:text-3xl font-black tracking-tighter ${s.color}`}>
                  {s.value}
                </div>
                <div className="text-[10px] font-semibold text-muted-foreground mt-0.5 truncate uppercase tracking-wide">
                  {s.label}
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-1.5 pt-2">
            <div className="flex justify-between text-[10px] font-bold text-muted-foreground/80">
              <span>PENYELESAIAN</span>
              <span>{stats.total > 0 ? Math.round((stats.selesai / stats.total) * 100) : 0}%</span>
            </div>
            <div className="h-1.5 w-full bg-muted/30 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${stats.total > 0 ? (stats.selesai / stats.total) * 100 : 0}%` }}
                transition={{ duration: 1.5, delay: 0.8, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-primary to-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.3)]"
              />
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
