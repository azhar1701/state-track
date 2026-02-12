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
  // Reporter information
  reporter_name?: string | null;
  phone?: string | null;
  // Administrative location
  kecamatan?: string | null;
  desa?: string | null;
}

const createCustomIcon = (category: string, status: string, severity?: Report['severity']) => {
  // Status color palette - modern and accessible
  const statusColors = {
    baru: { bg: '#f97316', light: '#fed7aa', label: 'B' },      // Orange
    diproses: { bg: '#3b82f6', light: '#bfdbfe', label: 'P' },  // Blue
    selesai: { bg: '#10b981', light: '#a7f3d0', label: 'S' },   // Emerald
  } as const;

  // Severity indicator colors
  const severityBorders = {
    ringan: '#22c55e',   // Green
    sedang: '#f59e0b',   // Amber
    berat: '#ef4444',    // Red
  } as const;

  const statusConf = statusColors[status as keyof typeof statusColors] || statusColors.baru;
  const borderColor = severity ? severityBorders[severity] : '#e5e7eb';
  const borderWidth = severity ? '3px' : '2px';

  return L.divIcon({
    html: `
      <div style="
        position: relative;
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <!-- Main badge -->
        <div style="
          position: absolute;
          width: 36px;
          height: 36px;
          background: linear-gradient(135deg, ${statusConf.bg} 0%, color-mix(in srgb, ${statusConf.bg} 85%, black) 100%);
          border: ${borderWidth} solid ${borderColor};
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 
            0 0 0 3px rgba(255, 255, 255, 1),
            0 0 0 5px rgba(0, 0, 0, 0.1),
            0 4px 12px rgba(0, 0, 0, 0.15),
            inset 0 1px 2px rgba(255, 255, 255, 0.4);
          font-weight: 700;
          font-size: 14px;
          color: white;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
        ">
          ${statusConf.label}
        </div>
        
        <!-- Severity indicator ring (if applicable) -->
        ${severity ? `
        <div style="
          position: absolute;
          width: 44px;
          height: 44px;
          border: 2px solid ${borderColor};
          border-radius: 50%;
          opacity: 0.6;
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        "></div>
        ` : ''}
      </div>
      
      <style>
        @keyframes pulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 0.3; transform: scale(1.15); }
        }
        
        .custom-marker-icon {
          animation: marker-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        
        @keyframes marker-pop {
          0% { transform: scale(0) rotate(0deg); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
      </style>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -28],
    className: 'custom-marker-icon',
  });
};

const createClusterCustomIcon = (count: number) => {
  const size = count < 10 ? 44 : count < 100 ? 54 : 64;
  const fontSize = count < 10 ? '16px' : count < 100 ? '14px' : '12px';
  
  return L.divIcon({
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
        border: 3px solid white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 
          0 0 0 2px rgba(59, 130, 246, 0.2),
          0 8px 16px rgba(30, 64, 175, 0.3),
          inset 0 1px 2px rgba(255, 255, 255, 0.3);
        font-weight: 700;
        color: white;
        font-size: ${fontSize};
        transition: all 0.2s ease;
      ">
        ${count}
      </div>
    `,
    className: 'custom-cluster-icon hover:scale-110',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
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
              reports={reports as unknown as Array<{ id: string; title: string; description: string; category: string; status: string; severity?: 'ringan' | 'sedang' | 'berat' | null; latitude: number; longitude: number; created_at: string; photo_url?: string | null; [key: string]: unknown }>}
              bounds={mapBounds}
              zoom={mapZoom}
              onMarkerClick={(report) => setSelectedReport(report as Report)}
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
