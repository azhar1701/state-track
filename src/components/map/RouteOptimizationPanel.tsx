/**
 * Route Optimization Panel Component
 * UI for route planning and optimization
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Route, Navigation, Clock, MapPin, X, Zap } from 'lucide-react';
import { toast } from 'sonner';
import {
  optimizeRoute,
  improve2Opt,
  generateDirections,
  estimateTime,
  type RoutePoint,
  type OptimizedRoute,
} from '@/lib/routeOptimization';

interface RouteOptimizationPanelProps {
  reports: Array<{
    id: string;
    title: string;
    coords: [number, number];
    category: string;
    status: string;
    severity?: 'ringan' | 'sedang' | 'berat';
  }>;
  onRouteGenerated?: (route: OptimizedRoute) => void;
  onClose: () => void;
}

export function RouteOptimizationPanel({
  reports,
  onRouteGenerated,
  onClose,
}: RouteOptimizationPanelProps) {
  const [selectedReports, setSelectedReports] = useState<Set<string>>(new Set());
  const [optimizedRoute, setOptimizedRoute] = useState<OptimizedRoute | null>(null);
  const [use2Opt, setUse2Opt] = useState(true);
  const [prioritizeSeverity, setPrioritizeSeverity] = useState(true);
  const [directions, setDirections] = useState<string[]>([]);

  const toggleReport = (id: string) => {
    setSelectedReports(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedReports(new Set(reports.map(r => r.id)));
  };

  const clearSelection = () => {
    setSelectedReports(new Set());
  };

  const handleOptimize = () => {
    if (selectedReports.size < 2) {
      toast.error('Pilih minimal 2 laporan untuk optimasi rute');
      return;
    }

    const selectedData = reports.filter(r => selectedReports.has(r.id));
    
    const routePoints: RoutePoint[] = selectedData.map(r => ({
      id: r.id,
      coords: r.coords,
      priority: prioritizeSeverity ? getSeverityPriority(r.severity) : undefined,
      category: r.category,
    }));

    let route = optimizeRoute(routePoints);

    if (use2Opt) {
      route = improve2Opt(route, 100);
    }

    setOptimizedRoute(route);
    const dirs = generateDirections(route);
    setDirections(dirs);
    onRouteGenerated?.(route);

    const time = estimateTime(route.totalDistance);
    toast.success('Rute berhasil dioptimasi', {
      description: `Jarak: ${route.totalDistance.toFixed(2)} km, Estimasi: ${time.hours}j ${time.minutes}m`,
    });
  };

  return (
    <div className="absolute top-24 right-4 z-[1200] w-96 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl max-h-[calc(100vh-140px)] overflow-hidden flex flex-col">
      <div className="flex items-center justify-between p-3 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <Route className="w-4 h-4" />
          <h3 className="font-semibold text-sm">Optimasi Rute</h3>
        </div>
        <Button size="sm" variant="ghost" onClick={onClose} className="h-7 w-7 p-0">
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        {!optimizedRoute ? (
          <>
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">
                  Pilih Laporan ({selectedReports.size}/{reports.length})
                </Label>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={selectAll}>
                    Pilih Semua
                  </Button>
                  {selectedReports.size > 0 && (
                    <Button size="sm" variant="ghost" onClick={clearSelection}>
                      Bersihkan
                    </Button>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Prioritaskan Keparahan</Label>
                  <Switch checked={prioritizeSeverity} onCheckedChange={setPrioritizeSeverity} />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Gunakan 2-Opt Improvement</Label>
                  <Switch checked={use2Opt} onCheckedChange={setUse2Opt} />
                </div>
              </div>

              <Button className="w-full" onClick={handleOptimize} disabled={selectedReports.size < 2}>
                <Zap className="w-4 h-4 mr-2" />
                Optimasi Rute
              </Button>
            </div>

            <ScrollArea className="flex-1 px-4 pb-4">
              <div className="space-y-2">
                {reports.map(report => (
                  <div
                    key={report.id}
                    className={`border rounded p-2 cursor-pointer transition-colors ${
                      selectedReports.has(report.id)
                        ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-300 dark:border-blue-700'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                    onClick={() => toggleReport(report.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="text-sm font-medium truncate">{report.title}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {report.category} • {report.status}
                          {report.severity && ` • ${report.severity}`}
                        </div>
                      </div>
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                        selectedReports.has(report.id)
                          ? 'bg-blue-500 border-blue-500'
                          : 'border-gray-300'
                      }`}>
                        {selectedReports.has(report.id) && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </>
        ) : (
          <>
            <div className="p-4 space-y-4">
              <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Navigation className="w-4 h-4 text-green-600 dark:text-green-400" />
                  <div className="font-semibold text-green-900 dark:text-green-100">Rute Optimal</div>
                </div>
                <div className="space-y-1 text-xs text-green-700 dark:text-green-300">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3 h-3" />
                    <span>{optimizedRoute.points.length} titik</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Route className="w-3 h-3" />
                    <span>{optimizedRoute.totalDistance.toFixed(2)} km</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-3 h-3" />
                    <span>
                      {(() => {
                        const time = estimateTime(optimizedRoute.totalDistance);
                        return `${time.hours}j ${time.minutes}m`;
                      })()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setOptimizedRoute(null);
                    setDirections([]);
                  }}
                >
                  Buat Rute Baru
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    const text = directions.join('\n');
                    navigator.clipboard.writeText(text);
                    toast.success('Petunjuk arah disalin ke clipboard');
                  }}
                >
                  Salin Petunjuk
                </Button>
              </div>
            </div>

            <ScrollArea className="flex-1 px-4 pb-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Petunjuk Arah:</Label>
                {directions.map((dir, idx) => (
                  <div key={idx} className="text-xs bg-gray-50 dark:bg-gray-800 rounded p-2">
                    {dir}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </>
        )}
      </div>

      <div className="p-4 border-t text-xs text-muted-foreground">
        <div className="font-semibold mb-1">Algoritma:</div>
        <div>Greedy Nearest Neighbor + 2-Opt Improvement</div>
        <div className="mt-2">Kecepatan rata-rata: 40 km/jam</div>
      </div>
    </div>
  );
}

function getSeverityPriority(severity?: 'ringan' | 'sedang' | 'berat'): number {
  if (severity === 'berat') return 5;
  if (severity === 'sedang') return 3;
  if (severity === 'ringan') return 1;
  return 2;
}
