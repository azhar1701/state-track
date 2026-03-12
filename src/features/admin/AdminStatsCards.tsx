import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Clock, CheckCircle, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

interface AdminStatsCardsProps {
  stats: {
    total: number;
    baru: number;
    diproses: number;
    selesai: number;
  };
}

export const AdminStatsCards = ({ stats }: AdminStatsCardsProps) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 mb-4 md:mb-5">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="h-full">
        <Card variant="glass-surface" className="border-l-4 border-l-primary h-full overflow-hidden">
          <CardHeader className="pb-2 pt-3 md:pt-4 px-3 md:px-4">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Laporan</CardTitle>
              <div className="p-1.5 rounded-lg bg-primary/10">
                <FileText className="w-3.5 h-3.5 md:w-4 md:h-4 text-primary" />
              </div>
            </div>
            <div className="text-xl md:text-2xl font-black mt-2 tracking-tight">{stats.total}</div>
          </CardHeader>
        </Card>
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="h-full">
        <Card variant="glass-surface" className="border-l-4 border-l-amber-500 h-full overflow-hidden">
          <CardHeader className="pb-2 pt-3 md:pt-4 px-3 md:px-4">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Baru</CardTitle>
              <div className="p-1.5 rounded-lg bg-amber-500/10">
                <Clock className="w-3.5 h-3.5 md:w-4 md:h-4 text-amber-500" />
              </div>
            </div>
            <div className="text-xl md:text-2xl font-black mt-2 tracking-tight">{stats.baru}</div>
          </CardHeader>
        </Card>
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="h-full">
        <Card variant="glass-surface" className="border-l-4 border-l-blue-500 h-full overflow-hidden">
          <CardHeader className="pb-2 pt-3 md:pt-4 px-3 md:px-4">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Diproses</CardTitle>
              <div className="p-1.5 rounded-lg bg-blue-500/10">
                <Loader2 className="w-3.5 h-3.5 md:w-4 md:h-4 text-primary animate-spin" />
              </div>
            </div>
            <div className="text-xl md:text-2xl font-black mt-2 tracking-tight">{stats.diproses}</div>
          </CardHeader>
        </Card>
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="h-full">
        <Card variant="glass-surface" className="border-l-4 border-l-emerald-500 h-full overflow-hidden">
          <CardHeader className="pb-2 pt-3 md:pt-4 px-3 md:px-4">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Selesai</CardTitle>
              <div className="p-1.5 rounded-lg bg-emerald-500/10">
                <CheckCircle className="w-3.5 h-3.5 md:w-4 md:h-4 text-emerald-500" />
              </div>
            </div>
            <div className="text-xl md:text-2xl font-black mt-2 tracking-tight">{stats.selesai}</div>
          </CardHeader>
        </Card>
      </motion.div>
    </div>
  );
};
