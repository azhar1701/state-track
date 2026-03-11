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
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <Card variant="glass" className="border-l-4 border-l-primary">
          <CardHeader className="pb-2 pt-3 md:pt-4 px-3 md:px-4">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-2xs font-medium text-muted-foreground uppercase tracking-wider">Total Laporan</CardTitle>
              <FileText className="w-3 h-3 md:w-4 md:h-4 text-primary/60 flex-shrink-0" />
            </div>
            <div className="text-xl md:text-2xl font-bold mt-1">{stats.total}</div>
          </CardHeader>
        </Card>
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card variant="glass" className="border-l-4 border-l-amber-500">
          <CardHeader className="pb-2 pt-3 md:pt-4 px-3 md:px-4">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-2xs font-medium text-muted-foreground uppercase tracking-wider">Baru</CardTitle>
              <Clock className="w-4 h-4 text-amber-500/60" />
            </div>
            <div className="text-2xl font-bold mt-1">{stats.baru}</div>
          </CardHeader>
        </Card>
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <Card variant="glass" className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2 pt-3 md:pt-4 px-3 md:px-4">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-2xs font-medium text-muted-foreground uppercase tracking-wider">Diproses</CardTitle>
              <Loader2 className="w-4 h-4 text-primary/60" />
            </div>
            <div className="text-2xl font-bold mt-1">{stats.diproses}</div>
          </CardHeader>
        </Card>
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card variant="glass" className="border-l-4 border-l-green-500">
          <CardHeader className="pb-2 pt-3 md:pt-4 px-3 md:px-4">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-2xs font-medium text-muted-foreground uppercase tracking-wider">Selesai</CardTitle>
              <CheckCircle className="w-4 h-4 text-green-500/60" />
            </div>
            <div className="text-2xl font-bold mt-1">{stats.selesai}</div>
          </CardHeader>
        </Card>
      </motion.div>
    </div>
  );
};
