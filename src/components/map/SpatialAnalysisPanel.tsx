/**
 * Spatial Analysis Panel Component
 * UI for spatial analysis tools
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Activity, Circle, Grid3x3, TrendingUp, X, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import {
  createBuffer,
  findWithinRadius,
  createHexGrid,
  calculateDensity,
  calculateNearestNeighborIndex,
  calculateBBox,
  kernelDensity,
  type BufferOptions,
  type DensityCell,
} from '@/lib/spatialAnalysis';
import type { FeatureCollection } from 'geojson';

interface SpatialAnalysisPanelProps {
  reports: Array<{ id: string; coords: [number, number]; category: string; status: string }>;
  onBufferCreated?: (buffer: FeatureCollection) => void;
  onDensityCalculated?: (cells: DensityCell[]) => void;
  onStatsCalculated?: (stats: { nni: number; mean: number; stdDev: number; clustered: boolean }) => void;
  onClose: () => void;
}

export function SpatialAnalysisPanel({
  reports,
  onBufferCreated,
  onDensityCalculated,
  onStatsCalculated,
  onClose,
}: SpatialAnalysisPanelProps) {
  const [bufferRadius, setBufferRadius] = useState(1);
  const [bufferUnits, setBufferUnits] = useState<'kilometers' | 'meters'>('kilometers');
  const [selectedPoint, setSelectedPoint] = useState<[number, number] | null>(null);
  
  const [densityGridSize, setDensityGridSize] = useState(1);
  const [densityType, setDensityType] = useState<'hex' | 'kde'>('hex');
  const [kdeBandwidth, setKdeBandwidth] = useState(2);

  const [proximityRadius, setProximityRadius] = useState(5);
  const [proximityResults, setProximityResults] = useState<Array<{ id: string; distance: number }>>([]);

  const handleCreateBuffer = () => {
    if (!selectedPoint) {
      toast.error('Pilih titik pada peta terlebih dahulu');
      return;
    }

    const options: BufferOptions = {
      radius: bufferRadius,
      units: bufferUnits,
      steps: 64,
    };

    const buffer = createBuffer(selectedPoint, options);
    onBufferCreated?.(buffer);
    toast.success(`Buffer ${bufferRadius} ${bufferUnits} berhasil dibuat`);
  };

  const handleCalculateDensity = () => {
    if (reports.length === 0) {
      toast.error('Tidak ada data untuk analisis');
      return;
    }

    const points = reports.map(r => r.coords);
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

    const points = reports.map(r => r.coords);
    const bbox = calculateBBox(points);
    
    // Calculate study area in km²
    const width = (bbox[2] - bbox[0]) * 111; // rough conversion
    const height = (bbox[3] - bbox[1]) * 111;
    const areaKm2 = width * height;

    const stats = calculateNearestNeighborIndex(points, areaKm2);
    
    onStatsCalculated?.({
      nni: stats.nearestNeighborIndex,
      mean: stats.meanDistance,
      stdDev: stats.standardDeviation,
      clustered: stats.clustered,
    });

    toast.success('Analisis statistik selesai', {
      description: stats.clustered ? 'Pola: Mengelompok (Clustered)' : 'Pola: Tersebar (Dispersed)',
    });
  };

  const handleProximityAnalysis = () => {
    if (!selectedPoint) {
      toast.error('Pilih titik referensi pada peta');
      return;
    }

    const results = findWithinRadius(
      selectedPoint,
      reports.map(r => ({ id: r.id, coords: r.coords })),
      proximityRadius,
      'kilometers'
    );

    setProximityResults(results);
    toast.success(`Ditemukan ${results.length} laporan dalam radius ${proximityRadius} km`);
  };

  return (
    <div className="absolute top-24 left-4 z-[1200] w-96 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl max-h-[calc(100vh-140px)] overflow-hidden flex flex-col">
      <div className="flex items-center justify-between p-3 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4" />
          <h3 className="font-semibold text-sm">Analisis Spasial</h3>
        </div>
        <Button size="sm" variant="ghost" onClick={onClose} className="h-7 w-7 p-0">
          <X className="w-4 h-4" />
        </Button>
      </div>

      <Tabs defaultValue="buffer" className="flex-1 overflow-hidden flex flex-col">
        <TabsList className="grid w-full grid-cols-4 mx-4 mt-2">
          <TabsTrigger value="buffer" className="text-xs">
            <Circle className="w-3 h-3 mr-1" />
            Buffer
          </TabsTrigger>
          <TabsTrigger value="density" className="text-xs">
            <Grid3x3 className="w-3 h-3 mr-1" />
            Densitas
          </TabsTrigger>
          <TabsTrigger value="stats" className="text-xs">
            <TrendingUp className="w-3 h-3 mr-1" />
            Statistik
          </TabsTrigger>
          <TabsTrigger value="proximity" className="text-xs">
            <MapPin className="w-3 h-3 mr-1" />
            Proximity
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-y-auto p-4">
          <TabsContent value="buffer" className="mt-0 space-y-4">
            <div>
              <Label className="text-xs">Radius: {bufferRadius} {bufferUnits}</Label>
              <Slider
                value={[bufferRadius]}
                onValueChange={([v]) => setBufferRadius(v)}
                min={0.1}
                max={10}
                step={0.1}
                className="mt-2"
              />
            </div>

            <div>
              <Label className="text-xs">Satuan</Label>
              <Select value={bufferUnits} onValueChange={(v: any) => setBufferUnits(v)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kilometers">Kilometer</SelectItem>
                  <SelectItem value="meters">Meter</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedPoint && (
              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded p-2 text-xs">
                <div className="font-semibold text-blue-900 dark:text-blue-100 mb-1">Titik Terpilih:</div>
                <div className="text-blue-700 dark:text-blue-300 font-mono">
                  {selectedPoint[0].toFixed(6)}, {selectedPoint[1].toFixed(6)}
                </div>
              </div>
            )}

            <Button className="w-full" onClick={handleCreateBuffer}>
              Buat Buffer Zone
            </Button>

            <div className="text-xs text-muted-foreground">
              Klik pada peta untuk memilih titik pusat buffer
            </div>
          </TabsContent>

          <TabsContent value="density" className="mt-0 space-y-4">
            <div>
              <Label className="text-xs">Metode</Label>
              <Select value={densityType} onValueChange={(v: any) => setDensityType(v)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hex">Hexagonal Grid</SelectItem>
                  <SelectItem value="kde">Kernel Density (KDE)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {densityType === 'hex' && (
              <div>
                <Label className="text-xs">Ukuran Grid: {densityGridSize} km</Label>
                <Slider
                  value={[densityGridSize]}
                  onValueChange={([v]) => setDensityGridSize(v)}
                  min={0.5}
                  max={5}
                  step={0.5}
                  className="mt-2"
                />
              </div>
            )}

            {densityType === 'kde' && (
              <div>
                <Label className="text-xs">Bandwidth: {kdeBandwidth} km</Label>
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

            <Button className="w-full" onClick={handleCalculateDensity}>
              Hitung Densitas
            </Button>

            <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded p-2 text-xs">
              <div className="font-semibold text-green-900 dark:text-green-100 mb-1">Total Data:</div>
              <div className="text-green-700 dark:text-green-300">{reports.length} laporan</div>
            </div>
          </TabsContent>

          <TabsContent value="stats" className="mt-0 space-y-4">
            <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded p-3 text-xs">
              <div className="font-semibold text-purple-900 dark:text-purple-100 mb-2">
                Nearest Neighbor Index (NNI)
              </div>
              <div className="text-purple-700 dark:text-purple-300 space-y-1">
                <div>• NNI &lt; 1: Pola mengelompok (clustered)</div>
                <div>• NNI = 1: Pola acak (random)</div>
                <div>• NNI &gt; 1: Pola tersebar (dispersed)</div>
              </div>
            </div>

            <Button className="w-full" onClick={handleCalculateStats}>
              Hitung Statistik Spasial
            </Button>

            <div className="text-xs text-muted-foreground">
              Analisis pola distribusi spasial menggunakan metode Nearest Neighbor
            </div>
          </TabsContent>

          <TabsContent value="proximity" className="mt-0 space-y-4">
            <div>
              <Label className="text-xs">Radius Pencarian: {proximityRadius} km</Label>
              <Slider
                value={[proximityRadius]}
                onValueChange={([v]) => setProximityRadius(v)}
                min={0.5}
                max={20}
                step={0.5}
                className="mt-2"
              />
            </div>

            {selectedPoint && (
              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded p-2 text-xs">
                <div className="font-semibold text-blue-900 dark:text-blue-100 mb-1">Titik Referensi:</div>
                <div className="text-blue-700 dark:text-blue-300 font-mono">
                  {selectedPoint[0].toFixed(6)}, {selectedPoint[1].toFixed(6)}
                </div>
              </div>
            )}

            <Button className="w-full" onClick={handleProximityAnalysis}>
              Cari Laporan Terdekat
            </Button>

            {proximityResults.length > 0 && (
              <div className="border rounded p-2 max-h-48 overflow-y-auto">
                <div className="text-xs font-semibold mb-2">Hasil ({proximityResults.length}):</div>
                <div className="space-y-1">
                  {proximityResults.slice(0, 10).map(r => (
                    <div key={r.id} className="text-xs flex justify-between">
                      <span className="truncate">{r.id}</span>
                      <span className="font-mono text-muted-foreground">{r.distance.toFixed(2)} km</span>
                    </div>
                  ))}
                  {proximityResults.length > 10 && (
                    <div className="text-xs text-muted-foreground">
                      +{proximityResults.length - 10} lainnya
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="text-xs text-muted-foreground">
              Klik pada peta untuk memilih titik referensi
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
