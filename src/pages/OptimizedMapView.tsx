import { useState, useEffect, useMemo } from 'react';
import { MapContainer, useMap } from 'react-leaflet';
import { SuperClusterMap } from '@/components/map/SuperClusterMap';
import { VirtualizedReportList } from '@/components/map/VirtualizedReportList';
import { useGeoWorker } from '@/hooks/useGeoWorker';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { List } from 'lucide-react';
import L from 'leaflet';

interface Report {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  severity?: 'ringan' | 'sedang' | 'berat' | null;
  latitude: number;
  longitude: number;
  created_at: string;
  photo_url?: string | null;
}

const createCustomIcon = (category: string, status: string, severity?: Report['severity']) => {
  const colors = { baru: '#f59e0b', diproses: '#3b82f6', selesai: '#10b981' };
  const color = colors[status as keyof typeof colors] || '#6b7280';
  const sevColors = { ringan: '#22c55e', sedang: '#f97316', berat: '#ef4444' };
  const sevBorder = severity ? sevColors[severity] : '#9ca3af';
  const label = status === 'baru' ? 'B' : status === 'diproses' ? 'P' : status === 'selesai' ? 'S' : 'L';

  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        background-color: ${color};
        width: 28px; height: 28px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 2px solid ${sevBorder};
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        display: flex; align-items: center; justify-content: center;">
        <span style="transform: rotate(45deg); font-size: 12px; font-weight:600; color: white;">${label}</span>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -24],
  });
};

const createClusterCustomIcon = (count: number) => {
  const size = count < 10 ? 40 : count < 100 ? 50 : 60;
  
  return L.divIcon({
    html: `
      <div style="
        width: ${size}px; height: ${size}px;
        background: linear-gradient(135deg, hsl(215 70% 50%), hsl(215 70% 60%));
        border: 3px solid white;
        border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        font-weight: 700; color: white;
        font-size: ${count < 100 ? '14px' : '12px'};">
        ${count}
      </div>
    `,
    className: 'custom-cluster-icon',
    iconSize: [size, size],
  });
};

function MapBoundsTracker({ onBoundsChange }: { onBoundsChange: (bounds: L.LatLngBounds, zoom: number) => void }) {
  const map = useMap();
  
  useEffect(() => {
    if (!map) return;
    
    const updateBounds = () => {
      onBoundsChange(map.getBounds(), map.getZoom());
    };
    
    map.on('moveend', updateBounds);
    map.on('zoomend', updateBounds);
    updateBounds();
    
    return () => {
      map.off('moveend', updateBounds);
      map.off('zoomend', updateBounds);
    };
  }, [map, onBoundsChange]);
  
  return null;
}

export default function OptimizedMapView() {
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [mapBounds, setMapBounds] = useState<L.LatLngBounds | null>(null);
  const [mapZoom, setMapZoom] = useState(12);
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  
  const { parseAndReproject, isReady: workerReady } = useGeoWorker();
  
  // Fetch reports
  useEffect(() => {
    // Simulate fetching 5000 reports
    const mockReports: Report[] = Array.from({ length: 5000 }, (_, i) => ({
      id: `report-${i}`,
      title: `Laporan ${i + 1}`,
      description: `Deskripsi laporan nomor ${i + 1}`,
      category: ['irigasi', 'sungai', 'lainnya'][i % 3],
      status: ['baru', 'diproses', 'selesai'][i % 3],
      severity: ['ringan', 'sedang', 'berat'][i % 3] as 'ringan' | 'sedang' | 'berat',
      latitude: -7.325 + (Math.random() - 0.5) * 0.5,
      longitude: 108.353 + (Math.random() - 0.5) * 0.5,
      created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      photo_url: i % 3 === 0 ? 'https://via.placeholder.com/150' : null,
    }));
    
    setReports(mockReports);
  }, []);
  
  // Handle cluster click
  useEffect(() => {
    const handleClusterClick = (e: CustomEvent) => {
      const { center, zoom } = e.detail;
      mapInstance?.flyTo(center, zoom);
    };
    
    window.addEventListener('cluster-click', handleClusterClick as EventListener);
    return () => window.removeEventListener('cluster-click', handleClusterClick as EventListener);
  }, [mapInstance]);
  
  // Load GeoJSON with worker
  useEffect(() => {
    if (!workerReady) return;
    
    const loadBoundaries = async () => {
      try {
        const response = await fetch('/data/ciamis_kecamatan.geojson');
        const rawData = await response.json();
        const processed = await parseAndReproject(rawData);
        console.log('GeoJSON processed in worker:', processed);
      } catch (error) {
        console.error('Failed to load boundaries', error);
      }
    };
    
    loadBoundaries();
  }, [workerReady, parseAndReproject]);
  
  const handleBoundsChange = (bounds: L.LatLngBounds, zoom: number) => {
    setMapBounds(bounds);
    setMapZoom(zoom);
  };
  
  return (
    <div className="h-screen flex flex-col">
      <div className="flex-1 relative">
        <MapContainer
          center={[-7.325, 108.353]}
          zoom={12}
          className="h-full w-full"
          ref={setMapInstance}
        >
          <MapBoundsTracker onBoundsChange={handleBoundsChange} />
          
          {mapBounds && (
            <SuperClusterMap
              reports={reports}
              bounds={mapBounds}
              zoom={mapZoom}
              onMarkerClick={setSelectedReport}
              createIcon={createCustomIcon}
              createClusterIcon={createClusterCustomIcon}
            />
          )}
        </MapContainer>
        
        {/* Floating List Button */}
        <div className="absolute top-4 right-4 z-[1000]">
          <Sheet>
            <SheetTrigger asChild>
              <Button className="glass-btn">
                <List className="w-4 h-4 mr-2" />
                Daftar Laporan ({reports.length})
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-lg">
              <SheetHeader>
                <SheetTitle>Daftar Laporan</SheetTitle>
              </SheetHeader>
              <div className="mt-4">
                <VirtualizedReportList
                  reports={reports}
                  onReportClick={(report) => {
                    setSelectedReport(report);
                    mapInstance?.flyTo([report.latitude, report.longitude], 16);
                  }}
                  height="calc(100vh - 120px)"
                />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </div>
  );
}
