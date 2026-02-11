import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Calendar, AlertCircle, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

interface CustomPopupProps {
  report: {
    id: string;
    title: string;
    category: string;
    status: string;
    severity?: 'ringan' | 'sedang' | 'berat' | null;
    created_at: string;
    photo_url?: string | null;
  };
  onViewDetail: () => void;
}

const statusConfig = {
  baru: { badge: 'bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 border border-amber-200/50 dark:border-amber-500/30', dot: 'bg-amber-500' },
  diproses: { badge: 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 border border-blue-200/50 dark:border-blue-500/30', dot: 'bg-blue-500' },
  selesai: { badge: 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-500/30', dot: 'bg-emerald-500' },
};

const severityConfig = {
  ringan: { badge: 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400', icon: '◆' },
  sedang: { badge: 'bg-orange-500/10 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400', icon: '⬟' },
  berat: { badge: 'bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400', icon: '⚠' },
};

const categoryLabels: Record<string, string> = {
  irigasi: 'Irigasi',
  sungai: 'Sungai',
  jalan: 'Jalan',
  jembatan: 'Jembatan',
  drainase: 'Drainase',
  lainnya: 'Lainnya',
};

export const CustomPopup = ({ report, onViewDetail }: CustomPopupProps) => {
  const statusConf = statusConfig[report.status as keyof typeof statusConfig];
  const severityConf = report.severity ? severityConfig[report.severity] : null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
    >
      <Card className="w-80 p-0 overflow-hidden border-0 shadow-2xl shadow-black/20 dark:shadow-black/50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm hover:shadow-2xl transition-shadow duration-300">
        {/* Header dengan image */}
        {report.photo_url && (
          <div className="h-40 w-full bg-gradient-to-br from-slate-200 to-slate-100 dark:from-slate-800 dark:to-slate-700 relative overflow-hidden">
            <img 
              src={report.photo_url} 
              alt={report.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
            {/* Status indicator dot */}
            <div className={`absolute top-3 right-3 w-3 h-3 rounded-full ${statusConf?.dot || 'bg-gray-500'} shadow-lg`} />
          </div>
        )}
        
        <div className="p-4 space-y-3.5">
          {/* Title dengan status */}
          <div className="space-y-2">
            <h3 className="font-semibold text-sm leading-tight line-clamp-2 text-gray-900 dark:text-white">
              {report.title}
            </h3>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={`text-xs px-2.5 py-0.5 font-medium ${statusConf?.badge || 'bg-gray-100 text-gray-700'}`}>
                {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
              </Badge>
              {report.severity && (
                <Badge variant="secondary" className={`text-xs px-2.5 py-0.5 font-medium ${severityConf?.badge || ''}`}>
                  {severityConf?.icon} {report.severity.charAt(0).toUpperCase() + report.severity.slice(1)}
                </Badge>
              )}
            </div>
          </div>

          {/* Info grid - compact modern style */}
          <div className="space-y-2 py-1">
            {/* Category */}
            <div className="flex items-center gap-2.5 text-xs">
              <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-500/10">
                <MapPin className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Kategori</div>
                <div className="text-xs font-medium text-gray-900 dark:text-white">
                  {categoryLabels[report.category] || report.category}
                </div>
              </div>
            </div>

            {/* Date */}
            <div className="flex items-center gap-2.5 text-xs">
              <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-purple-50 dark:bg-purple-500/10">
                <Calendar className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Tanggal</div>
                <div className="text-xs font-medium text-gray-900 dark:text-white">
                  {new Date(report.created_at).toLocaleDateString('id-ID', { 
                    day: 'numeric', 
                    month: 'short', 
                    year: 'numeric' 
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* CTA Button */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Button 
              onClick={onViewDetail} 
              className="w-full h-9 text-sm font-medium bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-md hover:shadow-lg transition-all duration-200 group"
            >
              <span>Lihat Detail</span>
              <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-0.5 transition-transform" />
            </Button>
          </motion.div>
        </div>
      </Card>
    </motion.div>
  );
};
