import { useState, useEffect, useRef } from 'react';
import { X, Share2, Navigation, ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import Lightbox from 'yet-another-react-lightbox';
import 'yet-another-react-lightbox/styles.css';
import useEmblaCarousel from 'embla-carousel-react';

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

interface ReportDetailViewProps {
  report: Report;
  onClose: () => void;
  onNavigate?: () => void;
  isAdmin?: boolean;
}

const statusColors = {
  baru: 'bg-amber-500 text-white',
  diproses: 'bg-blue-500 text-white',
  selesai: 'bg-green-600 text-white',
} as const;

const severityColors = {
  ringan: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  sedang: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  berat: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
} as const;

const categoryLabels: Record<string, string> = {
  irigasi: 'Irigasi',
  sungai: 'Sungai',
  jalan: 'Jalan',
  jembatan: 'Jembatan',
  drainase: 'Drainase',
  lainnya: 'Lainnya',
};

const statusLabels: Record<string, string> = {
  baru: 'Baru',
  diproses: 'Diproses',
  selesai: 'Selesai',
};

const severityLabels: Record<string, string> = {
  ringan: 'Ringan',
  sedang: 'Sedang',
  berat: 'Berat',
};

export const ReportDetailView = ({ report, onClose, onNavigate, isAdmin }: ReportDetailViewProps) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const y = useMotionValue(0);
  const opacity = useTransform(y, [0, 100], [1, 0.5]);
  const constraintsRef = useRef(null);

  const photos = (report.photo_urls && report.photo_urls.length > 0)
    ? report.photo_urls
    : (report.photo_url ? [report.photo_url] : []);

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on('select', () => setSelectedIndex(emblaApi.selectedScrollSnap()));
  }, [emblaApi]);

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.y > 100) onClose();
  };

  const handleShare = async () => {
    const url = `${window.location.origin}${window.location.pathname}?report=${report.id}`;
    try {
      await navigator.clipboard.writeText(url);
      alert('Link berhasil disalin!');
    } catch {
      alert('Gagal menyalin link');
    }
  };

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[1400] lg:bg-black/10"
        onClick={onClose}
      />

      {/* Side Drawer (Desktop) / Bottom Sheet (Mobile) */}
      <motion.div
        ref={constraintsRef}
        initial={{ x: '100%', y: 0 }}
        animate={{ x: 0, y: 0 }}
        exit={{ x: '100%', y: 0 }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.5 }}
        onDragEnd={handleDragEnd}
        style={{ y, opacity }}
        className={cn(
          'fixed z-[1401] bg-white/95 dark:bg-slate-900/95 shadow-2xl backdrop-blur-md',
          'lg:top-0 lg:right-0 lg:h-full lg:w-[400px] lg:drag-none',
          'max-lg:bottom-0 max-lg:left-0 max-lg:right-0 max-lg:rounded-t-2xl max-lg:max-h-[90vh]'
        )}
      >
        {/* Mobile Drag Handle */}
        <div className="lg:hidden flex justify-center py-2 cursor-grab active:cursor-grabbing touch-none">
          <div className="w-12 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
        </div>

        {/* Scrollable Content */}
        <div className="h-full overflow-y-auto pb-20 lg:pb-24">
          {/* Header */}
          <div className="sticky top-0 z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold leading-tight mb-2">{report.title || 'Tanpa Judul'}</h2>
                <div className="flex flex-wrap gap-1.5">
                  <Badge className={cn('text-xs', statusColors[report.status as keyof typeof statusColors] || 'bg-gray-500')}>
                    {statusLabels[report.status] || report.status}
                  </Badge>
                  <Badge variant="outline" className="text-xs">{categoryLabels[report.category] || report.category}</Badge>
                  {report.severity && (
                    <Badge className={cn('text-xs', severityColors[report.severity])}>
                      {severityLabels[report.severity] || report.severity}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={handleShare} className="h-8 w-8">
                  <Share2 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Image Carousel with Embla */}
          {photos.length > 0 && (
            <div className="relative bg-gray-100 dark:bg-gray-800">
              <div className="overflow-hidden" ref={emblaRef}>
                <div className="flex">
                  {photos.map((photo, i) => (
                    <div key={i} className="flex-[0_0_100%] min-w-0">
                      <div className="aspect-video relative">
                        <img
                          src={photo}
                          alt={`${report.title} ${i + 1}`}
                          className="w-full h-full object-cover cursor-zoom-in"
                          onClick={() => {
                            setLightboxIndex(i);
                            setLightboxOpen(true);
                          }}
                        />
                        <button
                          onClick={() => {
                            setLightboxIndex(i);
                            setLightboxOpen(true);
                          }}
                          className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2"
                        >
                          <ZoomIn className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {photos.length > 1 && (
                <>
                  <button
                    onClick={() => emblaApi?.scrollPrev()}
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => emblaApi?.scrollNext()}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {photos.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => emblaApi?.scrollTo(i)}
                        className={cn(
                          'h-1.5 rounded-full transition-all',
                          i === selectedIndex ? 'w-6 bg-white' : 'w-1.5 bg-white/60'
                        )}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Content */}
          <div className="px-4 py-4 space-y-3">
            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-2 text-sm">
              {report.location_name && (
                <div className="col-span-2 flex items-start gap-2 p-2.5 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                  <span className="text-base">📍</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide">Lokasi</div>
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100 break-words leading-tight">
                      {report.location_name}
                    </div>
                  </div>
                </div>
              )}
              
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                <span className="text-base">📅</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide">Tanggal</div>
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100 leading-tight">
                    {format(new Date(report.created_at), 'dd MMM yyyy')}
                  </div>
                  <div className="text-xs text-gray-500">{format(new Date(report.created_at), 'HH:mm')}</div>
                </div>
              </div>

              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                <span className="text-base">📂</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide">Kategori</div>
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100 leading-tight">
                    {categoryLabels[report.category] || report.category}
                  </div>
                </div>
              </div>

              {report.severity && (
                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                  <span className="text-base">⚠️</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide">Tingkat</div>
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100 leading-tight">
                      {severityLabels[report.severity] || report.severity}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                <span className="text-base">🔄</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide">Status</div>
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100 leading-tight">
                    {statusLabels[report.status] || report.status}
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <div className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Deskripsi</div>
              <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                {report.description || <span className="italic text-gray-400">Tidak ada deskripsi.</span>}
              </div>
            </div>

            {/* Response */}
            {report.resolution && (
              <div className="space-y-1.5">
                <div className="text-[10px] font-semibold text-green-600 dark:text-green-400 uppercase tracking-wide">✓ Respon Admin</div>
                <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border-l-4 border-green-500">
                  {report.resolution}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sticky Footer Actions */}
        <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t p-4 space-y-2">
          <Button onClick={onNavigate} className="w-full" size="lg">
            <Navigation className="mr-2 h-4 w-4" />
            Navigasi ke Lokasi
          </Button>
          {isAdmin && (
            <Button variant="outline" className="w-full">
              Update Status
            </Button>
          )}
        </div>
      </motion.div>

      {/* Lightbox */}
      <Lightbox
        open={lightboxOpen}
        close={() => setLightboxOpen(false)}
        index={lightboxIndex}
        slides={photos.map((src) => ({ src }))}
      />
    </>
  );
};
