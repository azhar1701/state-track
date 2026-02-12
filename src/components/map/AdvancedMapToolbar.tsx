/**
 * Advanced Map Toolbar Component
 * Integrates all geospatial analysis tools
 */

import { Button } from '@/components/ui/button';
import {
  Activity,
  Route,
  Download,
  Filter,
  Pencil,
  Flame,
  Grid3x3,
  Layers,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface AdvancedMapToolbarProps {
  onOpenSpatialAnalysis: () => void;
  onOpenRouteOptimization: () => void;
  onOpenExport: () => void;
  onOpenSpatialQuery: () => void;
  onOpenDrawTools: () => void;
  onToggleHeatmap: () => void;
  onToggleDensity: () => void;
  onToggleLayers: () => void;
  heatmapActive: boolean;
  densityActive: boolean;
}

export function AdvancedMapToolbar({
  onOpenSpatialAnalysis,
  onOpenRouteOptimization,
  onOpenExport,
  onOpenSpatialQuery,
  onOpenDrawTools,
  onToggleHeatmap,
  onToggleDensity,
  onToggleLayers,
  heatmapActive,
  densityActive,
}: AdvancedMapToolbarProps) {
  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000]">
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border rounded-lg shadow-xl p-2 flex items-center gap-1">
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="h-9 w-9 p-0"
                onClick={onOpenSpatialAnalysis}
              >
                <Activity className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Analisis Spasial</p>
              <p className="text-xs text-muted-foreground">Buffer, Density, Statistics</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="h-9 w-9 p-0"
                onClick={onOpenRouteOptimization}
              >
                <Route className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Optimasi Rute</p>
              <p className="text-xs text-muted-foreground">Rute inspeksi optimal</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="h-9 w-9 p-0"
                onClick={onOpenSpatialQuery}
              >
                <Filter className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Query Spasial</p>
              <p className="text-xs text-muted-foreground">Filter geometrik lanjutan</p>
            </TooltipContent>
          </Tooltip>

          <div className="w-px h-6 bg-border mx-1" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="h-9 w-9 p-0"
                onClick={onOpenDrawTools}
              >
                <Pencil className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Alat Gambar & Ukur</p>
              <p className="text-xs text-muted-foreground">Polygon, jarak, luas</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant={heatmapActive ? 'default' : 'ghost'}
                className="h-9 w-9 p-0"
                onClick={onToggleHeatmap}
              >
                <Flame className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Heatmap Multi-Layer</p>
              <p className="text-xs text-muted-foreground">Per kategori</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant={densityActive ? 'default' : 'ghost'}
                className="h-9 w-9 p-0"
                onClick={onToggleDensity}
              >
                <Grid3x3 className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Analisis Densitas</p>
              <p className="text-xs text-muted-foreground">Hexbin / KDE</p>
            </TooltipContent>
          </Tooltip>

          <div className="w-px h-6 bg-border mx-1" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="h-9 w-9 p-0"
                onClick={onToggleLayers}
              >
                <Layers className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Layer Manager</p>
              <p className="text-xs text-muted-foreground">Toggle layers</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="h-9 w-9 p-0"
                onClick={onOpenExport}
              >
                <Download className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Ekspor Data</p>
              <p className="text-xs text-muted-foreground">GeoJSON, KML, CSV, PNG</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}
