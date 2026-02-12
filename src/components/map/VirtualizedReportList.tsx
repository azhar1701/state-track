import { Virtuoso } from 'react-virtuoso';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface Report {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  severity?: 'ringan' | 'sedang' | 'berat' | null;
  latitude: number;
  longitude: number;
  created_at: string;
  photo_url?: string | null;
  // Reporter information
  reporter_name?: string | null;
  phone?: string | null;
  // Administrative location
  kecamatan?: string | null;
  desa?: string | null;
}

interface VirtualizedReportListProps {
  reports: Report[];
  onReportClick: (report: Report) => void;
  height?: number | string;
}

const statusColors = {
  baru: 'bg-amber-500',
  diproses: 'bg-blue-500',
  selesai: 'bg-green-500',
} as const;

const severityColors = {
  ringan: 'bg-green-600',
  sedang: 'bg-orange-500',
  berat: 'bg-red-600',
} as const;

export function VirtualizedReportList({
  reports,
  onReportClick,
  height = '600px',
}: VirtualizedReportListProps) {
  return (
    <Virtuoso
      style={{ height }}
      data={reports}
      itemContent={(index, report) => (
        <div className="px-2 py-1">
          <Card
            className="glass-card cursor-pointer hover:shadow-lg transition-all duration-200 border-none"
            onClick={() => onReportClick(report)}
          >
            <CardContent className="p-4">
              <div className="flex gap-3">
                {report.photo_url && (
                  <img
                    src={report.photo_url}
                    alt={report.title}
                    className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                    loading="lazy"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-sm line-clamp-1">{report.title}</h3>
                    <Badge className={`${statusColors[report.status as keyof typeof statusColors] || 'bg-gray-500'} text-white text-xs`}>
                      {report.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                    {report.description}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      <span>{report.category}</span>
                    </div>
                    {report.severity && (
                      <Badge variant="outline" className={`${severityColors[report.severity]} text-white text-xs px-1.5 py-0`}>
                        {report.severity}
                      </Badge>
                    )}
                    <div className="flex items-center gap-1 ml-auto">
                      <Calendar className="w-3 h-3" />
                      <span>{format(new Date(report.created_at), 'dd/MM/yy')}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    />
  );
}
