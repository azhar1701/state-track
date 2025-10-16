import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MapPin, ExternalLink, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

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

const severityStyles: Record<NonNullable<Report['severity']>, string> = {
  ringan: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  sedang: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  berat: 'bg-red-500/15 text-red-600 dark:text-red-400',
};

export const ReportDetailDrawer = ({ report, onClose }: ReportDetailDrawerProps) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const photos: string[] = (report.photo_urls && report.photo_urls.length > 0)
    ? report.photo_urls
    : (report.photo_url ? [report.photo_url] : []);
  const [activeIndex, setActiveIndex] = useState(0);
  const [logs, setLogs] = useState<ReportLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const statusTone = statusColors[report.status as keyof typeof statusColors] ?? 'bg-muted text-foreground';
  const severityTone = report.severity ? severityStyles[report.severity] : '';
  const categoryLabel = categoryLabels[report.category as keyof typeof categoryLabels] ?? report.category;
  const formattedCreatedAt = useMemo(
    () => format(new Date(report.created_at), 'dd MMM yyyy, HH:mm'),
    [report.created_at],
  );

  const openInGoogleMaps = () => {
    const url = `https://www.google.com/maps/search/?api=1&query=${report.latitude},${report.longitude}`;
    window.open(url, '_blank');
  };

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
      } catch {
        if (!cancelled) setLogs([]);
      } finally {
        if (!cancelled) setLogsLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [report.id]);

  const timeline = useMemo(() => {
    type Item = { time: string; label: string };
    const items: Item[] = [];
    try {
      items.push({ time: report.created_at, label: 'Dibuat (status: baru)' });
      logs
        .filter((l) => l.action === 'status_update' || l.action === 'bulk_status_update')
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        .forEach((l) => {
          const to = (l.after?.['status'] as string | undefined) || '-';
          const by = l.actor_email ? ` oleh ${l.actor_email}` : '';
          items.push({ time: l.created_at, label: `Status -> ${to}${by}` });
        });
    } catch {
      // ignore parse issues
    }
    return items;
  }, [logs, report.created_at]);

  const metaItems = [
    { label: 'Dibuat', value: formattedCreatedAt },
    {
      label: 'Koordinat',
      value: `${report.latitude.toFixed(6)}, ${report.longitude.toFixed(6)}`,
      valueClassName: 'font-mono text-[11px] tracking-tight',
    },
    { label: 'Status', value: report.status, valueClassName: 'capitalize' },
    { label: 'Kategori', value: categoryLabel, valueClassName: 'capitalize' },
    { label: 'Severity', value: report.severity, valueClassName: 'capitalize' },
  ];

  return (
    <Card
      role="dialog"
      aria-label="Detail laporan"
      className="flex h-full w-full max-h-inherit flex-col overflow-hidden rounded-xl border border-border/70 bg-background/95 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/80"
    >
      <CardHeader className="sticky top-0 z-10 border-b border-border/60 bg-background/95 px-3 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1.5">
            <CardTitle className="text-[15px] font-semibold leading-tight tracking-tight">
              {report.title || 'Tanpa judul'}
            </CardTitle>
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
              <Badge className={cn('h-5 px-2 py-0 capitalize', statusTone)}>{report.status}</Badge>
              <Badge variant="outline" className="h-5 px-2 py-0 capitalize">
                {categoryLabel}
              </Badge>
              {report.severity && (
                <Badge className={cn('h-5 px-2 py-0 capitalize', severityTone)}>
                  {report.severity}
                </Badge>
              )}
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Tutup</span>
          </Button>
        </div>
        {report.location_name && (
          <p className="mt-2 flex items-start gap-2 text-[11px] text-muted-foreground">
            <MapPin className="mt-[2px] h-3.5 w-3.5 flex-shrink-0" />
            <span className="min-w-0 break-words leading-snug">{report.location_name}</span>
          </p>
        )}
      </CardHeader>
      <ScrollArea className="flex-1">
        <CardContent className="flex flex-col gap-4 px-3 py-3">
          {photos.length > 0 && (
            <section className="space-y-2">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Dokumentasi
              </p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {photos.map((src, i) => (
                  <button
                    key={`${src}-${i}`}
                    type="button"
                    onClick={() => {
                      setActiveIndex(i);
                      setLightboxOpen(true);
                    }}
                    className={cn(
                      'relative h-20 w-28 overflow-hidden rounded-lg border border-border/60 bg-muted/40 transition-colors hover:border-primary',
                      activeIndex === i && 'border-primary'
                    )}
                  >
                    <img
                      src={src}
                      alt={`${report.title || 'Laporan'} ${i + 1}`}
                      className="h-full w-full object-cover"
                    />
                    <span className="absolute bottom-1 right-1 rounded bg-background/85 px-1 text-[10px] text-foreground shadow-sm">
                      {i + 1}/{photos.length}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}

          <section className="space-y-2">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Ringkasan</p>
            <div className="space-y-1.5 text-xs">
              {metaItems.map((item) => (
                <div key={item.label} className="flex items-start justify-between gap-3">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className={cn('text-right text-foreground', item.valueClassName)}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-2">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Deskripsi</p>
            <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap break-words">
              {report.description || <span className="text-muted-foreground">Tidak ada deskripsi tambahan.</span>}
            </p>
          </section>

          <section className="space-y-2">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Respon</p>
            <div className="space-y-2">
              <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap break-words">
                {report.resolution || <span className="text-muted-foreground">Belum ada respon.</span>}
              </p>
            </div>
          </section>

          <section className="space-y-2">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Riwayat Status</p>
            {logsLoading ? (
              <p className="text-xs text-muted-foreground">Memuat riwayat...</p>
            ) : timeline.length === 0 ? (
              <p className="text-xs text-muted-foreground">Belum ada perubahan status.</p>
            ) : (
              <ol className="space-y-3 text-xs text-foreground">
                {timeline.map((it, idx) => (
                  <li key={idx} className="space-y-1">
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      {format(new Date(it.time), 'dd MMM yyyy, HH:mm')}
                    </div>
                    <div className="leading-snug">{it.label}</div>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <Button onClick={openInGoogleMaps} className="w-full" size="sm" variant="outline">
            <ExternalLink className="mr-2 h-4 w-4" />
            Buka di Google Maps
          </Button>
        </CardContent>
      </ScrollArea>
      {photos.length > 0 && (
        <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
          <DialogContent className="w-[calc(100vw-2rem)] max-w-5xl overflow-hidden p-0 sm:max-w-[90vw] md:max-w-4xl lg:max-w-3xl xl:max-w-5xl">
            <DialogHeader className="sticky top-0 z-10 bg-background/95 px-4 pb-2 pt-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
              <DialogTitle>Dokumentasi</DialogTitle>
              <DialogDescription>Klik di luar gambar untuk menutup.</DialogDescription>
            </DialogHeader>
            <div className="flex w-full items-center justify-center overflow-auto p-2">
              <img
                src={photos[activeIndex]}
                alt={`${report.title || 'Laporan'} ${activeIndex + 1}`}
                className="max-h-[72vh] w-auto max-w-full rounded-lg object-contain shadow-md"
              />
            </div>
            {photos.length > 1 && (
              <div className="flex items-center justify-between px-4 pb-4 text-sm text-muted-foreground">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setActiveIndex((i) => (i - 1 + photos.length) % photos.length)}
                >
                  Sebelumnya
                </Button>
                <span>{activeIndex + 1} / {photos.length}</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setActiveIndex((i) => (i + 1) % photos.length)}
                >
                  Berikutnya
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
};
