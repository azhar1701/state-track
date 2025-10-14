import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, MapPin, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Report {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  severity?: 'ringan' | 'sedang' | 'berat' | null;
  resolution?: string | null;
  latitude: number;
  longitude: number;
  location_name: string | null;
  photo_url: string | null;
  photo_urls?: string[] | null;
  created_at: string;
  user_id: string;
}

interface ReportLog {
  id: string;
  report_id: string;
  action: 'status_update' | 'bulk_status_update' | 'edit';
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  actor_id: string | null;
  actor_email: string | null;
  created_at: string;
}

interface ReportDetailDrawerProps {
  report: Report;
  onClose: () => void;
}

const statusColors = {
  baru: 'bg-amber-500 text-white',
  diproses: 'bg-blue-500 text-white',
  selesai: 'bg-green-600 text-white',
} as const;

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

  const [logs, setLogs] = useState<ReportLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        setLogsLoading(true);
        const { data, error } = await supabase
          .from('report_logs')
          .select('id, report_id, action, before, after, actor_id, actor_email, created_at')
          .eq('report_id', report.id)
          .order('created_at', { ascending: false });
        if (error) throw error;
        if (!cancelled) setLogs((data || []) as ReportLog[]);
      } catch (e) {
        // silently ignore in drawer; admin dashboard has full viewer
        if (!cancelled) setLogs([]);
      } finally {
        if (!cancelled) setLogsLoading(false);
      }
    };
    void run();
    return () => { cancelled = true; };
  }, [report.id]);

  const timeline = useMemo(() => {
    type Item = { time: string; label: string };
    const items: Item[] = [];
    try {
      items.push({ time: report.created_at, label: 'Dibuat (status: baru)' });
      // status changes
      logs
        .filter((l) => l.action === 'status_update' || l.action === 'bulk_status_update')
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        .forEach((l) => {
          const to = (l.after?.['status'] as string | undefined) || '-';
          const by = l.actor_email ? ` oleh ${l.actor_email}` : '';
          items.push({ time: l.created_at, label: `Status → ${to}${by}` });
        });
    } catch {
      // ignore
    }
    return items;
  }, [logs, report.created_at]);

  return (
    <Card
      role="dialog"
      aria-label="Detail laporan"
      className="
        flex flex-col
        w-full sm:w-[24rem] md:w-[28rem] lg:w-[32rem]
        max-w-[min(100vw-1.5rem,40rem)]
        max-h-[min(90vh,calc(100vh-80px))]
        overflow-hidden shadow-lg border
        bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80
      "
    >
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2 sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="space-y-1.5 flex-1 pr-2">
          <CardTitle className="text-base md:text-lg leading-tight break-words">{report.title}</CardTitle>
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <Badge variant="outline" className="px-2 py-0 h-5">
              {statusColors[report.status as keyof typeof statusColors] ? (
                <span className={`inline-block w-2 h-2 rounded-full mr-1 align-middle ${statusColors[report.status as keyof typeof statusColors].split(' ')[0]}`}></span>
              ) : (
                <span className="inline-block w-2 h-2 rounded-full mr-1 align-middle bg-slate-500"></span>
              )}
              {report.status}
            </Badge>
            <span>•</span>
            <Badge variant="secondary" className="px-2 py-0 h-5">
              {categoryLabels[report.category as keyof typeof categoryLabels] ?? report.category}
            </Badge>
          </div>
        </div>
        <Button aria-label="Tutup" title="Tutup" variant="ghost" size="sm" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3 flex-1 overflow-y-auto pr-1">
        {photos.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Dokumentasi</h4>
            <ul className="space-y-1">
              {photos.map((src, i) => (
                <li key={src + i}>
                  <button
                    type="button"
                    className="text-sm text-primary underline-offset-2 hover:underline focus:underline focus:outline-none"
                    onClick={() => { setActiveIndex(i); setLightboxOpen(true); }}
                  >
                    Lihat dokumentasi {i + 1}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="space-y-1">
          <h4 className="font-medium text-sm">Deskripsi</h4>
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap break-words">{report.description}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <h4 className="font-medium text-sm">Severity</h4>
            <div>
              {report.severity ? (
                <Badge variant={report.severity === 'berat' ? 'destructive' : report.severity === 'sedang' ? 'secondary' : 'outline'}>
                  {report.severity}
                </Badge>
              ) : (
                <span className="text-sm text-muted-foreground">-</span>
              )}
            </div>
          </div>
          <div className="space-y-1">
            <h4 className="font-medium text-sm">Hasil/Respon</h4>
            <div className="text-sm text-foreground whitespace-pre-wrap">{report.resolution || <span className="text-muted-foreground">-</span>}</div>
          </div>
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

        <div className="space-y-2 pt-1">
          <h4 className="font-medium text-sm">Linimasa Status</h4>
          {logsLoading ? (
            <div className="text-sm text-muted-foreground">Memuat riwayat…</div>
          ) : timeline.length === 0 ? (
            <div className="text-sm text-muted-foreground">Belum ada perubahan status.</div>
          ) : (
            <ol className="relative border-l pl-3 ml-1">
              {timeline.map((it, idx) => (
                <li key={idx} className="mb-3 ml-2">
                  <div className="absolute -left-[7px] mt-1 h-3 w-3 rounded-full bg-primary" />
                  <div className="text-xs text-muted-foreground">{format(new Date(it.time), 'dd MMM yyyy, HH:mm')}</div>
                  <div className="text-sm">{it.label}</div>
                </li>
              ))}
            </ol>
          )}
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
          <DialogContent className="w-[calc(100vw-2rem)] max-w-5xl sm:max-w-[90vw] md:max-w-4xl lg:max-w-3xl xl:max-w-5xl p-0 overflow-hidden">
            <DialogHeader className="px-4 pt-4 pb-2 sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
              <DialogTitle>Dokumentasi</DialogTitle>
              <DialogDescription>Klik di luar gambar untuk menutup.</DialogDescription>
            </DialogHeader>
            <div className="w-full flex items-center justify-center p-2 overflow-auto">
              <img
                src={photos[activeIndex]}
                alt={`${report.title} ${activeIndex + 1}`}
                className="max-h-[72vh] max-w-full w-auto object-contain rounded shadow-md"
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
