/**
 * Spatial Analysis Sidebar Component
 * Liquid Glass full-height sidebar for Buffer Zone Impact Analysis,
 * Spatial Density (Hex/KDE), NNI Statistics, and Proximity Search
 */

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import {
  Activity,
  Circle,
  Grid3x3,
  TrendingUp,
  X,
  LocateFixed,
  Eye,
  Trash2,
  Copy,
  Check,
  ShieldAlert,
  Compass,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  analyzeBufferImpact,
  findWithinRadius,
  createHexGrid,
  calculateDensity,
  calculateNearestNeighborIndex,
  calculateBBox,
  kernelDensity,
  type BufferOptions,
  type BufferAnalysisResult,
  type DensityCell,
  type SpatialStats,
} from '@/features/map/spatialAnalysis';
import type { FeatureCollection } from 'geojson';
import * as turf from '@turf/turf';

export interface BufferActiveData {
  geojson: FeatureCollection;
  center: [number, number];
  radius: number;
  units: 'kilometers' | 'meters';
  radiusKm: number;
  color: string;
  title: string;
  impactResult: BufferAnalysisResult;
}

interface SpatialAnalysisPanelProps {
  reports: Array<{
    id: string;
    title: string;
    coords: [number, number];
    category: string;
    status: string;
    severity?: 'ringan' | 'sedang' | 'berat';
  }>;
  initialPoint?: [number, number] | null;
  userLocation?: [number, number] | null;
  activeBuffer?: BufferActiveData | null;
  hasActiveDensity?: boolean;
  onBufferCreated?: (data: BufferActiveData) => void;
  onClearBuffer?: () => void;
  onDensityCalculated?: (cells: DensityCell[]) => void;
  onClearDensity?: () => void;
  onStatsCalculated?: (stats: SpatialStats) => void;
  onFocusPoint?: (coords: [number, number]) => void;
  onFocusBounds?: (bounds: [[number, number], [number, number]]) => void;
  onClose: () => void;
}

const BUFFER_COLOR_PRESETS = [
  { id: 'danger', name: 'Bahaya / Evakuasi', color: '#ef4444', borderClass: 'border-red-500' },
  { id: 'warning', name: 'Waspada / Siaga', color: '#f59e0b', borderClass: 'border-amber-500' },
  { id: 'impact', name: 'Wilayah Pengaruh', color: '#3b82f6', borderClass: 'border-blue-500' },
  { id: 'conserve', name: 'Konservasi & SDA', color: '#10b981', borderClass: 'border-emerald-500' },
];

