import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, MapPin, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useState } from 'react';

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
  photo_urls?: string[] | null;
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
  irigasi: 'Irigasi',
  drainase: 'Drainase',
  sungai: 'Sungai',
  lainnya: 'Lainnya',
} as const;

export const ReportDetailDrawer = ({ report, onClose }: ReportDetailDrawerProps) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const photos: string[] = (report.photo_urls && report.photo_urls.length > 0)
    ? report.photo_urls
    : (report.photo_url ? [report.photo_url] : []);
  const [activeIndex, setActiveIndex] = useState(0);
  const openInGoogleMaps = () => {
    const url = `https://www.google.com/maps/search/?api=1&query=${report.latitude},${report.longitude}`;
    window.open(url, '_blank');
  };

  return (
    <Card
      role="dialog"
      aria-label="Detail laporan"
      className="
        w-full sm:w-[24rem] md:w-[28rem] lg:w-[32rem]
        max-w-[min(100vw-2rem,40rem)]
        max-h-[min(80vh,calc(100vh-120px))]
        overflow-auto shadow-lg border
        bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80
      "
    >
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="space-y-1.5 flex-1 pr-2">
          <CardTitle className="text-base md:text-lg leading-tight break-words">{report.title}</CardTitle>
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <Badge variant="outline" className="px-2 py-0 h-5">
              {statusColors[report.status as keyof typeof statusColors] ? (
                <span className={`inline-block w-2 h-2 rounded-full mr-1 align-middle ${statusColors[report.status as keyof typeof statusColors].split(' ')[0]}`}></span>
              ) : null}
              {report.status}
            </Badge>
            <span>•</span>
            <Badge variant="secondary" className="px-2 py-0 h-5">
              {categoryLabels[report.category as keyof typeof categoryLabels]}
            </Badge>
          </div>
        </div>
        <Button aria-label="Tutup" title="Tutup" variant="ghost" size="sm" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {photos.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {photos.slice(0, 6).map((src, i) => (
              <img
                key={src + i}
                src={src}
                alt={`${report.title} ${i + 1}`}
                className="h-24 w-full object-cover rounded border cursor-zoom-in"
                loading="lazy"
                onClick={() => { setActiveIndex(i); setLightboxOpen(true); }}
              />
            ))}
          </div>
        )}

        <div className="space-y-1">
          <h4 className="font-medium text-sm">Deskripsi</h4>
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{report.description}</p>
        </div>

        {report.location_name && (
          <div className="space-y-1">
            <h4 className="font-medium text-sm">Lokasi</h4>
            <div className="flex items-start gap-2 text-sm">
              <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <span className="text-muted-foreground break-words">{report.location_name}</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-xs text-muted-foreground">Koordinat</div>
            <div className="font-mono text-sm text-foreground">{report.latitude.toFixed(6)}, {report.longitude.toFixed(6)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Tanggal</div>
            <div className="text-sm text-foreground">{format(new Date(report.created_at), 'dd MMMM yyyy, HH:mm')}</div>
          </div>
        </div>

        <div className="pt-1">
          <Button onClick={openInGoogleMaps} className="w-full" size="sm" variant="outline">
            <ExternalLink className="w-4 h-4 mr-2" />
            Buka di Google Maps
          </Button>
        </div>
      </CardContent>
      {photos.length > 0 && (
        <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
          <DialogContent className="sm:max-w-[90vw] p-0">
            <DialogHeader className="px-4 pt-4 pb-2">
              <DialogTitle>Dokumentasi</DialogTitle>
              <DialogDescription>Klik di luar gambar untuk menutup.</DialogDescription>
            </DialogHeader>
            <div className="w-full flex items-center justify-center p-2">
              <img
                src={photos[activeIndex]}
                alt={`${report.title} ${activeIndex + 1}`}
                className="max-h-[80vh] w-auto object-contain rounded"
              />
            </div>
            {photos.length > 1 && (
              <div className="flex items-center justify-between px-4 pb-4 text-sm text-muted-foreground">
                <Button size="sm" variant="outline" onClick={() => setActiveIndex((i) => (i - 1 + photos.length) % photos.length)}>Sebelumnya</Button>
                <span>{activeIndex + 1} / {photos.length}</span>
                <Button size="sm" variant="outline" onClick={() => setActiveIndex((i) => (i + 1) % photos.length)}>Berikutnya</Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
};
