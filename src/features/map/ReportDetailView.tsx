import { useState, useEffect, useRef } from 'react';
import { getOptimizedImageUrl } from '@/lib/formatters';
import { X, Share2, Navigation, ChevronLeft, ChevronRight, ZoomIn, MapPin, Calendar, AlertCircle, CheckCircle2, User, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { StatusBadge, SeverityBadge } from '@/components/common/ReportBadges';
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
 // Reporter information
 reporter_name?: string | null;
 phone?: string | null;
 // Administrative location
 kecamatan?: string | null;
 desa?: string | null;
}

interface ReportDetailViewProps {
 report: Report;
 onClose: () => void;
 onNavigate?: () => void;
 onRoute?: () => void;
 isAdmin?: boolean;
}

interface ReportDetailViewProps {
 report: Report;
 onClose: () => void;
 onNavigate?: () => void;
 onRoute?: () => void;
 isAdmin?: boolean;
}

const categoryLabels: Record<string, string> = {
 irigasi: 'Irigasi',
 sungai: 'Sungai',
 jalan: 'Jalan',
 jembatan: 'Jembatan',
 drainase: 'Drainase',
 lainnya: 'Lainnya',
};

const InfoCard = ({ icon: Icon, label, value, color = 'blue' }: {
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

export const ReportDetailView = ({ report, onClose, onNavigate, onRoute, isAdmin }: ReportDetailViewProps) => {
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

  // Removed legacy conf logic

 return (
 <>
 {/* Backdrop */}
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 className="fixed inset-0 bg-black/20 z-[1400] lg:bg-black/10"
 onClick={onClose}
 />

 {/* Side Drawer (Desktop) / Bottom Sheet (Mobile) */}
 <motion.div
 ref={constraintsRef}
 initial={{ x: '100%', y: 0 }}
 animate={{ x: 0, y: 0 }}
 exit={{ x: '100%', y: 0 }}
 transition={{ type: 'spring', damping: 30, stiffness: 300 }}
 style={{ opacity }}
 className={cn(
 'fixed z-[1401] bg-popover/90 backdrop-blur-xl border-border shadow-2xl flex flex-col glass-floating',
 'lg:top-0 lg:right-0 lg:h-full lg:w-[420px] lg:border-l lg:rounded-none',
 'max-lg:bottom-0 max-lg:left-0 max-lg:right-0 max-lg:rounded-t-[2.5rem] max-lg:h-[90vh]'
 )}
 >
 {/* Mobile Drag Handle */}
 <motion.div
 drag="y"
 dragConstraints={{ top: 0, bottom: 0 }}
 dragElastic={{ top: 0, bottom: 0.5 }}
 onDragEnd={handleDragEnd}
 className="lg:hidden flex justify-center py-3 cursor-grab active:cursor-grabbing touch-none"
 whileHover={{ opacity: 0.7 }}
 >
 <div className="w-12 h-1.5 bg-muted-foreground/30 dark:bg-muted-foreground/40 rounded-full" />
 </motion.div>

 {/* Scrollable Content */}
 <div className="flex-1 overflow-y-auto overscroll-y-contain pb-32 lg:pb-28">
 {/* Header */}
 <motion.div
 initial={{ opacity: 0, y: -10 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: 0.1 }}
 className="sticky top-0 z-10 bg-popover/95 border-border shadow-lg border-b border-border px-5 py-4"
 >
 <div className="flex items-start justify-between gap-3 mb-3">
 <div className="flex-1 min-w-0">
 <h2 className="text-xl font-bold leading-tight text-foreground dark:text-white line-clamp-2">
 {report.title || 'Tanpa Judul'}
 </h2>
 </div>
 <div className="flex gap-1 flex-shrink-0">
 <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
 <Button
 variant="ghost"
 size="icon"
 onClick={handleShare}
 className="h-8 w-8 hover:bg-primary/20 dark:hover:bg-primary/10"
 >
 <Share2 className="h-4 w-4" />
 </Button>
 </motion.div>
 <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
 <Button
 variant="ghost"
 size="icon"
 onClick={onClose}
 className="h-8 w-8 hover:bg-muted/50 dark:hover:bg-muted/50"
 >
 <X className="h-4 w-4" />
 </Button>
 </motion.div>
 </div>
 </div>

 {/* Badges */}
 <div className="flex flex-wrap items-center gap-2">
 <StatusBadge status={report.status} />
 <SeverityBadge severity={report.severity} />
 <Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-wider px-3 py-1 bg-white/10 dark:bg-white/5 border-white/20 dark:border-white/10">
 {categoryLabels[report.category] || report.category}
 </Badge>
 </div>
 </motion.div>

 {/* Image Carousel with Embla */}
 {photos.length > 0 && (
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 transition={{ delay: 0.15 }}
 className="relative bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900"
 >
 <div className="overflow-hidden" ref={emblaRef}>
 <div className="flex">
 {photos.map((photo, i) => (
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
 whileHover={{ scale: 1.1 }}
 whileTap={{ scale: 0.95 }}
 onClick={() => {
 setLightboxIndex(i);
 setLightboxOpen(true);
 }}
 className="absolute top-3 right-3 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity"
 >
 <ZoomIn className="h-5 w-5" />
 </motion.button>
 </div>
 </div>
 ))}
 </div>
 </div>

 {photos.length > 1 && (
 <>
 <motion.button
 whileHover={{ scale: 1.1 }}
 whileTap={{ scale: 0.95 }}
 onClick={() => emblaApi?.scrollPrev()}
 className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-all"
 >
 <ChevronLeft className="h-5 w-5" />
 </motion.button>
 <motion.button
 whileHover={{ scale: 1.1 }}
 whileTap={{ scale: 0.95 }}
 onClick={() => emblaApi?.scrollNext()}
 className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-all"
 >
 <ChevronRight className="h-5 w-5" />
 </motion.button>
 <motion.div
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: 0.3 }}
 className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2"
 >
 {photos.map((_, i) => (
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
 />
 ))}
 </motion.div>
 </>
 )}
 </motion.div>
 )}

 {/* Content */}
 <div className="px-5 py-6 space-y-5">
 {/* Info Grid */}
 <motion.div
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: 0.2 }}
 className="space-y-3"
 >
 {report.location_name && (
 <InfoCard
 icon="📍"
 label="Lokasi"
 value={report.location_name}
 color="blue"
 />
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
  color={report.severity === 'ringan' ? 'emerald' : report.severity === 'sedang' ? 'amber' : 'red'}
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

 {/* Description */}
 <motion.div
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: 0.29 }}
 className="space-y-2"
 >
 <div className="text-sm font-semibold text-muted-foreground dark:text-gray-300 flex items-center gap-2">
 <div className="w-1 h-4 rounded-full bg-gradient-to-b from-blue-500 to-blue-600" />
 Deskripsi Laporan
 </div>
 <div className="text-sm text-foreground dark:text-muted-foreground leading-relaxed whitespace-pre-wrap p-4 rounded-lg bg-muted/50 dark:bg-muted/30 border border-border/50 dark:border-border/30">
 {report.description || <span className="italic text-muted-foreground">Tidak ada deskripsi.</span>}
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
 </div>
 </div>

 {/* Sticky Footer Actions */}
 <motion.div
 initial={{ y: 20, opacity: 0 }}
 animate={{ y: 0, opacity: 1 }}
 transition={{ delay: 0.36 }}
 className="absolute bottom-0 left-0 right-0 bg-card border-border shadow-sm border-t border-border px-5 py-4 space-y-3"
 >
 <div className="grid grid-cols-2 gap-3">
 <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
 <Button
 onClick={onRoute}
 variant="outline"
 className="w-full h-11 text-sm font-medium bg-popover/95 border-border shadow-lg border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 transition-all"
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
 className="w-full h-10 text-sm font-medium bg-card border-border shadow-sm"
 >
 Update Status Laporan
 </Button>
 </motion.div>
 )}
 </motion.div>
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
