/**
 * Route Optimization Sidebar Component
 * Liquid Glass full-height sidebar for smart inspection route planning,
 * OSRM real-road routing & Google Maps navigation integration
 */

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import {
  Route,
  Navigation,
  Clock,
  MapPin,
  X,
  Zap,
  ExternalLink,
  Copy,
  Check,
  Search,
  RotateCcw,
  AlertTriangle,
  LocateFixed,
  Eye,
  Trash2,
  Car,
  Layers,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  calculateOptimizedRoute,
  generateDirections,
  generateGoogleMapsRouteUrl,
  type RoutePoint,
  type OptimizedRoute,
} from '@/features/map/routeOptimization';

interface RouteOptimizationPanelProps {
  reports: Array<{
    id: string;
    title: string;
    coords: [number, number];
    category: string;
    status: string;
    severity?: 'ringan' | 'sedang' | 'berat';
    locationName?: string;
  }>;
  userLocation?: [number, number] | null;
  onRouteGenerated?: (route: OptimizedRoute) => void;
  onClearRoute?: () => void;
  onFocusPoint?: (coords: [number, number]) => void;
  onClose: () => void;
}

export function RouteOptimizationPanel({
  reports,
  userLocation,
  onRouteGenerated,
  onClearRoute,
  onFocusPoint,
  onClose,
}: RouteOptimizationPanelProps) {
  const [activeTab, setActiveTab] = useState<'plan' | 'results'>('plan');
  const [selectedReports, setSelectedReports] = useState<Set<string>>(() => {
    // Select first 5 reports by default
    const initial = new Set<string>();
    reports.slice(0, 5).forEach((r) => initial.add(r.id));
    return initial;
  });

  const [optimizedRoute, setOptimizedRoute] = useState<OptimizedRoute | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Settings
  const [startFromGps, setStartFromGps] = useState<boolean>(!!userLocation);
  const [use2Opt, setUse2Opt] = useState(true);
  const [prioritizeSeverity, setPrioritizeSeverity] = useState(true);
  const [roundTrip, setRoundTrip] = useState(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');

  // Categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    reports.forEach((r) => {
      if (r.category) set.add(r.category);
    });
    return Array.from(set);
  }, [reports]);

  // Filtered reports
  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      const matchSearch =
        searchQuery.trim() === '' ||
        r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.locationName && r.locationName.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchCategory =
        selectedCategoryFilter === 'all' || r.category.toLowerCase() === selectedCategoryFilter.toLowerCase();

      return matchSearch && matchCategory;
    });
  }, [reports, searchQuery, selectedCategoryFilter]);

  const toggleReport = (id: string) => {
    setSelectedReports((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAllFiltered = () => {
    setSelectedReports((prev) => {
      const next = new Set(prev);
      filteredReports.forEach((r) => next.add(r.id));
      return next;
    });
  };

  const selectAllCritical = () => {
    setSelectedReports((prev) => {
      const next = new Set(prev);
      reports
        .filter((r) => r.severity === 'berat')
        .forEach((r) => next.add(r.id));
      return next;
    });
    toast.info('Laporan prioritas tinggi (Berat) dipilih');
  };

  const clearSelection = () => {
    setSelectedReports(new Set());
  };

  const handleOptimize = async () => {
    if (selectedReports.size === 0) {
      toast.error('Pilih setidaknya 1 laporan untuk rute');
      return;
    }

    if (!startFromGps && selectedReports.size < 2) {
      toast.error('Pilih minimal 2 laporan jika tidak memulai dari GPS');
      return;
    }

    setIsLoading(true);

    try {
      const selectedData = reports.filter((r) => selectedReports.has(r.id));
      const routePoints: RoutePoint[] = [];

      // Add GPS start point if requested
      if (startFromGps && userLocation) {
        routePoints.push({
          id: 'user-gps-start',
          title: 'Lokasi Anda (Titik Mulai GPS)',
          coords: userLocation,
          isUserLocation: true,
          priority: 10,
        });
      }

      // Add selected inspection points
      selectedData.forEach((r) => {
        routePoints.push({
          id: r.id,
          title: r.title,
          coords: r.coords,
          category: r.category,
          status: r.status,
          severity: r.severity,
          priority: prioritizeSeverity ? getSeverityPriority(r.severity) : undefined,
        });
      });

      const route = await calculateOptimizedRoute(routePoints, {
        startPoint: startFromGps && userLocation ? userLocation : undefined,
        use2Opt,
        prioritizeSeverity,
        roundTrip,
      });

      setOptimizedRoute(route);
      setActiveTab('results');
      onRouteGenerated?.(route);

      toast.success('Rute navigasi berhasil dihitung!', {
        description: `Jarak: ${route.totalDistance.toFixed(1)} km • Estimasi: ~${route.totalDurationMinutes} menit`,
      });
    } catch (err) {
      toast.error('Gagal menghitung rute', {
        description: err instanceof Error ? err.message : 'Terjadi kesalahan sistem',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearRoute = () => {
    setOptimizedRoute(null);
    onClearRoute?.();
    toast.info('Rute navigasi dibersihkan');
  };

  const handleCopyDirections = async () => {
    if (!optimizedRoute) return;
    const directions = generateDirections(optimizedRoute);
    const summaryHeader = `=== RUTE INSPEKSI SIPASDA ===\nTotal Jarak: ${optimizedRoute.totalDistance.toFixed(
      1
    )} km\nEstimasi Waktu: ~${optimizedRoute.totalDurationMinutes} menit\nJumlah Titik: ${
      optimizedRoute.points.length
    } titik\n\nPetunjuk Arah:\n`;

    const textToCopy = summaryHeader + directions.join('\n');
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      toast.success('Petunjuk rute disalin ke clipboard!');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error('Gagal menyalin petunjuk');
    }
  };

  const handleOpenGoogleMaps = () => {
    if (!optimizedRoute || optimizedRoute.points.length < 2) return;
    const gmapsUrl = generateGoogleMapsRouteUrl(optimizedRoute.points);
    if (gmapsUrl) {
      window.open(gmapsUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <motion.aside
      role="region"
      aria-label="Sidebar Optimasi Rute"
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 28, stiffness: 280 }}
      className={cn(
        'fixed z-[1300] bg-background/95 dark:bg-slate-900/95 backdrop-blur-2xl border-border shadow-2xl flex flex-col',
        // Desktop: docked full-height sidebar on the right
        'sm:top-0 sm:right-0 sm:h-full sm:w-[440px] sm:border-l',
        // Mobile: slide-up bottom sheet
        'max-sm:bottom-0 max-sm:left-0 max-sm:right-0 max-sm:h-[88dvh] max-sm:rounded-t-[2rem] max-sm:border-t'
      )}
    >
      {/* Mobile Drag Indicator */}
      <div className="sm:hidden flex justify-center py-2.5 touch-none shrink-0">
        <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/60 bg-gradient-to-r from-emerald-500/10 via-primary/5 to-transparent shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm shrink-0">
            <Route className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-sm text-foreground tracking-tight flex items-center gap-2 truncate">
              Optimasi Rute Lapangan
              {optimizedRoute && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 shrink-0">
                  Aktif
                </Badge>
              )}
            </h3>
            <p className="text-[11px] text-muted-foreground truncate">Navigasi Multi-Titik & OSRM Real-Road</p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {optimizedRoute && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleClearRoute}
              title="Bersihkan Rute dari Peta"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={onClose}
            title="Tutup Sidebar"
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground rounded-xl"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'plan' | 'results')} className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="px-5 pt-3 pb-2 border-b border-border/40 shrink-0">
          <TabsList className="grid grid-cols-2 w-full h-9 p-0.5 bg-muted/60 rounded-xl">
            <TabsTrigger value="plan" className="text-xs rounded-lg font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm">
              Perencanaan ({selectedReports.size})
            </TabsTrigger>
            <TabsTrigger
              value="results"
              disabled={!optimizedRoute}
              className="text-xs rounded-lg font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm flex items-center justify-center gap-1.5"
            >
              Hasil & Navigasi
              {optimizedRoute && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab 1: Perencanaan */}
        <TabsContent
          value="plan"
          className="flex-1 min-h-0 overflow-hidden m-0 p-0 data-[state=inactive]:hidden data-[state=active]:flex flex-col"
        >
          {/* Scrollable Form & Report List Container */}
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 py-4 space-y-4">
            {/* GPS Preference Card */}
            <div className="p-3 rounded-2xl bg-card border border-border/70 space-y-2 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <LocateFixed className="w-4 h-4 text-primary" />
                  <Label htmlFor="gps-toggle" className="text-xs font-semibold cursor-pointer">
                    Mulai dari Lokasi GPS Saya
                  </Label>
                </div>
                <Switch
                  id="gps-toggle"
                  checked={startFromGps}
                  disabled={!userLocation}
                  onCheckedChange={setStartFromGps}
                />
              </div>
              <p className="text-[11px] text-muted-foreground pl-6">
                {userLocation
                  ? 'Titik awal diatur otomatis dari koordinat GPS Anda saat ini.'
                  : 'Aktifkan GPS pada kontrol peta untuk memulai rute dari posisi Anda.'}
              </p>
            </div>

            {/* Algorithm Settings Grid */}
            <div className="space-y-2">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-1">
                Preferensi Algoritma
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-card/70 border border-border/60">
                  <span className="text-[11px] font-medium leading-tight">Prioritaskan Keparahan</span>
                  <Switch checked={prioritizeSeverity} onCheckedChange={setPrioritizeSeverity} />
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-card/70 border border-border/60">
                  <span className="text-[11px] font-medium leading-tight">Optimasi 2-Opt</span>
                  <Switch checked={use2Opt} onCheckedChange={setUse2Opt} />
                </div>
                <div className="col-span-2 flex items-center justify-between p-2.5 rounded-xl bg-card/70 border border-border/60">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-medium leading-tight">Rute Pulang-Pergi (Round-Trip)</span>
                    <span className="text-[10px] text-muted-foreground">Kembali ke titik awal setelah semua inspeksi</span>
                  </div>
                  <Switch checked={roundTrip} onCheckedChange={setRoundTrip} />
                </div>
              </div>
            </div>

            {/* Search and Filters */}
            <div className="space-y-2.5 pt-1">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-1">
                Pilih Titik Inspeksi
              </span>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Cari lokasi, judul, atau kategori..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8.5 pl-8 text-xs rounded-xl bg-background/80"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Filter Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px]">
                <button
                  type="button"
                  onClick={() => setSelectedCategoryFilter('all')}
                  className={`px-2.5 py-1 rounded-lg border font-medium whitespace-nowrap transition-colors ${
                    selectedCategoryFilter === 'all'
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card text-muted-foreground border-border hover:bg-muted'
                  }`}
                >
                  Semua ({reports.length})
                </button>
                <button
                  type="button"
                  onClick={selectAllCritical}
                  className="px-2.5 py-1 rounded-lg border border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400 font-medium whitespace-nowrap hover:bg-red-500/20 transition-colors flex items-center gap-1"
                >
                  <AlertTriangle className="w-3 h-3" />
                  Pilih Bahaya Berat
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategoryFilter(cat)}
                    className={`px-2 py-1 rounded-lg border capitalize whitespace-nowrap transition-colors ${
                      selectedCategoryFilter.toLowerCase() === cat.toLowerCase()
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-card text-muted-foreground border-border hover:bg-muted'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Selection Summary Actions */}
              <div className="flex items-center justify-between text-xs pt-1">
                <span className="font-semibold text-foreground">
                  Dipilih: {selectedReports.size} dari {reports.length}
                </span>
                <div className="flex items-center gap-1.5">
                  <Button size="sm" variant="outline" onClick={selectAllFiltered} className="h-7 text-[11px] px-2.5 rounded-lg">
                    Pilih Semua
                  </Button>
                  {selectedReports.size > 0 && (
                    <Button size="sm" variant="ghost" onClick={clearSelection} className="h-7 text-[11px] px-2 rounded-lg text-muted-foreground hover:text-foreground">
                      Reset
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* List of Report Cards */}
            <div className="space-y-2 pb-2">
              {filteredReports.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground text-xs rounded-2xl border border-dashed border-border/80 p-4">
                  Tidak ada laporan yang sesuai dengan pencarian atau filter.
                </div>
              ) : (
                filteredReports.map((report) => {
                  const isSelected = selectedReports.has(report.id);
                  const severityStyle = getSeverityBadgeStyle(report.severity);

                  return (
                    <div
                      key={report.id}
                      onClick={() => toggleReport(report.id)}
                      className={`relative group p-3 rounded-2xl border transition-all cursor-pointer select-none ${
                        isSelected
                          ? 'bg-primary/10 border-primary/40 shadow-xs'
                          : 'bg-card/80 border-border/60 hover:bg-muted/60 hover:border-border'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        {/* Checkbox indicator */}
                        <div
                          className={`mt-0.5 w-4 h-4 rounded-md border flex items-center justify-center transition-colors shrink-0 ${
                            isSelected
                              ? 'bg-primary border-primary text-primary-foreground'
                              : 'border-border/80 group-hover:border-foreground/40'
                          }`}
                        >
                          {isSelected && (
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>

                        {/* Title & info */}
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                            {report.title}
                          </div>
                          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 capitalize h-4 bg-muted/80">
                              {report.category}
                            </Badge>

                            {report.severity && (
                              <span
                                className={`text-[10px] px-1.5 py-0 rounded font-medium border capitalize ${severityStyle}`}
                              >
                                {report.severity}
                              </span>
                            )}

                            <span className="text-[10px] text-muted-foreground">
                              {report.status}
                            </span>
                          </div>
                        </div>

                        {/* Map focus action */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onFocusPoint?.(report.coords);
                            toast.info(`Fokus ke: ${report.title}`);
                          }}
                          title="Fokus lokasi di peta"
                          className="opacity-60 group-hover:opacity-100 hover:text-primary p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-all shrink-0"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Sticky Bottom Execution Footer */}
          <div className="p-4 border-t border-border/60 bg-background/95 dark:bg-slate-900/95 shrink-0">
            <Button
              className="w-full h-10.5 font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-2xl shadow-lg shadow-emerald-500/20 transition-all"
              onClick={handleOptimize}
              disabled={isLoading || (startFromGps ? selectedReports.size < 1 : selectedReports.size < 2)}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 mr-2 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Menghitung Jalur via OSRM...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Hitung Rute Optimal ({selectedReports.size} Titik)
                </>
              )}
            </Button>
          </div>
        </TabsContent>

        {/* Tab 2: Hasil & Navigasi */}
        <TabsContent
          value="results"
          className="flex-1 min-h-0 overflow-hidden m-0 p-0 data-[state=inactive]:hidden data-[state=active]:flex flex-col"
        >
          {optimizedRoute ? (
            <>
              {/* Scrollable Results & Waypoints Container */}
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 py-4 space-y-4">
                {/* 3-Stat Metric Cards */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2.5 rounded-2xl bg-card border border-border/70 shadow-xs flex flex-col items-center text-center">
                    <Car className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mb-1" />
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Total Jarak</span>
                    <span className="text-sm font-bold text-foreground mt-0.5">{optimizedRoute.totalDistance.toFixed(1)} km</span>
                  </div>

                  <div className="p-2.5 rounded-2xl bg-card border border-border/70 shadow-xs flex flex-col items-center text-center">
                    <Clock className="w-4 h-4 text-primary mb-1" />
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Estimasi Waktu</span>
                    <span className="text-sm font-bold text-foreground mt-0.5">~{optimizedRoute.totalDurationMinutes} mnt</span>
                  </div>

                  <div className="p-2.5 rounded-2xl bg-card border border-border/70 shadow-xs flex flex-col items-center text-center">
                    <MapPin className="w-4 h-4 text-amber-600 dark:text-amber-400 mb-1" />
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Pemberhentian</span>
                    <span className="text-sm font-bold text-foreground mt-0.5">{optimizedRoute.points.length} Titik</span>
                  </div>
                </div>

                {/* Routing Engine Indicator */}
                <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-card/80 border border-border/60 text-[11px]">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-primary" />
                    Mesin Perutean:
                  </span>
                  <Badge
                    variant="outline"
                    className={`text-[10px] px-2 py-0.5 ${
                      optimizedRoute.isFallbackGeometry
                        ? 'border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10'
                        : 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
                    }`}
                  >
                    {optimizedRoute.isFallbackGeometry ? 'Mode Cadangan Offline' : 'OSRM Real-Road Routing'}
                  </Badge>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    size="sm"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 h-9"
                    onClick={handleOpenGoogleMaps}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Buka Google Maps
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 h-9"
                    onClick={handleCopyDirections}
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Tersalin!' : 'Salin Petunjuk'}
                  </Button>
                </div>

                {/* Waypoint Stops Timeline */}
                <div className="space-y-3 pt-1">
                  <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground px-1">
                    <span>URUTAN PERJALANAN</span>
                    <span>{optimizedRoute.segments.length} Jalur Terhubung</span>
                  </div>

                  <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-emerald-500/30">
                    {optimizedRoute.points.map((pt, idx) => {
                      const isFirst = idx === 0;
                      const isLast = idx === optimizedRoute.points.length - 1;
                      const leg = idx < optimizedRoute.segments.length ? optimizedRoute.segments[idx] : null;

                      return (
                        <div key={`${pt.id}-${idx}`} className="relative group">
                          {/* Sequence circle dot */}
                          <div
                            className={`absolute -left-6 top-1.5 w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px] font-bold shadow-xs ${
                              isFirst
                                ? 'bg-primary border-primary text-primary-foreground'
                                : isLast && roundTrip
                                ? 'bg-amber-600 border-amber-600 text-white'
                                : 'bg-emerald-600 border-emerald-600 text-white'
                            }`}
                          >
                            {isFirst && pt.isUserLocation ? 'S' : idx + 1}
                          </div>

                          {/* Stop Card */}
                          <div className="p-3 rounded-2xl bg-card border border-border/70 hover:border-emerald-500/40 shadow-xs transition-all">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-bold text-foreground truncate">
                                  {pt.title || `Titik #${idx + 1}`}
                                </div>
                                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                  {pt.category && (
                                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 capitalize h-3.5">
                                      {pt.category}
                                    </Badge>
                                  )}
                                  {pt.severity && (
                                    <span
                                      className={`text-[10px] px-1.5 py-0 rounded font-medium border capitalize ${getSeverityBadgeStyle(
                                        pt.severity
                                      )}`}
                                    >
                                      {pt.severity}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  onFocusPoint?.(pt.coords);
                                  toast.info(`Fokus ke: ${pt.title}`);
                                }}
                                title="Fokus titik di peta"
                                className="p-1 rounded-lg text-muted-foreground hover:text-primary hover:bg-muted transition-colors shrink-0"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Leg summary connector */}
                            {leg && (
                              <div className="mt-2.5 pt-2 border-t border-border/40 text-[11px] text-muted-foreground flex items-center justify-between bg-muted/30 px-2.5 py-1.5 rounded-lg">
                                <span className="truncate pr-2 font-medium text-emerald-600 dark:text-emerald-400">
                                  ➔ {leg.summary}
                                </span>
                                <span className="whitespace-nowrap font-mono font-semibold">
                                  {leg.distanceKm} km • ~{leg.durationMinutes} mnt
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Sticky Bottom Actions Footer */}
              <div className="p-3.5 border-t border-border/60 bg-background/95 dark:bg-slate-900/95 flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 rounded-xl text-xs h-9"
                  onClick={() => setActiveTab('plan')}
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                  Atur Ulang Rute
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  className="rounded-xl text-xs px-3 h-9"
                  onClick={handleClearRoute}
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  Hapus
                </Button>
              </div>
            </>
          ) : (
            <div className="p-8 text-center text-muted-foreground text-xs flex flex-col items-center justify-center gap-2 flex-1">
              <Navigation className="w-8 h-8 opacity-40" />
              <span>Belum ada rute aktif yang dihitung.</span>
              <Button size="sm" variant="outline" onClick={() => setActiveTab('plan')} className="mt-2 text-xs">
                Mulai Perencanaan
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </motion.aside>
  );
}

function getSeverityPriority(severity?: 'ringan' | 'sedang' | 'berat'): number {
  if (severity === 'berat') return 5;
  if (severity === 'sedang') return 3;
  if (severity === 'ringan') return 1;
  return 2;
}

function getSeverityBadgeStyle(severity?: 'ringan' | 'sedang' | 'berat'): string {
  switch (severity) {
    case 'berat':
      return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20';
    case 'sedang':
      return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
    case 'ringan':
      return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
}
