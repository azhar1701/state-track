/**
 * Draw & Measure Tools Component
 * Provides drawing and measurement capabilities on the map
 */

import { useEffect, useState, useCallback } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import * as turf from '@turf/turf';
import { Button } from '@/components/ui/button';
import { Pencil, Ruler, Square, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';

export interface DrawMeasureToolsProps {
  onPolygonDrawn?: (polygon: L.Polygon) => void;
  onMeasurement?: (measurement: { distance?: number; area?: number }) => void;
}

export function DrawMeasureTools({ onPolygonDrawn, onMeasurement }: DrawMeasureToolsProps) {
  const map = useMap();
  const [mode, setMode] = useState<'none' | 'polygon' | 'measure' | 'area'>('none');
  const [drawnItems, setDrawnItems] = useState<L.Layer[]>([]);
  const [measurePoints, setMeasurePoints] = useState<L.LatLng[]>([]);
  const [measureLine, setMeasureLine] = useState<L.Polyline | null>(null);
  const [measureMarkers, setMeasureMarkers] = useState<Array<L.Marker | L.CircleMarker>>([]);

  const clearTemporary = useCallback(() => {
    if (!map) return;
    if (measureLine) {
      map.removeLayer(measureLine);
      setMeasureLine(null);
    }
    measureMarkers.forEach(m => map.removeLayer(m));
    setMeasureMarkers([]);
    setMeasurePoints([]);
  }, [map, measureLine, measureMarkers]);

  const finishDrawing = useCallback(() => {
    if (measurePoints.length < 3) {
      toast.error('Minimal 3 titik untuk membuat polygon');
      return;
    }

    // Calculate area
    const coords = measurePoints.map(ll => [ll.lng, ll.lat] as [number, number]);
    coords.push(coords[0]); // Close polygon
    const polygon = turf.polygon([coords]);
    const area = turf.area(polygon) / 1000000; // Convert to km²

    // Create final polygon
    const finalPolygon = L.polygon(measurePoints, {
      color: mode === 'polygon' ? '#3b82f6' : '#f59e0b',
      weight: 2,
      fillOpacity: 0.3,
    }).addTo(map);

    // Add area label
    const center = finalPolygon.getBounds().getCenter();
    const label = L.tooltip({
      permanent: true,
      direction: 'center',
      className: 'measure-label',
    })
      .setLatLng(center)
      .setContent(`${area.toFixed(3)} km²`)
      .addTo(map);

    setDrawnItems(prev => [...prev, finalPolygon, label]);

    if (mode === 'polygon') {
      onPolygonDrawn?.(finalPolygon);
    } else {
      onMeasurement?.({ area });
    }

    // Clean up temporary items
    clearTemporary();
    setMode('none');
    toast.success(mode === 'polygon' ? 'Polygon berhasil digambar' : `Luas area: ${area.toFixed(3)} km²`);
  }, [map, measurePoints, mode, onPolygonDrawn, onMeasurement, clearTemporary]);

  const handlePolygonClick = useCallback((e: L.LeafletMouseEvent) => {
    const newPoints = [...measurePoints, e.latlng];
    setMeasurePoints(newPoints);

    // Add marker
    const marker = L.circleMarker(e.latlng, {
      radius: 5,
      color: '#3b82f6',
      fillColor: '#3b82f6',
      fillOpacity: 0.8,
    }).addTo(map);
    setMeasureMarkers(prev => [...prev, marker]);

    // Update line
    if (newPoints.length > 1) {
      if (measureLine) {
        measureLine.setLatLngs(newPoints);
      } else {
        const line = L.polyline(newPoints, {
          color: '#3b82f6',
          weight: 2,
          dashArray: '5, 5',
        }).addTo(map);
        setMeasureLine(line);
      }
    }
  }, [map, measurePoints, measureLine]);

  const handleMeasureClick = useCallback((e: L.LeafletMouseEvent) => {
    const newPoints = [...measurePoints, e.latlng];
    setMeasurePoints(newPoints);

    // Add marker with label
    const marker = L.circleMarker(e.latlng, {
      radius: 5,
      color: '#10b981',
      fillColor: '#10b981',
      fillOpacity: 0.8,
    }).addTo(map);
    setMeasureMarkers(prev => [...prev, marker]);

    if (newPoints.length > 1) {
      // Calculate distance
      const coords = newPoints.map(ll => [ll.lng, ll.lat] as [number, number]);
      const line = turf.lineString(coords);
      const distance = turf.length(line, { units: 'kilometers' });

      // Update or create line
      if (measureLine) {
        measureLine.setLatLngs(newPoints);
      } else {
        const line = L.polyline(newPoints, {
          color: '#10b981',
          weight: 3,
        }).addTo(map);
        setMeasureLine(line);
      }

      // Show distance label
      const midpoint = newPoints[Math.floor(newPoints.length / 2)];
      const label = L.tooltip({
        permanent: true,
        direction: 'center',
        className: 'measure-label',
      })
        .setLatLng(midpoint)
        .setContent(`${distance.toFixed(2)} km`)
        .addTo(map);

      setDrawnItems(prev => [...prev, label]);
      onMeasurement?.({ distance });
    }
  }, [map, measurePoints, measureLine, onMeasurement]);

  const handleAreaClick = useCallback((e: L.LeafletMouseEvent) => {
    const newPoints = [...measurePoints, e.latlng];
    setMeasurePoints(newPoints);

    // Add marker
    const marker = L.circleMarker(e.latlng, {
      radius: 5,
      color: '#f59e0b',
      fillColor: '#f59e0b',
      fillOpacity: 0.8,
    }).addTo(map);
    setMeasureMarkers(prev => [...prev, marker]);

    // Update polygon preview
    if (newPoints.length > 2) {
      if (measureLine) {
        map.removeLayer(measureLine);
      }
      const polygon = L.polygon(newPoints, {
        color: '#f59e0b',
        weight: 2,
        fillOpacity: 0.2,
      }).addTo(map);
      setMeasureLine(polygon as unknown as L.Polyline);
    }
  }, [map, measurePoints, measureLine]);

  useEffect(() => {
    if (!map) return;

    const handleClick = (e: L.LeafletMouseEvent) => {
      if (mode === 'polygon') {
        handlePolygonClick(e);
      } else if (mode === 'measure') {
        handleMeasureClick(e);
      } else if (mode === 'area') {
        handleAreaClick(e);
      }
    };

    const handleDblClick = (e: L.LeafletMouseEvent) => {
      e.originalEvent.preventDefault();
      if (mode === 'polygon' || mode === 'area') {
        finishDrawing();
      }
    };

    map.on('click', handleClick);
    map.on('dblclick', handleDblClick);

    return () => {
      map.off('click', handleClick);
      map.off('dblclick', handleDblClick);
    };
  }, [map, mode, handlePolygonClick, handleMeasureClick, handleAreaClick, finishDrawing]);

  const clearAll = () => {
    clearTemporary();
    drawnItems.forEach(item => map.removeLayer(item));
    setDrawnItems([]);
    setMode('none');
    toast.success('Semua gambar dihapus');
  };

  const cancelDrawing = () => {
    clearTemporary();
    setMode('none');
  };

  return (
    <div className="absolute top-24 right-4 z-[1200] w-64 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl">
      <div className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold">Alat Gambar & Ukur</div>
        </div>
        
        <Button
          size="sm"
          variant={mode === 'polygon' ? 'default' : 'outline'}
          className="w-full justify-start"
          onClick={() => {
            if (mode === 'polygon') {
              cancelDrawing();
            } else {
              clearTemporary();
              setMode('polygon');
              toast.info('Klik pada peta untuk menggambar polygon. Klik ganda untuk selesai.');
            }
          }}
        >
          <Square className="w-4 h-4 mr-2" />
          {mode === 'polygon' ? 'Batal' : 'Gambar Polygon'}
        </Button>

        <Button
          size="sm"
          variant={mode === 'measure' ? 'default' : 'outline'}
          className="w-full justify-start"
          onClick={() => {
            if (mode === 'measure') {
              cancelDrawing();
            } else {
              clearTemporary();
              setMode('measure');
              toast.info('Klik pada peta untuk mengukur jarak');
            }
          }}
        >
          <Ruler className="w-4 h-4 mr-2" />
          {mode === 'measure' ? 'Batal' : 'Ukur Jarak'}
        </Button>

        <Button
          size="sm"
          variant={mode === 'area' ? 'default' : 'outline'}
          className="w-full justify-start"
          onClick={() => {
            if (mode === 'area') {
              cancelDrawing();
            } else {
              clearTemporary();
              setMode('area');
              toast.info('Klik pada peta untuk mengukur luas. Klik ganda untuk selesai.');
            }
          }}
        >
          <Pencil className="w-4 h-4 mr-2" />
          {mode === 'area' ? 'Batal' : 'Ukur Luas'}
        </Button>

        {(drawnItems.length > 0 || mode !== 'none') && (
          <>
            <div className="border-t pt-2">
              <Button
                size="sm"
                variant="destructive"
                className="w-full justify-start"
                onClick={clearAll}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Hapus Semua
              </Button>
            </div>
          </>
        )}
      </div>

      {mode !== 'none' && (
        <div className="bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-xs">
          <div className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
            {mode === 'polygon' && 'Menggambar Polygon'}
            {mode === 'measure' && 'Mengukur Jarak'}
            {mode === 'area' && 'Mengukur Luas'}
          </div>
          <div className="text-blue-700 dark:text-blue-300">
            {measurePoints.length} titik dipilih
          </div>
          {mode !== 'measure' && measurePoints.length >= 3 && (
            <Button
              size="sm"
              className="w-full mt-2"
              onClick={finishDrawing}
            >
              Selesai
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
