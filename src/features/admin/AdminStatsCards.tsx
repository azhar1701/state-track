import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Clock, CheckCircle2, RefreshCw } from "lucide-react";
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
  const resolutionRate = stats.total > 0 ? Math.round((stats.selesai / stats.total) * 100) : 0;
  const inProgressRate = stats.total > 0 ? Math.round((stats.diproses / stats.total) * 100) : 0;
  const newRate = stats.total > 0 ? Math.round((stats.baru / stats.total) * 100) : 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 mb-4 md:mb-5">
      {/* 1. Total Laporan */}
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }} className="h-full">
        <Card variant="glass-surface" className="border-l-4 border-l-primary h-full overflow-hidden hover:shadow-md transition-shadow">
          <CardHeader className="pb-2.5 pt-3 md:pt-4 px-3 md:px-4">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Laporan</CardTitle>
              <div className="p-1.5 rounded-lg bg-primary/10">
                <FileText className="w-3.5 h-3.5 md:w-4 md:h-4 text-primary" />
              </div>
            </div>
            <div className="flex items-baseline justify-between gap-1 mt-1.5">
              <div className="text-xl md:text-2xl font-black tracking-tight">{stats.total}</div>
              <Badge variant="secondary" className="text-2xs font-semibold px-1.5 py-0.2 bg-primary/10 text-primary border-primary/20">
                100%
              </Badge>
            </div>
            {/* Visual ratio bar */}
            <div className="w-full h-1.5 bg-muted/60 rounded-full overflow-hidden flex mt-2">
              <div style={{ width: `${resolutionRate}%` }} className="bg-emerald-500 h-full" title={`Selesai: ${resolutionRate}%`} />
              <div style={{ width: `${inProgressRate}%` }} className="bg-blue-500 h-full" title={`Diproses: ${inProgressRate}%`} />
              <div style={{ width: `${newRate}%` }} className="bg-amber-500 h-full" title={`Baru: ${newRate}%`} />
            </div>
          </CardHeader>
        </Card>
      </motion.div>

      {/* 2. Baru */}
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }} className="h-full">
        <Card variant="glass-surface" className="border-l-4 border-l-amber-500 h-full overflow-hidden hover:shadow-md transition-shadow">
          <CardHeader className="pb-2.5 pt-3 md:pt-4 px-3 md:px-4">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Perlu Triase</CardTitle>
              <div className="p-1.5 rounded-lg bg-amber-500/10">
                <Clock className="w-3.5 h-3.5 md:w-4 md:h-4 text-amber-500" />
              </div>
            </div>
            <div className="flex items-baseline justify-between gap-1 mt-1.5">
              <div className="text-xl md:text-2xl font-black tracking-tight text-amber-500">{stats.baru}</div>
              <Badge variant="secondary" className="text-2xs font-semibold px-1.5 py-0.2 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
                {newRate}% beban
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2 truncate">Menunggu verifikasi awal</p>
          </CardHeader>
        </Card>
      </motion.div>

      {/* 3. Diproses */}
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }} className="h-full">
        <Card variant="glass-surface" className="border-l-4 border-l-blue-500 h-full overflow-hidden hover:shadow-md transition-shadow">
          <CardHeader className="pb-2.5 pt-3 md:pt-4 px-3 md:px-4">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sedang Diproses</CardTitle>
              <div className="p-1.5 rounded-lg bg-blue-500/10">
                <RefreshCw className="w-3.5 h-3.5 md:w-4 md:h-4 text-blue-500" />
              </div>
            </div>
            <div className="flex items-baseline justify-between gap-1 mt-1.5">
              <div className="text-xl md:text-2xl font-black tracking-tight text-blue-500">{stats.diproses}</div>
              <Badge variant="secondary" className="text-2xs font-semibold px-1.5 py-0.2 bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">
                {inProgressRate}% aktif
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2 truncate">Penanganan tim lapangan</p>
          </CardHeader>
        </Card>
      </motion.div>

      {/* 4. Selesai */}
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }} className="h-full">
        <Card variant="glass-surface" className="border-l-4 border-l-emerald-500 h-full overflow-hidden hover:shadow-md transition-shadow">
          <CardHeader className="pb-2.5 pt-3 md:pt-4 px-3 md:px-4">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Selesai Ditangani</CardTitle>
              <div className="p-1.5 rounded-lg bg-emerald-500/10">
                <CheckCircle2 className="w-3.5 h-3.5 md:w-4 md:h-4 text-emerald-500" />
              </div>
            </div>
            <div className="flex items-baseline justify-between gap-1 mt-1.5">
              <div className="text-xl md:text-2xl font-black tracking-tight text-emerald-500">{stats.selesai}</div>
              <Badge variant="secondary" className="text-2xs font-semibold px-1.5 py-0.2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                {resolutionRate}% rasio
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2 truncate">Telah terverifikasi tuntas</p>
          </CardHeader>
        </Card>
      </motion.div>
    </div>
  );
};
