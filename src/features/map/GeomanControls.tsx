import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import '@geoman-io/leaflet-geoman-free';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';
import * as turf from '@turf/turf';
import { toast } from 'sonner';

interface GeomanControlsProps {
  enabled: boolean;
  onPolygonDrawn?: (polygon: L.Polygon) => void;
  onDrawModeChange?: (mode: string | null) => void;
}

export function GeomanControls({ enabled, onPolygonDrawn, onDrawModeChange }: GeomanControlsProps) {
  const map = useMap();
  const pmRef = useRef<unknown>(null);
  const onPolygonDrawnRef = useRef(onPolygonDrawn);
  const onDrawModeChangeRef = useRef(onDrawModeChange);

  useEffect(() => {
    onPolygonDrawnRef.current = onPolygonDrawn;
    onDrawModeChangeRef.current = onDrawModeChange;
  }, [onPolygonDrawn, onDrawModeChange]);

  useEffect(() => {
    if (!map) return;

    // editTimeout removed

    if (enabled) {
      pmRef.current = map.pm;

      map.pm.setLang('id', {
        tooltips: {
          placeMarker: 'Klik untuk menempatkan marker',
          firstVertex: 'Klik untuk menempatkan titik pertama',
          continueLine: 'Klik untuk melanjutkan menggambar',
          finishLine: 'Klik titik terakhir untuk selesai',
          finishPoly: 'Klik titik pertama untuk menutup polygon',
          finishRect: 'Klik untuk selesai',
          startCircle: 'Klik untuk menempatkan pusat lingkaran',
          finishCircle: 'Klik untuk selesai lingkaran',
        },
        actions: {
          finish: 'Selesai',
          cancel: 'Batal',
          removeLastVertex: 'Hapus titik terakhir',
        },
      });

      map.pm.setLang('id');

      map.on('pm:create', (e) => {
        const layer = e.layer;

        if (layer instanceof L.Polygon) {
          const latlngs = layer.getLatLngs()[0] as L.LatLng[];
          const coords = latlngs.map(ll => [ll.lng, ll.lat] as [number, number]);
          coords.push(coords[0]);
          const polygon = turf.polygon([coords]);
          const area = turf.area(polygon) / 1000000;
          const perimeter = turf.length(turf.polygonToLine(polygon), { units: 'kilometers' });

          layer.bindTooltip(
            `<div class="text-xs"><div class="font-bold">Luas: ${area.toFixed(3)} km²</div><div>Keliling: ${perimeter.toFixed(2)} km</div></div>`,
            { permanent: true, direction: 'center' }
          );

          onPolygonDrawnRef.current?.(layer);
          toast.success(`Polygon dibuat: ${area.toFixed(3)} km²`);
        } else if (layer instanceof L.Polyline && !(layer instanceof L.Polygon)) {
          const latlngs = layer.getLatLngs() as L.LatLng[];
          const coords = latlngs.map(ll => [ll.lng, ll.lat] as [number, number]);
          const line = turf.lineString(coords);
          const distance = turf.length(line, { units: 'kilometers' });


          layer.bindTooltip(
            `<div class="text-xs font-bold">Jarak: ${distance.toFixed(2)} km</div>`,
            { permanent: true, direction: 'center' }
          );

          toast.success(`Garis dibuat: ${distance.toFixed(2)} km`);
        } else if (layer instanceof L.Circle) {
          const radius = layer.getRadius() / 1000;
          const area = Math.PI * Math.pow(radius, 2);

          layer.bindTooltip(
            `<div class="text-xs"><div class="font-bold">Radius: ${radius.toFixed(2)} km</div><div>Luas: ${area.toFixed(3)} km²</div></div>`,
            { permanent: true, direction: 'center' }
          );

          toast.success(`Lingkaran dibuat: ${area.toFixed(3)} km²`);
        }

        onDrawModeChangeRef.current?.(null);
      });

      map.on('pm:remove', () => {
        toast.info('Layer dihapus');
      });

      map.on('pm:drawstart', ({ shape }) => {
        onDrawModeChangeRef.current?.(shape);
      });

      map.on('pm:drawend', () => {
        onDrawModeChangeRef.current?.(null);
      });

      map.on('pm:globalremovalon', () => {
        toast.info('Mode hapus aktif');
      });

      map.on('pm:globalremovaloff', () => {
        toast.info('Mode hapus nonaktif');
      });

    } else {
      if (map.pm) {
        map.pm.disableDraw();
        if (map.pm.globalRemovalModeEnabled()) {
          map.pm.disableGlobalRemovalMode();
        }
      }
    }

    return () => {
      if (map && map.pm) {
        try {
          map.off('pm:create');
          map.off('pm:remove');
          map.off('pm:drawstart');
          map.off('pm:drawend');
          map.off('pm:globalremovalon');
          map.off('pm:globalremovaloff');
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    };
  }, [map, enabled]);

  return null;
}
