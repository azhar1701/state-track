import { MapContainer, useMap } from 'react-leaflet';
import L from 'leaflet';
import { BasemapSwitcher } from '../BasemapSwitcher';
import { BasemapType } from '../basemap-config';
import { useEffect } from 'react';
import 'leaflet/dist/leaflet.css';

interface MapCanvasProps {
  children: React.ReactNode;
  basemap: BasemapType;
  center: [number, number];
  zoom: number;
}

// Internal helper to sync map state
const MapController = ({ basemap }: { basemap: BasemapType }) => {
  const map = useMap();
  useEffect(() => {
    // Add any global map logic here
    map.invalidateSize();
  }, [map]);
  return null;
};

export const MapCanvas = ({ children, basemap, center, zoom }: MapCanvasProps) => {
  return (
    <div className="relative w-full h-full overflow-hidden">
      <MapContainer
        center={center}
        zoom={zoom}
        className="w-full h-full z-0"
        zoomControl={false}
        attributionControl={false}
      >
        <MapController basemap={basemap} />
        <BasemapSwitcher current={basemap} />
        {children}
      </MapContainer>
    </div>
  );
};
