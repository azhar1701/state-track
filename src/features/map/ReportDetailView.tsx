import { useState, useEffect, useRef } from 'react';
import { getOptimizedImageUrl } from '@/lib/formatters';
import {
  X,
  Share2,
  Navigation,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  MapPin,
  Calendar,
  AlertCircle,
  CheckCircle2,
  User,
  Phone,
  FileText,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { StatusBadge, SeverityBadge } from '@/components/common/ReportBadges';
import { format } from 'date-fns';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import Lightbox from 'yet-another-react-lightbox';
import 'yet-another-react-lightbox/styles.css';
import useEmblaCarousel from 'embla-carousel-react';

import type { Report } from '@/services/types';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import { AdminReportMiniMap as ReportMiniMap } from '@/features/admin/AdminReportMiniMap';

interface ReportDetailViewProps {
  report: Report;
  onClose: () => void;
  onNavigate?: () => void;
  onRoute?: () => void;
  isAdmin?: boolean;
  mode?: 'drawer' | 'modal';
  showMiniMap?: boolean;
}

const categoryLabels: Record<string, string> = {
  irigasi: 'Irigasi',
  sungai: 'Sungai',
  jalan: 'Jalan',
  jembatan: 'Jembatan',
  drainase: 'Drainase',
  lainnya: 'Lainnya',
};

const InfoCard = ({
  icon: Icon,
  label,
  value,
  color = 'blue',
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  color?: 'blue' | 'purple' | 'amber' | 'emerald' | 'red';
}) => {
  const colorMap = {
    blue: 'bg-blue-50 dark:bg-primary/10 border-primary/30 dark:border-primary/30',
    purple: 'bg-purple-50 dark:bg-purple-500/10 border-purple-200/50 dark:border-purple-500/30',
    amber: 'bg-amber-50 dark:bg-amber-500/10 border-amber-200/50 dark:border-amber-500/30',
    emerald: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200/50 dark:border-emerald-500/30',
    red: 'bg-red-50 dark:bg-red-500/10 border-red-200/50 dark:border-red-500/30',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex items-start gap-3 p-3.5 rounded-lg border ${colorMap[color]}`}
    >
      <div className="flex-shrink-0 mt-0.5 text-lg opacity-70">{Icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground dark:text-muted-foreground">
          {label}
        </div>
        <div className="text-sm font-medium text-foreground dark:text-foreground mt-0.5 break-words leading-snug">
          {value}
        </div>
      </div>
    </motion.div>
  );
};

export const ReportDetailView = ({
  report,
  onClose,
  onNavigate,
  onRoute,
  isAdmin,
  mode = 'drawer',
  showMiniMap,
}: ReportDetailViewProps) => {
  const isMobileOrTablet = useIsMobile(1024);
  const isModal = mode === 'modal';
  const shouldShowMiniMap = showMiniMap !== undefined ? showMiniMap : isModal;

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const y = useMotionValue(0);
  const opacity = useTransform(y, [0, 100], [1, 0.5]);
  const constraintsRef = useRef(null);

  // Photos classification
  const isEvidenceUrl = (url: string) =>
    url.includes('evidence') || url.includes('penanganan') || url.includes('bukti');

  const allStoredPhotos: string[] =
    report.photo_urls && report.photo_urls.length > 0
      ? report.photo_urls
      : report.photo_url
        ? [report.photo_url]
        : [];

  const reporterPhotos: string[] = [
    ...(report.photo_url && !isEvidenceUrl(report.photo_url) ? [report.photo_url] : []),
    ...(report.photo_urls ?? []).filter((u) => !isEvidenceUrl(u) && u !== report.photo_url),
  ];
  const evidencePhotos: string[] = allStoredPhotos.filter(isEvidenceUrl);
  const allLightboxPhotos = [...reporterPhotos, ...evidencePhotos];

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
      toast.success('Tautan laporan berhasil disalin ke clipboard');
    } catch {
      toast.error('Gagal menyalin tautan laporan');
    }
  };

  // Keyboard shortcut: Escape to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !lightboxOpen) {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lightboxOpen, onClose]);

  // Shared Carousel Element
  const renderPhotoCarousel = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.15 }}
      className="relative bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-xl overflow-hidden border border-border/70"
    >
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex">
          {reporterPhotos.map((photo, i) => (
            <div key={i} className="flex-[0_0_100%] min-w-0">
              <div className="aspect-video relative group bg-muted dark:bg-muted">
                <img
                  src={getOptimizedImageUrl(photo, 800, 80)}
                  alt={`${report.title} ${i + 1}`}
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <motion.button
                  onClick={() => {
                    setLightboxIndex(i);
                    setLightboxOpen(true);
                  }}
                  className="absolute top-3 right-3 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Perbesar foto"
                >
                  <ZoomIn className="h-5 w-5" />
                </motion.button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {reporterPhotos.length > 1 && (
        <>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => emblaApi?.scrollPrev()}
            className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-all"
            aria-label="Foto sebelumnya"
          >
            <ChevronLeft className="h-5 w-5" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => emblaApi?.scrollNext()}
            className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-all"
            aria-label="Foto selanjutnya"
          >
            <ChevronRight className="h-5 w-5" />
          </motion.button>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2"
          >
            {reporterPhotos.map((_, i) => (
              <motion.button
                key={i}
                onClick={() => emblaApi?.scrollTo(i)}
                className={cn(
                  'h-2 rounded-full transition-all ',
                  i === selectedIndex
                    ? 'w-6 bg-white shadow-lg'
                    : 'w-2 bg-white/50 hover:bg-white/70'
                )}
                whileHover={{ scale: 1.1 }}
                aria-label={`Lihat foto ${i + 1}`}
              />
            ))}
          </motion.div>
        </>
      )}
    </motion.div>
  );

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-[1400] backdrop-blur-xs"
        onClick={onClose}
      />

      {/* ── MODE 1: DESKTOP FLOATING MODAL (When mode === 'modal' on Desktop) ── */}
      {isModal && !isMobileOrTablet ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.96, x: '-50%', y: '-48%' }}
          animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
          exit={{ opacity: 0, scale: 0.96, x: '-50%', y: '-48%' }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="fixed z-[1401] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-5xl h-[88vh] bg-card/95 backdrop-blur-2xl border border-border/80 shadow-2xl rounded-2xl flex flex-col glass-overlay overflow-hidden"
        >
          {/* Top Header Bar */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border/80 bg-background/90 backdrop-blur-md shrink-0">
            <div className="flex-1 min-w-0 pr-4">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <StatusBadge status={report.status} />
                <SeverityBadge severity={report.severity} />
                <Badge
                  variant="secondary"
                  className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5"
                >
                  {categoryLabels[report.category] || report.category}
                </Badge>
              </div>
              <h2 className="text-xl font-bold leading-tight text-foreground truncate">
                {report.title || 'Tanpa Judul Laporan'}
              </h2>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleShare}
                className="h-8.5 w-8.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-foreground"
                title="Salin tautan laporan"
              >
                <Share2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8.5 w-8.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
                title="Tutup dialog (Esc)"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* 2-Column Split Body */}
          <div className="flex-1 min-h-0 grid grid-cols-12 overflow-hidden">
            {/* Left Pane (7 cols): Visual Media & GIS Map */}
            <div className="col-span-7 overflow-y-auto p-6 space-y-5 border-r border-border/60">
              {/* 1. Administrative Location Cards */}
              {(report.kecamatan || report.desa) && (
                <div className="grid grid-cols-2 gap-2.5">
                  {report.kecamatan && (
                    <InfoCard
                      icon={<MapPin className="w-4 h-4" />}
                      label="Kecamatan"
                      value={report.kecamatan}
                      color="blue"
                    />
                  )}
                  {report.desa && (
                    <InfoCard
                      icon={<MapPin className="w-4 h-4" />}
                      label="Desa/Kelurahan"
                      value={report.desa}
                      color="purple"
                    />
                  )}
                </div>
              )}

              {/* 2. Photo Carousel */}
              {reporterPhotos.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-primary" />
                      Dokumentasi Foto Laporan
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {reporterPhotos.length} foto terlampir
                    </span>
                  </div>
                  {renderPhotoCarousel()}
                </div>
              )}

              {/* 3. Interactive GIS Mini Map */}
              {shouldShowMiniMap && report.latitude != null && report.longitude != null && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <div className="w-1.5 h-3.5 rounded-full bg-blue-500" />
                      Peta Lokasi Geografis (GIS)
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground bg-muted/60 px-2 py-0.5 rounded border border-border/50">
                      {Number(report.latitude).toFixed(5)}, {Number(report.longitude).toFixed(5)}
                    </span>
                  </div>

                  <ReportMiniMap
                    reportId={report.id}
                    latitude={report.latitude}
                    longitude={report.longitude}
                    title={report.title}
                    category={report.category}
                    severity={report.severity}
                    locationName={report.location_name}
                  />
                </div>
              )}
            </div>

            {/* Right Pane (5 cols): Metadata, Resolution & Action Station */}
            <div className="col-span-5 flex flex-col justify-between overflow-hidden bg-muted/15">
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {/* Location & Time Info */}
                <div className="space-y-2.5">
                  {report.location_name && (
                    <InfoCard icon="📍" label="Alamat / Lokasi" value={report.location_name} color="blue" />
                  )}
                  <InfoCard
                    icon={<Calendar className="w-4 h-4" />}
                    label="Waktu Laporan Dibuat"
                    value={format(new Date(report.created_at), 'dd MMMM yyyy HH:mm')}
                    color="purple"
                  />
                  {report.severity && (
                    <InfoCard
                      icon={<AlertCircle className="w-4 h-4" />}
                      label="Tingkat Keparahan"
                      value={<SeverityBadge severity={report.severity} />}
                      color={
                        report.severity === 'ringan'
                          ? 'emerald'
                          : report.severity === 'sedang'
                            ? 'amber'
                            : 'red'
                      }
                    />
                  )}
                </div>

                {/* Reporter Information */}
                {(report.reporter_name || report.phone) && (
                  <div className="space-y-2 pt-2 border-t border-border/50">
                    <div className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-emerald-500" />
                      Identitas Pelapor
                    </div>
                    <div className="space-y-2">
                      {report.reporter_name && (
                        <InfoCard
                          icon={<User className="w-4 h-4" />}
                          label="Nama Pelapor"
                          value={report.reporter_name}
                          color="emerald"
                        />
                      )}
                      {report.phone && (
                        <InfoCard
                          icon={<Phone className="w-4 h-4" />}
                          label="Kontak Pelapor"
                          value={
                            <a
                              href={`tel:${report.phone}`}
                              className="text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
                            >
                              {report.phone}
                            </a>
                          }
                          color="emerald"
                        />
                      )}
                    </div>
                  </div>
                )}

                {/* Report Description */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-primary" />
                    Deskripsi Keluhan
                  </label>
                  <div className="text-xs sm:text-sm text-foreground leading-relaxed whitespace-pre-wrap p-3.5 rounded-xl bg-card border border-border/70 shadow-2xs">
                    {report.description || (
                      <span className="italic text-muted-foreground">Tidak ada rincian deskripsi.</span>
                    )}
                  </div>
                </div>

                {/* Admin Resolution / Response */}
                {report.resolution && (
                  <div className="space-y-1.5">
                    <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      Tindak Lanjut & Respon Resmi Petugas
                    </div>
                    <div className="text-xs sm:text-sm text-foreground leading-relaxed whitespace-pre-wrap p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                      {report.resolution}
                    </div>
                  </div>
                )}

                {/* Evidence Photos */}
                {evidencePhotos.length > 0 && (
                  <div className="space-y-2.5 pt-2 border-t border-border/50">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4" />
                        Bukti Dukung Penanganan Lapangan
                      </div>
                      <Badge
                        variant="outline"
                        className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                      >
                        {evidencePhotos.length} Foto
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {evidencePhotos.map((src, i) => (
                        <button
                          type="button"
                          key={i}
                          onClick={() => {
                            setLightboxIndex(reporterPhotos.length + i);
                            setLightboxOpen(true);
                          }}
                          className="relative aspect-square rounded-xl overflow-hidden border-2 border-emerald-500/30 bg-muted group hover:scale-[1.03] transition-all cursor-zoom-in"
                        >
                          <img
                            src={getOptimizedImageUrl(src, 300, 75)}
                            alt={`Bukti penanganan ${i + 1}`}
                            loading="lazy"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                            <ZoomIn className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Actions inside Modal */}
              <div className="p-4 border-t border-border/80 bg-background/90 backdrop-blur-md grid grid-cols-2 gap-2.5 shrink-0">
                <Button
                  onClick={onRoute}
                  variant="outline"
                  className="h-10 text-xs font-medium rounded-xl border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 shadow-xs"
                >
                  <MapPin className="mr-1.5 h-3.5 w-3.5" />
                  Cari Rute Terbaik
                </Button>
                <Button
                  onClick={onNavigate}
                  className="h-10 text-xs font-medium rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-xs"
                >
                  <Navigation className="mr-1.5 h-3.5 w-3.5" />
                  Google Maps
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      ) : (
        /* ── MODE 2: SIDE DRAWER / MOBILE BOTTOM SHEET ── */
        <motion.div
          ref={constraintsRef}
          initial={isMobileOrTablet ? { y: '100%', x: 0 } : { x: '100%', y: 0 }}
          animate={{ x: 0, y: 0 }}
          exit={isMobileOrTablet ? { y: '100%', x: 0 } : { x: '100%', y: 0 }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          style={{ opacity: isMobileOrTablet ? opacity : 1 }}
          className={cn(
            'fixed z-[1401] bg-popover/95 backdrop-blur-xl border-border shadow-2xl flex flex-col glass-overlay',
            'lg:top-0 lg:right-0 lg:h-full lg:w-[420px] lg:border-l lg:rounded-none',
            'max-lg:bottom-0 max-lg:left-0 max-lg:right-0 max-lg:rounded-t-[2.5rem] max-lg:h-[90dvh]'
          )}
        >
          {/* Mobile Drag Handle */}
          {isMobileOrTablet && (
            <motion.div
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.5 }}
              onDragEnd={handleDragEnd}
              className="lg:hidden flex justify-center py-3 cursor-grab active:cursor-grabbing touch-none shrink-0"
              whileHover={{ opacity: 0.7 }}
            >
              <div className="w-12 h-1.5 bg-muted-foreground/30 dark:bg-muted-foreground/40 rounded-full" />
            </motion.div>
          )}

          {/* Scrollable Content Container */}
          <div className="flex-1 overflow-y-auto overscroll-y-contain pb-32 lg:pb-28">
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="sticky top-0 z-10 bg-popover/95 backdrop-blur-md border-b border-border px-5 py-4"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-bold leading-tight text-foreground dark:text-white line-clamp-2">
                    {report.title || 'Tanpa Judul'}
                  </h2>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleShare}
                    className="h-8 w-8 hover:bg-primary/20 dark:hover:bg-primary/10"
                    title="Salin tautan laporan"
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className="h-8 w-8 hover:bg-muted/50 dark:hover:bg-muted/50"
                    title="Tutup (Esc)"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={report.status} />
                <SeverityBadge severity={report.severity} />
                <Badge
                  variant="secondary"
                  className="text-[10px] font-bold uppercase tracking-wider px-3 py-1 bg-white/10 dark:bg-white/5 border-white/20 dark:border-white/10"
                >
                  {categoryLabels[report.category] || report.category}
                </Badge>
              </div>
            </motion.div>

            {/* Citizen Photo Carousel */}
            {reporterPhotos.length > 0 && (
              <div className="p-5 pb-0">
                {renderPhotoCarousel()}
              </div>
            )}

            {/* Content Details */}
            <div className="px-5 py-6 space-y-5">
              {/* Info Grid */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="space-y-3"
              >
                {report.location_name && (
                  <InfoCard icon="📍" label="Lokasi" value={report.location_name} color="blue" />
                )}

                <InfoCard
                  icon={<Calendar className="w-4 h-4" />}
                  label="Tanggal Dibuat"
                  value={format(new Date(report.created_at), 'dd MMM yyyy HH:mm')}
                  color="purple"
                />

                {report.severity && (
                  <InfoCard
                    icon={<AlertCircle className="w-4 h-4" />}
                    label="Tingkat Keparahan"
                    value={<SeverityBadge severity={report.severity} />}
                    color={
                      report.severity === 'ringan'
                        ? 'emerald'
                        : report.severity === 'sedang'
                          ? 'amber'
                          : 'red'
                    }
                  />
                )}
              </motion.div>

              {/* Reporter Information */}
              {(report.reporter_name || report.phone) && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.23 }}
                  className="space-y-2.5 pt-2 border-t border-border/50 dark:border-border/50"
                >
                  <div className="text-sm font-semibold text-muted-foreground dark:text-muted-foreground flex items-center gap-2">
                    <div className="w-1 h-4 rounded-full bg-gradient-to-b from-emerald-500 to-emerald-600" />
                    Informasi Pelapor
                  </div>

                  <div className="space-y-2">
                    {report.reporter_name && (
                      <InfoCard
                        icon={<User className="w-4 h-4" />}
                        label="Nama Pelapor"
                        value={report.reporter_name}
                        color="emerald"
                      />
                    )}

                    {report.phone && (
                      <InfoCard
                        icon={<Phone className="w-4 h-4" />}
                        label="Kontak"
                        value={
                          <a
                            href={`tel:${report.phone}`}
                            className="text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
                          >
                            {report.phone}
                          </a>
                        }
                        color="emerald"
                      />
                    )}
                  </div>
                </motion.div>
              )}

              {/* Administrative Location */}
              {(report.kecamatan || report.desa) && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.26 }}
                  className="space-y-2.5"
                >
                  <div className="text-sm font-semibold text-muted-foreground dark:text-muted-foreground flex items-center gap-2">
                    <div className="w-1 h-4 rounded-full bg-gradient-to-b from-blue-500 to-blue-600" />
                    Identifikasi Lokasi
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    {report.kecamatan && (
                      <InfoCard
                        icon={<MapPin className="w-4 h-4" />}
                        label="Kecamatan"
                        value={report.kecamatan}
                        color="blue"
                      />
                    )}
                    {report.desa && (
                      <InfoCard
                        icon={<MapPin className="w-4 h-4" />}
                        label="Desa/Kelurahan"
                        value={report.desa}
                        color="purple"
                      />
                    )}
                  </div>
                </motion.div>
              )}

              {/* Interactive GIS Mini Map (context-aware: displayed only when enabled) */}
              {shouldShowMiniMap && report.latitude != null && report.longitude != null && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.28 }}
                  className="space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-muted-foreground dark:text-muted-foreground flex items-center gap-2">
                      <div className="w-1 h-4 rounded-full bg-gradient-to-b from-blue-500 to-indigo-600" />
                      Peta Lokasi Geografis (GIS)
                    </div>
                    <span className="text-[11px] font-mono text-muted-foreground bg-muted/60 px-2 py-0.5 rounded border border-border/50">
                      {Number(report.latitude).toFixed(5)}, {Number(report.longitude).toFixed(5)}
                    </span>
                  </div>

                  <ReportMiniMap
                    reportId={report.id}
                    latitude={report.latitude}
                    longitude={report.longitude}
                    title={report.title}
                    category={report.category}
                    severity={report.severity}
                    locationName={report.location_name}
                  />
                </motion.div>
              )}

              {/* Description */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="space-y-2"
              >
                <label className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Deskripsi Laporan
                </label>
                <div className="text-sm text-foreground dark:text-muted-foreground leading-relaxed whitespace-pre-wrap p-4 rounded-lg bg-muted/50 dark:bg-muted/30 border border-border/50 dark:border-border/30">
                  {report.description || (
                    <span className="italic text-muted-foreground">Tidak ada deskripsi.</span>
                  )}
                </div>
              </motion.div>

              {/* Resolution/Response */}
              {report.resolution && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.33 }}
                  className="space-y-2"
                >
                  <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Respon Admin
                  </div>
                  <div className="text-sm text-foreground dark:text-muted-foreground leading-relaxed whitespace-pre-wrap p-4 rounded-lg bg-emerald-50/50 dark:bg-emerald-500/10 border border-emerald-200/50 dark:border-emerald-500/30">
                    {report.resolution}
                  </div>
                </motion.div>
              )}

              {/* Admin Evidence Photos */}
              {evidencePhotos.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.36 }}
                  className="space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4" />
                      Bukti Foto Penanganan
                    </div>
                    <span className="text-[11px] font-medium bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-200/60 dark:border-emerald-500/30">
                      {evidencePhotos.length} foto
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {evidencePhotos.map((src, i) => (
                      <motion.button
                        key={i}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => {
                          setLightboxIndex(reporterPhotos.length + i);
                          setLightboxOpen(true);
                        }}
                        className="relative aspect-square rounded-xl overflow-hidden border-2 border-emerald-200/60 dark:border-emerald-500/30 bg-muted group cursor-zoom-in"
                      >
                        <img
                          src={getOptimizedImageUrl(src, 300, 75)}
                          alt={`Bukti penanganan ${i + 1}`}
                          loading="lazy"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                          <ZoomIn className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                        </div>
                      </motion.button>
                    ))}
                  </div>
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                    <ShieldCheck className="w-3 h-3 text-emerald-500" />
                    Foto diunggah oleh petugas sebagai bukti penanganan laporan
                  </p>
                </motion.div>
              )}
            </div>
          </div>

          {/* Sticky Footer Actions */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.36 }}
            className="absolute bottom-0 left-0 right-0 bg-card border-t border-border px-5 py-4 space-y-3 z-20"
          >
            <div className="grid grid-cols-2 gap-3">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  onClick={onRoute}
                  variant="outline"
                  className="w-full h-11 text-sm font-medium bg-card border-blue-500/20 text-blue-600 dark:text-blue-400 shadow-sm hover:shadow-md transition-all rounded-2xl"
                >
                  <MapPin className="mr-2 h-4 w-4" />
                  Cari Rute Terbaik
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  onClick={onNavigate}
                  className="w-full h-11 text-sm font-medium bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-md hover:shadow-lg transition-all"
                >
                  <Navigation className="mr-2 h-4 w-4" />
                  Google Maps
                </Button>
              </motion.div>
            </div>
            {isAdmin && (
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  variant="secondary"
                  className="w-full h-10 text-sm font-medium bg-card border border-border shadow-sm"
                >
                  Update Status Laporan
                </Button>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}

      {/* Lightbox — covers both reporter photos and evidence */}
      <Lightbox
        open={lightboxOpen}
        close={() => setLightboxOpen(false)}
        index={lightboxIndex}
        slides={allLightboxPhotos.map((src) => ({ src }))}
      />
    </>
  );
};
