import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, MapPin, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';

interface Report {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  latitude: number;
  longitude: number;
  location_name: string | null;
  photo_url: string | null;
  created_at: string;
  user_id: string;
}

interface ReportDetailDrawerProps {
  report: Report;
  onClose: () => void;
}

const statusColors = {
  baru: 'bg-amber-500 text-white',
  diproses: 'bg-blue-500 text-white',
  selesai: 'bg-green-600 text-white',
};

const categoryLabels = {
  jalan: 'Jalan',
  jembatan: 'Jembatan',
  lampu: 'Lampu',
  drainase: 'Drainase',
  taman: 'Taman',
  lainnya: 'Lainnya',
};

export const ReportDetailDrawer = ({ report, onClose }: ReportDetailDrawerProps) => {
  const openInGoogleMaps = () => {
    const url = `https://www.google.com/maps/search/?api=1&query=${report.latitude},${report.longitude}`;
    window.open(url, '_blank');
  };

  return (
    <Card className="w-96 max-h-[calc(100vh-120px)] overflow-auto shadow-2xl">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
        <div className="space-y-2 flex-1 pr-2">
          <CardTitle className="text-lg leading-tight">{report.title}</CardTitle>
          <div className="flex gap-2 flex-wrap">
            <Badge className={statusColors[report.status as keyof typeof statusColors]}>
              {report.status}
            </Badge>
            <Badge variant="outline">
              {categoryLabels[report.category as keyof typeof categoryLabels]}
            </Badge>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {report.photo_url && (
          <img
            src={report.photo_url}
            alt={report.title}
            className="w-full h-56 object-cover rounded-lg"
          />
        )}

        <div>
          <h4 className="font-semibold text-sm mb-2">Deskripsi</h4>
          <p className="text-sm text-muted-foreground leading-relaxed">{report.description}</p>
        </div>

        {report.location_name && (
          <div>
            <h4 className="font-semibold text-sm mb-2">Lokasi</h4>
            <div className="flex items-start gap-2 text-sm">
              <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <span className="text-muted-foreground">{report.location_name}</span>
            </div>
          </div>
        )}

        <div>
          <h4 className="font-semibold text-sm mb-2">Koordinat</h4>
          <p className="text-sm text-muted-foreground font-mono">
            {report.latitude.toFixed(6)}, {report.longitude.toFixed(6)}
          </p>
        </div>

        <div>
          <h4 className="font-semibold text-sm mb-2">Tanggal Laporan</h4>
          <p className="text-sm text-muted-foreground">
            {format(new Date(report.created_at), 'dd MMMM yyyy, HH:mm')}
          </p>
        </div>

        <Button onClick={openInGoogleMaps} className="w-full" variant="outline">
          <ExternalLink className="w-4 h-4 mr-2" />
          Buka di Google Maps
        </Button>
      </CardContent>
    </Card>
  );
};
