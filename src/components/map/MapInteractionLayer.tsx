import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import * as turf from '@turf/turf';
import { toast } from 'sonner';

interface MapInteractionLayerProps {
  activeMapTool: 'draw' | 'measure' | null;
  onPolygonDrawn?: (polygon: L.Polygon) => void;
  onMeasurement?: (measurement: { distance?: number; area?: number }) => void;
}

export function MapInteractionLayer({ activeMapTool, onPolygonDrawn, onMeasurement }: MapInteractionLayerProps) {
  const map = useMap();
  const measurePointsRef = useRef<L.LatLng[]>([]);
  const measureLineRef = useRef<L.Polyline | null>(null);
  const hoverLineRef = useRef<L.Polyline | null>(null);
  const measureMarkersRef = useRef<Array<L.Marker | L.CircleMarker>>([]);
  const drawnItemsRef = useRef<L.Layer[]>([]);

  const onPolygonDrawnRef = useRef(onPolygonDrawn);
  const onMeasurementRef = useRef(onMeasurement);
  
  useEffect(() => {
    onPolygonDrawnRef.current = onPolygonDrawn;
    onMeasurementRef.current = onMeasurement;
  }, [onPolygonDrawn, onMeasurement]);

  useEffect(() => {
    if (!activeMapTool) {
      if (measureLineRef.current) map.removeLayer(measureLineRef.current);
      if (hoverLineRef.current) map.removeLayer(hoverLineRef.current);
      measureMarkersRef.current.forEach(m => map.removeLayer(m));
      measureLineRef.current = null;
      hoverLineRef.current = null;
      measureMarkersRef.current = [];
      measurePointsRef.current = [];
      return;
    }

    const handleClick = (e: L.LeafletMouseEvent) => {
      const newPoints = [...measurePointsRef.current, e.latlng];
      measurePointsRef.current = newPoints;

      const marker = L.circleMarker(e.latlng, {
        radius: 6,
        color: '#fff',
        weight: 2,
        fillColor: activeMapTool === 'draw' ? '#3b82f6' : '#10b981',
        fillOpacity: 1,
      }).addTo(map);
      
      marker.bindTooltip(`Titik ${newPoints.length}`, { permanent: false, direction: 'top' });
      measureMarkersRef.current.push(marker);

      if (newPoints.length > 1) {
        if (activeMapTool === 'measure') {
          const coords = newPoints.map(ll => [ll.lng, ll.lat] as [number, number]);
          const line = turf.lineString(coords);
          const distance = turf.length(line, { units: 'kilometers' });

          if (measureLineRef.current) {
            measureLineRef.current.setLatLngs(newPoints);
          } else {
            measureLineRef.current = L.polyline(newPoints, { color: '#10b981', weight: 3, opacity: 0.8 }).addTo(map);
          }

          const lastIdx = newPoints.length - 1;
          const segmentCoords = [newPoints[lastIdx - 1], newPoints[lastIdx]].map(ll => [ll.lng, ll.lat] as [number, number]);
          const segmentLine = turf.lineString(segmentCoords);
          const segmentDist = turf.length(segmentLine, { units: 'kilometers' });
          
          const midpoint = L.latLng(
            (newPoints[lastIdx - 1].lat + newPoints[lastIdx].lat) / 2,
            (newPoints[lastIdx - 1].lng + newPoints[lastIdx].lng) / 2
          );
          
          const label = L.tooltip({ 
            permanent: true, 
            direction: 'center', 
            className: 'bg-green-600 text-white px-2 py-1 rounded text-xs font-semibold border-0',
            opacity: 0.9
          })
            .setLatLng(midpoint)
            .setContent(`${segmentDist.toFixed(2)} km`)
            .addTo(map);
          drawnItemsRef.current.push(label);
          
          if (newPoints.length > 2) {
            const totalLabel = L.tooltip({ 
              permanent: true, 
              direction: 'top', 
              className: 'bg-green-700 text-white px-3 py-1.5 rounded-lg text-sm font-bold border-2 border-white',
              opacity: 1
            })
              .setLatLng(newPoints[lastIdx])
              .setContent(`Total: ${distance.toFixed(2)} km`)
              .addTo(map);
            drawnItemsRef.current.push(totalLabel);
          }
          
          onMeasurementRef.current?.({ distance });
        } else if (activeMapTool === 'draw') {
          if (measureLineRef.current) {
            measureLineRef.current.setLatLngs(newPoints);
          } else {
            measureLineRef.current = L.polyline(newPoints, { color: '#3b82f6', weight: 2, dashArray: '5, 5', opacity: 0.7 }).addTo(map);
          }
        }
      }
    };

    const handleMouseMove = (e: L.LeafletMouseEvent) => {
      if (measurePointsRef.current.length === 0) return;
      
      const previewPoints = [...measurePointsRef.current, e.latlng];
      
      if (hoverLineRef.current) map.removeLayer(hoverLineRef.current);
      
      hoverLineRef.current = L.polyline(previewPoints, {
        color: activeMapTool === 'draw' ? '#3b82f6' : '#10b981',
        weight: 2,
        dashArray: '5, 5',
        opacity: 0.5
      }).addTo(map);
    };

    const handleDblClick = (e: L.LeafletMouseEvent) => {
      e.originalEvent.preventDefault();
      if (activeMapTool === 'draw' && measurePointsRef.current.length >= 3) {
        const coords = measurePointsRef.current.map(ll => [ll.lng, ll.lat] as [number, number]);
        coords.push(coords[0]);
        const polygon = turf.polygon([coords]);
        const area = turf.area(polygon) / 1000000;
        const perimeter = turf.length(turf.polygonToLine(polygon), { units: 'kilometers' });

        const finalPolygon = L.polygon(measurePointsRef.current, {
          color: '#3b82f6',
          weight: 2,
          fillOpacity: 0.2,
        }).addTo(map);

        const center = finalPolygon.getBounds().getCenter();
        const label = L.tooltip({ 
          permanent: true, 
          direction: 'center', 
          className: 'bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-bold border-2 border-white',
          opacity: 1
        })
          .setLatLng(center)
          .setContent(`<div class="text-center"><div>Luas: ${area.toFixed(3)} km²</div><div class="text-xs mt-1">Keliling: ${perimeter.toFixed(2)} km</div></div>`)
          .addTo(map);

        drawnItemsRef.current.push(finalPolygon, label);
        onPolygonDrawnRef.current?.(finalPolygon);

        if (measureLineRef.current) map.removeLayer(measureLineRef.current);
        if (hoverLineRef.current) map.removeLayer(hoverLineRef.current);
        measureMarkersRef.current.forEach(m => map.removeLayer(m));
        measureLineRef.current = null;
        hoverLineRef.current = null;
        measureMarkersRef.current = [];
        measurePointsRef.current = [];

        toast.success(`Polygon selesai: ${area.toFixed(3)} km²`);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (measureLineRef.current) map.removeLayer(measureLineRef.current);
        if (hoverLineRef.current) map.removeLayer(hoverLineRef.current);
        measureMarkersRef.current.forEach(m => map.removeLayer(m));
        measureLineRef.current = null;
        hoverLineRef.current = null;
        measureMarkersRef.current = [];
        measurePointsRef.current = [];
        toast.info('Drawing dibatalkan');
      } else if ((e.key === 'Backspace' || e.key === 'Delete') && measurePointsRef.current.length > 0) {
        const lastMarker = measureMarkersRef.current[measureMarkersRef.current.length - 1];
        if (lastMarker) map.removeLayer(lastMarker);
        measureMarkersRef.current = measureMarkersRef.current.slice(0, -1);
        
        const newPoints = measurePointsRef.current.slice(0, -1);
        measurePointsRef.current = newPoints;
        
        if (newPoints.length > 1 && measureLineRef.current) {
          measureLineRef.current.setLatLngs(newPoints);
        } else if (measureLineRef.current) {
          map.removeLayer(measureLineRef.current);
          measureLineRef.current = null;
        }
        
        toast.info('Titik terakhir dihapus');
      }
    };

    map.on('click', handleClick);
    map.on('mousemove', handleMouseMove);
    map.on('dblclick', handleDblClick);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      map.off('click', handleClick);
      map.off('mousemove', handleMouseMove);
      map.off('dblclick', handleDblClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [map, activeMapTool]);

  return null;
}
