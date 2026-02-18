/**
 * Multi-Layer Heatmap Component
 * Category-based heatmaps with individual toggles
 */

import { useEffect, useState } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Flame } from 'lucide-react';

export interface HeatmapPoint {
  coords: [number, number];
  category: string;
  severity?: 'ringan' | 'sedang' | 'berat';
}

interface MultiLayerHeatmapProps {
  points: HeatmapPoint[];
  enabled: boolean;
  categories: string[];
}

const CATEGORY_COLORS: Record<string, string> = {
  jalan: '#3b82f6',
  jembatan: '#8b5cf6',
  irigasi: '#10b981',
  drainase: '#06b6d4',
  sungai: '#0ea5e9',
  lainnya: '#6b7280',
};

export function MultiLayerHeatmap({ points, enabled, categories }: MultiLayerHeatmapProps) {
  const map = useMap();
  const [heatLayers, setHeatLayers] = useState<Map<string, L.Layer>>(new Map());
  const [activeCategories, setActiveCategories] = useState<Set<string>>(new Set(categories));
  const [radius, setRadius] = useState(25);
  const [blur, setBlur] = useState(15);
  const [maxIntensity, setMaxIntensity] = useState(1.0);
  const [showControls, setShowControls] = useState(false);

  useEffect(() => {
    if (!map || !enabled) {
      // Remove all layers
      heatLayers.forEach(layer => map?.removeLayer(layer));
      setHeatLayers(new Map());
      return;
    }

    // Group points by category
    const categoryPoints = new Map<string, [number, number, number][]>();
    
    points.forEach(point => {
      if (!activeCategories.has(point.category)) return;
      
      const existing = categoryPoints.get(point.category) || [];
      
      // Weight by severity
      let weight = 0.5;
      if (point.severity === 'sedang') weight = 0.75;
      if (point.severity === 'berat') weight = 1.0;
      
      existing.push([point.coords[0], point.coords[1], weight]);
      categoryPoints.set(point.category, existing);
    });

    // Remove old layers
    heatLayers.forEach((layer, cat) => {
      if (!categoryPoints.has(cat)) {
        map.removeLayer(layer);
      }
    });

    const newLayers = new Map<string, L.Layer>();

    // Create/update heatmap for each category
    categoryPoints.forEach((pts, category) => {
      const existingLayer = heatLayers.get(category);
      
      if (existingLayer) {
        map.removeLayer(existingLayer);
      }

      const gradient = getCategoryGradient(category);
      
      const heatLayer = (L as typeof L & { heatLayer: (points: [number, number, number][], options: Record<string, unknown>) => L.Layer }).heatLayer(pts, {
        radius,
        blur,
        maxZoom: 17,
        max: maxIntensity,
        minOpacity: 0.2,
        gradient,
      }) as L.Layer;

      heatLayer.addTo(map);
      newLayers.set(category, heatLayer);
    });

    setHeatLayers(newLayers);

    return () => {
      newLayers.forEach(layer => map.removeLayer(layer));
    };
  }, [map, points, enabled, activeCategories, radius, blur, maxIntensity, heatLayers]);

  const toggleCategory = (category: string) => {
    setActiveCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (activeCategories.size === categories.length) {
      setActiveCategories(new Set());
    } else {
      setActiveCategories(new Set(categories));
    }
  };

  if (!enabled) return null;

  return (
    <>
      <div className="absolute top-4 left-4 z-[1000]">
        <Button
          size="sm"
          variant="outline"
          className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-lg"
          onClick={() => setShowControls(!showControls)}
        >
          <Flame className="w-4 h-4 mr-2" />
          Heatmap Controls
        </Button>
      </div>

      {showControls && (
        <div className="absolute top-16 left-4 z-[1000] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border rounded-lg shadow-xl p-4 w-80 max-h-[calc(100vh-120px)] overflow-y-auto">
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-sm">Layer Kategori</h3>
                <Button size="sm" variant="ghost" onClick={toggleAll}>
                  {activeCategories.size === categories.length ? 'Nonaktifkan Semua' : 'Aktifkan Semua'}
                </Button>
              </div>
              
              <div className="space-y-2">
                {categories.map(cat => (
                  <div key={cat} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: CATEGORY_COLORS[cat] || '#6b7280' }}
                      />
                      <Label className="text-sm capitalize">{cat}</Label>
                    </div>
                    <Switch
                      checked={activeCategories.has(cat)}
                      onCheckedChange={() => toggleCategory(cat)}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t pt-4 space-y-3">
              <div>
                <Label className="text-xs">Radius: {radius}px</Label>
                <Slider
                  value={[radius]}
                  onValueChange={([v]) => setRadius(v)}
                  min={10}
                  max={50}
                  step={5}
                  className="mt-2"
                />
              </div>

              <div>
                <Label className="text-xs">Blur: {blur}px</Label>
                <Slider
                  value={[blur]}
                  onValueChange={([v]) => setBlur(v)}
                  min={5}
                  max={30}
                  step={5}
                  className="mt-2"
                />
              </div>

              <div>
                <Label className="text-xs">Intensitas Maksimal: {maxIntensity.toFixed(1)}</Label>
                <Slider
                  value={[maxIntensity * 10]}
                  onValueChange={([v]) => setMaxIntensity(v / 10)}
                  min={5}
                  max={20}
                  step={1}
                  className="mt-2"
                />
              </div>
            </div>

            <div className="border-t pt-3">
              <div className="text-xs text-muted-foreground">
                <div className="font-semibold mb-1">Legenda Intensitas:</div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-4 rounded" style={{
                    background: 'linear-gradient(to right, rgba(0,0,255,0.2), rgba(0,255,0,0.5), rgba(255,255,0,0.7), rgba(255,0,0,1))'
                  }} />
                </div>
                <div className="flex justify-between mt-1">
                  <span>Rendah</span>
                  <span>Tinggi</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function getCategoryGradient(category: string): Record<number, string> {
  const baseColor = CATEGORY_COLORS[category] || '#6b7280';
  
  // Convert hex to RGB
  const hex = baseColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  return {
    0.0: `rgba(${r}, ${g}, ${b}, 0)`,
    0.2: `rgba(${r}, ${g}, ${b}, 0.2)`,
    0.4: `rgba(${r}, ${g}, ${b}, 0.4)`,
    0.6: `rgba(${r}, ${g}, ${b}, 0.6)`,
    0.8: `rgba(${r}, ${g}, ${b}, 0.8)`,
    1.0: `rgba(${r}, ${g}, ${b}, 1)`,
  };
}
