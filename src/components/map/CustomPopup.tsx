import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Calendar, AlertCircle } from 'lucide-react';

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

export const CustomPopup = ({ report, onViewDetail }: CustomPopupProps) => {
  const statusColors = {
    baru: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    diproses: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    selesai: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  };

  const severityColors = {
    ringan: 'text-emerald-600',
    sedang: 'text-orange-600',
    berat: 'text-red-600',
  };

  return (
    <Card className="w-72 p-0 overflow-hidden border-0 shadow-lifted">
      {report.photo_url && (
        <div className="h-32 w-full bg-muted relative overflow-hidden">
          <img 
            src={report.photo_url} 
            alt={report.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        </div>
      )}
      
      <div className="p-4 space-y-3">
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-sm leading-tight line-clamp-2">
              {report.title}
            </h3>
            <Badge className={`${statusColors[report.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'} text-[10px] px-1.5 py-0.5 shrink-0`}>
              {report.status}
            </Badge>
          </div>
          
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {report.category}
            </span>
            {report.severity && (
              <span className={`flex items-center gap-1 font-medium ${severityColors[report.severity]}`}>
                <AlertCircle className="w-3 h-3" />
                {report.severity}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Calendar className="w-3 h-3" />
            {new Date(report.created_at).toLocaleDateString('id-ID', { 
              day: 'numeric', 
              month: 'short', 
              year: 'numeric' 
            })}
          </div>
        </div>

        <Button 
          onClick={onViewDetail} 
          size="sm" 
          className="w-full h-8 text-xs btn-haptic"
        >
          Lihat Detail
        </Button>
      </div>
    </Card>
  );
};
