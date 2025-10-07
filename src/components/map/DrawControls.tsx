import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-draw';
import 'leaflet-draw/dist/leaflet.draw.css';
import * as turf from '@turf/turf';
import { toast } from 'sonner';

interface DrawControlsProps {
  onPolygonCreated?: (polygon: L.Polygon, area: number, perimeter: number) => void;
  onPolygonEdited?: (polygon: L.Polygon, area: number, perimeter: number) => void;
  onPolygonDeleted?: () => void;
}

export const DrawControls = ({ onPolygonCreated, onPolygonEdited, onPolygonDeleted }: DrawControlsProps) => {
  const map = useMap();

  useEffect(() => {
    const drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);

    const drawControl = new L.Control.Draw({
      position: 'topleft',
      draw: {
        polygon: {
          allowIntersection: false,
          showArea: true,
          shapeOptions: {
            color: '#3b82f6',
            weight: 2,
            fillOpacity: 0.2,
          },
        },
        polyline: false,
        rectangle: {
          shapeOptions: {
            color: '#3b82f6',
            weight: 2,
            fillOpacity: 0.2,
          },
        },
        circle: false,
        circlemarker: false,
        marker: false,
      },
      edit: {
        featureGroup: drawnItems,
        remove: true,
      },
    });

    map.addControl(drawControl);

    const calculateMetrics = (layer: L.Polygon | L.Rectangle) => {
      const latlngs = layer.getLatLngs()[0] as L.LatLng[];
      const coordinates = latlngs.map((ll) => [ll.lng, ll.lat]);
      coordinates.push(coordinates[0]);

      const turfPolygon = turf.polygon([coordinates]);
      const area = turf.area(turfPolygon);
      const length = turf.length(turfPolygon, { units: 'kilometers' });

      return { area, perimeter: length * 1000 };
    };

    map.on(L.Draw.Event.CREATED, (e: any) => {
      const layer = e.layer as L.Polygon;
      drawnItems.addLayer(layer);

      const { area, perimeter } = calculateMetrics(layer);

      toast.success('Polygon dibuat', {
        description: `Luas: ${(area / 10000).toFixed(2)} ha, Keliling: ${perimeter.toFixed(0)} m`,
      });

      onPolygonCreated?.(layer, area, perimeter);
    });

    map.on(L.Draw.Event.EDITED, (e: any) => {
      const layers = e.layers;
      layers.eachLayer((layer: L.Polygon) => {
        const { area, perimeter } = calculateMetrics(layer);

        toast.success('Polygon diedit', {
          description: `Luas: ${(area / 10000).toFixed(2)} ha, Keliling: ${perimeter.toFixed(0)} m`,
        });

        onPolygonEdited?.(layer, area, perimeter);
      });
    });

    map.on(L.Draw.Event.DELETED, () => {
      toast.info('Polygon dihapus');
      onPolygonDeleted?.();
    });

    return () => {
      map.removeControl(drawControl);
      map.removeLayer(drawnItems);
      map.off(L.Draw.Event.CREATED);
      map.off(L.Draw.Event.EDITED);
      map.off(L.Draw.Event.DELETED);
    };
  }, [map, onPolygonCreated, onPolygonEdited, onPolygonDeleted]);

  return null;
};