export function SpatialAnalysisPanel({
  reports,
  initialPoint,
  userLocation,
  activeBuffer,
  hasActiveDensity,
  onBufferCreated,
  onClearBuffer,
  onDensityCalculated,
  onClearDensity,
  onStatsCalculated,
  onFocusPoint,
  onFocusBounds,
  onClose,
}: SpatialAnalysisPanelProps) {
  const [activeTab, setActiveTab] = useState<'buffer' | 'density' | 'stats' | 'proximity'>('buffer');

  // Center mode for buffer: 'report' vs 'point'
  const [centerMode, setCenterMode] = useState<'report' | 'point'>('report');
  const [selectedReportId, setSelectedReportId] = useState<string>(reports[0]?.id || '');
  const [customPoint, setCustomPoint] = useState<[number, number]>(
    initialPoint || userLocation || (reports[0]?.coords ?? [-7.327, 108.355])
  );

  // Buffer parameters
  const [bufferRadius, setBufferRadius] = useState<number>(1);
  const [bufferUnits, setBufferUnits] = useState<'kilometers' | 'meters'>('kilometers');
  const [bufferColor, setBufferColor] = useState<string>('#3b82f6');
  const [copiedSummary, setCopiedSummary] = useState(false);

  // Density parameters
  const [densityGridSize, setDensityGridSize] = useState(1);
  const [densityType, setDensityType] = useState<'hex' | 'kde'>('hex');
  const [kdeBandwidth, setKdeBandwidth] = useState(2);

  // Proximity parameters
  const [proximityRadius, setProximityRadius] = useState(5);
  const [proximityResults, setProximityResults] = useState<Array<{ id: string; distance: number }>>([]);

  // Active center coordinates based on selection mode
  const currentCenter = useMemo<[number, number]>(() => {
    if (centerMode === 'report') {
      const found = reports.find((r) => r.id === selectedReportId);
      return found ? found.coords : customPoint;
    }
    return customPoint;
  }, [centerMode, selectedReportId, reports, customPoint]);

  const selectedReport = useMemo(() => {
    return reports.find((r) => r.id === selectedReportId);
  }, [reports, selectedReportId]);

  const handleCreateBuffer = () => {
    if (!currentCenter) {
      toast.error('Pilih titik pusat buffer terlebih dahulu');
      return;
    }

    const options: BufferOptions = {
      radius: bufferRadius,
      units: bufferUnits,
      steps: 64,
    };

    const impactResult = analyzeBufferImpact(currentCenter, options, reports);
    const radiusKm = bufferUnits === 'meters' ? bufferRadius / 1000 : bufferRadius;
    const title =
      centerMode === 'report' && selectedReport
        ? `Zona Penyangga: ${selectedReport.title}`
        : `Zona Penyangga Koordinat [${currentCenter[0].toFixed(4)}, ${currentCenter[1].toFixed(4)}]`;

    const activeData: BufferActiveData = {
      geojson: impactResult.geojson,
      center: currentCenter,
      radius: bufferRadius,
      units: bufferUnits,
      radiusKm,
      color: bufferColor,
      title,
      impactResult,
    };

    onBufferCreated?.(activeData);

    // Zoom map to buffer bounds if available
    try {
      const bbox = turf.bbox(impactResult.geojson);
      // Turf bbox: [minLon, minLat, maxLon, maxLat] -> Leaflet bounds: [[minLat, minLon], [maxLat, maxLon]]
      onFocusBounds?.([
        [bbox[1], bbox[0]],
        [bbox[3], bbox[2]],
      ]);
    } catch {
      onFocusPoint?.(currentCenter);
    }

    toast.success('Buffer zone berhasil dibuat!', {
      description: `Radius ${bufferRadius} ${bufferUnits} • ${impactResult.impactedReports.length} laporan di dalam zona`,
    });
  };

  const handleCopySummary = async () => {
    if (!activeBuffer) return;
    const r = activeBuffer.impactResult;
    const text = `=== HASIL ANALISIS BUFFER ZONE SIPASDA ===\nJudul: ${activeBuffer.title}\nTitik Pusat: ${activeBuffer.center[0]}, ${activeBuffer.center[1]}\nRadius: ${activeBuffer.radius} ${activeBuffer.units}\nLuas Area: ${r.areaKm2} km² (${r.areaHectares} ha)\nKeliling: ${r.perimeterKm} km\nTotal Laporan Terdampak: ${r.impactedReports.length}\n• Bahaya Berat: ${r.severityBreakdown.berat}\n• Bahaya Sedang: ${r.severityBreakdown.sedang}\n• Bahaya Ringan: ${r.severityBreakdown.ringan}\n\nDaftar Laporan Terdampak:\n${r.impactedReports
      .map((rep, idx) => `${idx + 1}. [${rep.distanceKm} km] ${rep.title} (${rep.category} - ${rep.severity || 'umum'})`)
      .join('\n')}`;

    try {
      await navigator.clipboard.writeText(text);
      setCopiedSummary(true);
      toast.success('Ringkasan analisis disalin ke clipboard');
      setTimeout(() => setCopiedSummary(false), 2500);
    } catch {
      toast.error('Gagal menyalin ringkasan');
    }
  };

  const handleCalculateDensity = () => {
    if (reports.length === 0) {
      toast.error('Tidak ada data untuk analisis');
      return;
    }

    const points = reports.map((r) => r.coords);
    const bbox = calculateBBox(points);
    let cells: DensityCell[];

    if (densityType === 'hex') {
      const grid = createHexGrid(bbox, densityGridSize, 'kilometers');
      cells = calculateDensity(points, grid);
    } else {
      cells = kernelDensity(points, kdeBandwidth, 50);
    }

    onDensityCalculated?.(cells);
    toast.success(`Analisis densitas selesai: ${cells.length} sel dengan data`);
  };

  const handleCalculateStats = () => {
    if (reports.length < 2) {
      toast.error('Minimal 2 titik diperlukan untuk analisis statistik');
      return;
    }

    const points = reports.map((r) => r.coords);
    const bbox = calculateBBox(points);
    const width = (bbox[2] - bbox[0]) * 111;
    const height = (bbox[3] - bbox[1]) * 111;
    const areaKm2 = Math.max(1, width * height);

    const stats = calculateNearestNeighborIndex(points, areaKm2);
    onStatsCalculated?.(stats);

    toast.success('Analisis statistik selesai', {
      description: stats.clustered ? 'Pola: Mengelompok (Clustered)' : 'Pola: Tersebar (Dispersed)',
    });
  };

  const handleProximityAnalysis = () => {
    if (!currentCenter) {
      toast.error('Pilih titik referensi');
      return;
    }

    const results = findWithinRadius(
      currentCenter,
      reports.map((r) => ({ id: r.id, coords: r.coords })),
      proximityRadius,
      'kilometers'
    );

    setProximityResults(results);
    toast.success(`Ditemukan ${results.length} laporan dalam radius ${proximityRadius} km`);
  };

  return (
    <motion.aside
      role="region"
      aria-label="Sidebar Analisis Spasial"
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
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/60 bg-gradient-to-r from-blue-500/10 via-primary/5 to-transparent shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-sm shrink-0">
            <Activity className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-sm text-foreground tracking-tight flex items-center gap-2 truncate">
              Analisis Spasial
              {activeBuffer && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-blue-500/40 text-blue-600 dark:text-blue-400 bg-blue-500/10 shrink-0">
                  Buffer Aktif
                </Badge>
              )}
            </h3>
            <p className="text-[11px] text-muted-foreground truncate">Buffer Zone, Densitas & Penilaian Dampak</p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {activeBuffer && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onClearBuffer}
              title="Hapus Buffer dari Peta"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={onClose}
            title="Tutup Panel"
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground rounded-xl"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as 'buffer' | 'density' | 'stats' | 'proximity')}
        className="flex-1 flex flex-col min-h-0 overflow-hidden"
      >
        <div className="px-5 pt-3 pb-2 border-b border-border/40 shrink-0">
          <TabsList className="grid grid-cols-4 w-full h-9 p-0.5 bg-muted/60 rounded-xl">
            <TabsTrigger value="buffer" className="text-[11px] rounded-lg font-medium">
              Buffer
            </TabsTrigger>
            <TabsTrigger value="density" className="text-[11px] rounded-lg font-medium">
              Densitas
            </TabsTrigger>
            <TabsTrigger value="stats" className="text-[11px] rounded-lg font-medium">
              Statistik
            </TabsTrigger>
            <TabsTrigger value="proximity" className="text-[11px] rounded-lg font-medium">
              Proximity
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab 1: Buffer Zone */}
        <TabsContent
          value="buffer"
          className="flex-1 min-h-0 overflow-hidden m-0 p-0 data-[state=inactive]:hidden data-[state=active]:flex flex-col"
        >
          {/* Scrollable controls and results */}
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 py-4 space-y-4">
            {/* Center Point Mode Selector */}
            <div className="space-y-2">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-1">
                Titik Pusat Buffer
              </span>

              <div className="grid grid-cols-2 gap-1.5 p-1 bg-muted/60 rounded-xl text-xs">
                <button
                  type="button"
                  onClick={() => setCenterMode('report')}
                  className={cn(
                    'py-1.5 px-3 rounded-lg font-semibold transition-all',
                    centerMode === 'report' ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  Laporan Infrastruktur
                </button>
                <button
                  type="button"
                  onClick={() => setCenterMode('point')}
                  className={cn(
                    'py-1.5 px-3 rounded-lg font-semibold transition-all',
                    centerMode === 'point' ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  Koordinat Peta / GPS
                </button>
              </div>

              {centerMode === 'report' ? (
                <div className="space-y-2 p-3 rounded-2xl bg-card border border-border/70 shadow-xs">
                  <Label className="text-xs font-semibold">Pilih Laporan Target:</Label>
                  <Select
                    value={selectedReportId}
                    onValueChange={(id) => {
                      setSelectedReportId(id);
                      const rep = reports.find((r) => r.id === id);
                      if (rep) {
                        onFocusPoint?.(rep.coords);
                        toast.info(`Pusat buffer: ${rep.title}`);
                      }
                    }}
                  >
                    <SelectTrigger className="h-9 text-xs rounded-xl bg-background">
                      <SelectValue placeholder="Pilih laporan..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-64">
                      {reports.map((r, i) => (
                        <SelectItem key={r.id} value={r.id} className="text-xs">
                          <span className="font-semibold">#{i + 1}</span> {r.title} ({r.category})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {selectedReport && (
                    <div className="pt-1.5 flex items-center justify-between text-[11px] text-muted-foreground border-t border-border/40">
                      <span className="capitalize">{selectedReport.category} • {selectedReport.status}</span>
                      <button
                        type="button"
                        onClick={() => onFocusPoint?.(selectedReport.coords)}
                        className="text-primary hover:underline flex items-center gap-1 font-medium"
                      >
                        <Eye className="w-3 h-3" /> Fokus
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2 p-3 rounded-2xl bg-card border border-border/70 shadow-xs">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold">Koordinat Pusat:</span>
                    <span className="font-mono text-muted-foreground text-[11px]">
                      {currentCenter[0].toFixed(5)}, {currentCenter[1].toFixed(5)}
                    </span>
                  </div>

                  {userLocation && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full h-8 text-xs rounded-xl"
                      onClick={() => {
                        setCustomPoint(userLocation);
                        onFocusPoint?.(userLocation);
                        toast.success('Menggunakan koordinat GPS Anda');
                      }}
                    >
                      <LocateFixed className="w-3.5 h-3.5 mr-1.5 text-primary" />
                      Gunakan Posisi GPS Saya
                    </Button>
                  )}
                  <p className="text-[10px] text-muted-foreground">
                    Tip: Anda juga dapat mengklik langsung sembarang lokasi di peta untuk memindahkan titik pusat.
                  </p>
                </div>
              )}
            </div>

            {/* Radius Configuration */}
            <div className="space-y-2.5 p-3 rounded-2xl bg-card border border-border/70 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold">Radius Zona Penyangga:</span>
                <span className="text-xs font-bold text-primary font-mono">
                  {bufferRadius} {bufferUnits}
                </span>
              </div>

              {/* Quick Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px]">
                {[
                  { val: 500, unit: 'meters' as const, label: '500 m' },
                  { val: 1, unit: 'kilometers' as const, label: '1 km' },
                  { val: 2, unit: 'kilometers' as const, label: '2 km' },
                  { val: 5, unit: 'kilometers' as const, label: '5 km' },
                  { val: 10, unit: 'kilometers' as const, label: '10 km' },
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => {
                      setBufferRadius(item.val);
                      setBufferUnits(item.unit);
                    }}
                    className={cn(
                      'px-2.5 py-1 rounded-lg border text-xs font-medium whitespace-nowrap transition-colors',
                      bufferRadius === item.val && bufferUnits === item.unit
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-muted/50 border-border text-muted-foreground hover:bg-muted'
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <Slider
                value={[bufferRadius]}
                onValueChange={([v]) => setBufferRadius(v)}
                min={bufferUnits === 'meters' ? 100 : 0.5}
                max={bufferUnits === 'meters' ? 5000 : 25}
                step={bufferUnits === 'meters' ? 100 : 0.5}
                className="mt-2"
              />

              <div className="pt-2 flex items-center justify-between text-xs">
                <span className="text-muted-foreground text-[11px]">Satuan Pengukuran:</span>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant={bufferUnits === 'kilometers' ? 'default' : 'outline'}
                    className="h-6 text-[10px] px-2 rounded-lg"
                    onClick={() => {
                      if (bufferUnits === 'meters') setBufferRadius(Math.max(1, Math.round(bufferRadius / 1000)));
                      setBufferUnits('kilometers');
                    }}
                  >
                    Kilometer (km)
                  </Button>
                  <Button
                    size="sm"
                    variant={bufferUnits === 'meters' ? 'default' : 'outline'}
                    className="h-6 text-[10px] px-2 rounded-lg"
                    onClick={() => {
                      if (bufferUnits === 'kilometers') setBufferRadius(bufferRadius * 1000);
                      setBufferUnits('meters');
                    }}
                  >
                    Meter (m)
                  </Button>
                </div>
              </div>
            </div>

            {/* Buffer Theme & Color Presets */}
            <div className="space-y-2 p-3 rounded-2xl bg-card border border-border/70 shadow-xs">
              <span className="text-xs font-semibold">Kategori Zona & Warna:</span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {BUFFER_COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setBufferColor(preset.color)}
                    className={cn(
                      'flex items-center gap-2 p-2 rounded-xl border text-left transition-all',
                      bufferColor === preset.color
                        ? 'bg-primary/10 border-primary shadow-xs font-semibold text-foreground'
                        : 'border-border/60 bg-muted/20 text-muted-foreground hover:bg-muted/50'
                    )}
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs"
                      style={{ backgroundColor: preset.color }}
                    />
                    <span className="text-[11px] truncate">{preset.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Impact Assessment Card (if active buffer exists) */}
            {activeBuffer && (
              <div className="space-y-3 p-4 rounded-2xl bg-card border border-blue-500/40 shadow-sm animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-xs font-bold text-foreground">Hasil Analisis Interseksi</span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 text-[10px] px-2 text-muted-foreground hover:text-foreground"
                    onClick={handleCopySummary}
                  >
                    {copiedSummary ? <Check className="w-3 h-3 text-emerald-500 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
                    {copiedSummary ? 'Tersalin' : 'Salin Data'}
                  </Button>
                </div>

                {/* 3 Metric Cards */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded-xl bg-muted/40 border border-border/60">
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Luas Area</span>
                    <span className="text-xs font-bold text-foreground mt-0.5 block">
                      {activeBuffer.impactResult.areaKm2} km²
                    </span>
                    <span className="text-[9px] text-muted-foreground">({activeBuffer.impactResult.areaHectares} ha)</span>
                  </div>

                  <div className="p-2 rounded-xl bg-muted/40 border border-border/60">
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Keliling</span>
                    <span className="text-xs font-bold text-foreground mt-0.5 block">
                      {activeBuffer.impactResult.perimeterKm} km
                    </span>
                    <span className="text-[9px] text-muted-foreground">(Perimeter)</span>
                  </div>

                  <div className="p-2 rounded-xl bg-muted/40 border border-border/60">
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Terdampak</span>
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400 mt-0.5 block">
                      {activeBuffer.impactResult.impactedReports.length} Titik
                    </span>
                    <span className="text-[9px] text-muted-foreground">infrastruktur</span>
                  </div>
                </div>

                {/* Severity Breakdown Pills */}
                <div className="flex items-center gap-1.5 text-[10px] flex-wrap">
                  <span className="px-2 py-0.5 rounded-md bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 font-medium">
                    {activeBuffer.impactResult.severityBreakdown.berat} Bahaya Berat
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-medium">
                    {activeBuffer.impactResult.severityBreakdown.sedang} Bahaya Sedang
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-medium">
                    {activeBuffer.impactResult.severityBreakdown.ringan} Ringan
                  </span>
                </div>

                {/* Impacted Reports List */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] font-semibold text-foreground block">
                    Daftar Infrastruktur di Dalam Zona:
                  </span>
                  {activeBuffer.impactResult.impactedReports.length === 0 ? (
                    <div className="p-3 text-center text-xs text-muted-foreground rounded-xl bg-muted/20 border border-border/50">
                      Tidak ada laporan infrastruktur di dalam radius ini.
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {activeBuffer.impactResult.impactedReports.map((item, idx) => (
                        <div
                          key={item.id}
                          className="p-2 rounded-xl bg-background/80 border border-border/60 flex items-center justify-between text-xs hover:border-blue-500/40 transition-colors"
                        >
                          <div className="min-w-0 flex-1 pr-2">
                            <div className="font-semibold text-foreground truncate">
                              #{idx + 1} {item.title}
                            </div>
                            <div className="text-[10px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                              <span className="capitalize">{item.category}</span>
                              <span>•</span>
                              <span className="font-mono font-medium text-blue-600 dark:text-blue-400">
                                {item.distanceKm} km dari pusat
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => onFocusPoint?.(item.coords)}
                            title="Fokus titik laporan"
                            className="p-1 rounded-lg text-muted-foreground hover:text-primary hover:bg-muted transition-colors shrink-0"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Sticky Execution Footer */}
          <div className="p-4 border-t border-border/60 bg-background/95 dark:bg-slate-900/95 shrink-0 flex items-center gap-2">
            <Button
              className="flex-1 h-10 font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-2xl shadow-lg shadow-blue-500/20 transition-all text-xs"
              onClick={handleCreateBuffer}
            >
              <Circle className="w-4 h-4 mr-1.5" />
              {activeBuffer ? 'Perbarui Buffer Zone' : 'Buat Buffer Zone'}
            </Button>

            {activeBuffer && (
              <Button
                variant="destructive"
                size="sm"
                onClick={onClearBuffer}
                className="h-10 px-3 rounded-2xl text-xs"
                title="Hapus Buffer dari Peta"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </TabsContent>

        {/* Tab 2: Densitas */}
        <TabsContent
          value="density"
          className="flex-1 min-h-0 overflow-hidden m-0 p-0 data-[state=inactive]:hidden data-[state=active]:flex flex-col"
        >
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 py-4 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Metode Perhitungan</Label>
              <Select value={densityType} onValueChange={(v: 'hex' | 'kde') => setDensityType(v)}>
                <SelectTrigger className="h-9 text-xs rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hex">Hexagonal Grid Density</SelectItem>
                  <SelectItem value="kde">Kernel Density Estimation (KDE)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {densityType === 'hex' ? (
              <div className="space-y-2 p-3 rounded-2xl bg-card border border-border/70 shadow-xs">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold">Ukuran Grid Hexagonal:</span>
                  <span className="font-mono font-bold text-primary">{densityGridSize} km</span>
                </div>
                <Slider
                  value={[densityGridSize]}
                  onValueChange={([v]) => setDensityGridSize(v)}
                  min={0.5}
                  max={5}
                  step={0.5}
                  className="mt-2"
                />
              </div>
            ) : (
              <div className="space-y-2 p-3 rounded-2xl bg-card border border-border/70 shadow-xs">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold">Bandwidth KDE:</span>
                  <span className="font-mono font-bold text-primary">{kdeBandwidth} km</span>
                </div>
                <Slider
                  value={[kdeBandwidth]}
                  onValueChange={([v]) => setKdeBandwidth(v)}
                  min={0.5}
                  max={10}
                  step={0.5}
                  className="mt-2"
                />
              </div>
            )}

            <div className="p-3 rounded-2xl bg-card border border-border/70 text-xs flex items-center justify-between">
              <span className="text-muted-foreground">Total Titik Dianalisis:</span>
              <span className="font-bold text-foreground font-mono">{reports.length} Laporan</span>
            </div>
          </div>

          <div className="p-4 border-t border-border/60 bg-background/95 dark:bg-slate-900/95 shrink-0 flex items-center gap-2">
            <Button className="flex-1 h-10 font-bold rounded-2xl text-xs" onClick={handleCalculateDensity}>
              <Grid3x3 className="w-4 h-4 mr-2" />
              Hitung Densitas Spasial
            </Button>
            {hasActiveDensity && (
              <Button
                variant="destructive"
                size="sm"
                onClick={onClearDensity}
                className="h-10 px-3 rounded-2xl text-xs shrink-0"
                title="Hapus Tampilan Densitas"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </TabsContent>

        {/* Tab 3: Statistik */}
        <TabsContent
          value="stats"
          className="flex-1 min-h-0 overflow-hidden m-0 p-0 data-[state=inactive]:hidden data-[state=active]:flex flex-col"
        >
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 py-4 space-y-4">
            <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-xs space-y-2">
              <div className="font-bold text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                Nearest Neighbor Index (NNI)
              </div>
              <p className="text-purple-800/80 dark:text-purple-300 leading-relaxed text-[11px]">
                Mengukur tingkat pengelompokan titik laporan bencana & infrastruktur:
              </p>
              <div className="space-y-1 font-mono text-[11px] text-purple-900 dark:text-purple-200 pl-2">
                <div>• NNI &lt; 1 : Pola Mengelompok (Clustered)</div>
                <div>• NNI = 1 : Pola Acak (Random)</div>
                <div>• NNI &gt; 1 : Pola Tersebar (Dispersed)</div>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-card border border-border/70 text-xs flex items-center justify-between">
              <span className="text-muted-foreground">Jumlah Sampel Titik:</span>
              <span className="font-bold text-foreground font-mono">{reports.length} Laporan</span>
            </div>
          </div>

          <div className="p-4 border-t border-border/60 bg-background/95 dark:bg-slate-900/95 shrink-0">
            <Button className="w-full h-10 font-bold rounded-2xl text-xs" onClick={handleCalculateStats}>
              <TrendingUp className="w-4 h-4 mr-2" />
              Hitung Statistik Spasial NNI
            </Button>
          </div>
        </TabsContent>

        {/* Tab 4: Proximity */}
        <TabsContent
          value="proximity"
          className="flex-1 min-h-0 overflow-hidden m-0 p-0 data-[state=inactive]:hidden data-[state=active]:flex flex-col"
        >
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 py-4 space-y-4">
            <div className="space-y-2 p-3 rounded-2xl bg-card border border-border/70 shadow-xs">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold">Radius Kedekatan:</span>
                <span className="font-mono font-bold text-primary">{proximityRadius} km</span>
              </div>
              <Slider
                value={[proximityRadius]}
                onValueChange={([v]) => setProximityRadius(v)}
                min={0.5}
                max={20}
                step={0.5}
                className="mt-2"
              />
            </div>

            <div className="p-3 rounded-2xl bg-card border border-border/70 text-xs">
              <span className="text-muted-foreground block text-[11px] font-semibold mb-1">Titik Referensi:</span>
              <span className="font-mono text-foreground font-bold">
                {currentCenter[0].toFixed(5)}, {currentCenter[1].toFixed(5)}
              </span>
            </div>

            {proximityResults.length > 0 && (
              <div className="space-y-2 p-3 rounded-2xl bg-card border border-border/70">
                <span className="text-xs font-bold text-foreground block">
                  Hasil Terdekat ({proximityResults.length} Laporan):
                </span>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {proximityResults.map((r, i) => (
                    <div key={r.id} className="p-2 rounded-xl bg-muted/40 border border-border/50 text-xs flex justify-between items-center">
                      <span className="font-medium truncate pr-2">#{i + 1} {r.id}</span>
                      <span className="font-mono font-semibold text-primary">{r.distance.toFixed(2)} km</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="p-4 border-t border-border/60 bg-background/95 dark:bg-slate-900/95 shrink-0">
            <Button className="w-full h-10 font-bold rounded-2xl text-xs" onClick={handleProximityAnalysis}>
              <Compass className="w-4 h-4 mr-2" />
              Cari Laporan Terdekat
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </motion.aside>
  );
}
