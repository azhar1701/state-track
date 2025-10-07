import { useEffect, useState, useMemo } from 'react';
import { MapContainer, Marker, Popup, GeoJSON, useMap } from 'react-leaflet';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Navigation, Filter as FilterIcon, Layers, Share2, Download, Loader2 } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { BasemapSwitcher, BasemapType } from '@/components/map/BasemapSwitcher';
import { FilterPanel, MapFilters } from '@/components/map/FilterPanel';
import { TimeSlider } from '@/components/map/TimeSlider';
import { OverlayToggle, MapOverlays } from '@/components/map/OverlayToggle';
import { DrawControls } from '@/components/map/DrawControls';
import { ReportDetailDrawer } from '@/components/map/ReportDetailDrawer';
import { exportMapToPNG, generateShareableURL, parseURLParams } from '@/lib/mapExport';
import { toast } from 'sonner';
import * as turf from '@turf/turf';
import { format, isAfter, isBefore, startOfDay } from 'date-fns';

interface Report {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  latitude: number;
  longitude: number;
  location_name: string | null;
  photo_url: string | null;
  created_at: string;
  user_id: string;
}

const createCustomIcon = (category: string, status: string) => {
  const colors = {
    baru: '#f59e0b',
    diproses: '#3b82f6',
    selesai: '#10b981',
  };

  const color = colors[status as keyof typeof colors] || '#6b7280';

  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        background-color: ${color};
        width: 32px;
        height: 32px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 3px solid white;
        box-shadow: 0 3px 6px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <span style="
          transform: rotate(45deg);
          color: white;
          font-weight: bold;
          font-size: 16px;
        ">📍</span>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

const FlyToLocation = ({ center, zoom }: { center: [number, number]; zoom: number }) => {
  const map = useMap();

  useEffect(() => {
    map.flyTo(center, zoom);
  }, [center, zoom, map]);

  return null;
};

const MapView = () => {
  const urlParams = parseURLParams();

  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>(
    urlParams.center || [-6.2088, 106.8456]
  );
  const [mapZoom, setMapZoom] = useState(urlParams.zoom || 12);
  const [basemap, setBasemap] = useState<BasemapType>((urlParams.basemap as BasemapType) || 'osm');

  const [filters, setFilters] = useState<MapFilters>({
    category: urlParams.category,
    status: urlParams.status,
    dateFrom: urlParams.dateFrom,
    dateTo: urlParams.dateTo,
  });

  const [showFilters, setShowFilters] = useState(false);
  const [showOverlays, setShowOverlays] = useState(false);
  const [overlays, setOverlays] = useState<MapOverlays>({
    adminBoundaries: false,
    irrigation: false,
    floodZones: false,
  });

  const [drawnPolygon, setDrawnPolygon] = useState<L.Polygon | null>(null);
  const [timeFilterDate, setTimeFilterDate] = useState<Date>(new Date());
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);

  const minDate = useMemo(() => {
    if (reports.length === 0) return new Date();
    const dates = reports.map((r) => new Date(r.created_at));
    return new Date(Math.min(...dates.map((d) => d.getTime())));
  }, [reports]);

  const maxDate = useMemo(() => {
    if (reports.length === 0) return new Date();
    const dates = reports.map((r) => new Date(r.created_at));
    return new Date(Math.max(...dates.map((d) => d.getTime())));
  }, [reports]);

  useEffect(() => {
    fetchReports();
    getUserLocation();

    const channel = supabase
      .channel('reports-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reports',
        },
        () => {
          fetchReports();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (urlParams.selectedReportId) {
      const report = reports.find((r) => r.id === urlParams.selectedReportId);
      if (report) {
        setSelectedReport(report);
        setMapCenter([report.latitude, report.longitude]);
        setMapZoom(16);
      }
    }
  }, [reports, urlParams.selectedReportId]);

  const fetchReports = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setReports(data as Report[]);
    }
    setLoading(false);
  };

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation([position.coords.latitude, position.coords.longitude]);
        },
        (error) => {
          console.log('Error getting location:', error);
        }
      );
    }
  };

  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      if (filters.category && report.category !== filters.category) return false;
      if (filters.status && report.status !== filters.status) return false;

      const reportDate = startOfDay(new Date(report.created_at));

      if (filters.dateFrom) {
        const fromDate = startOfDay(new Date(filters.dateFrom));
        if (isBefore(reportDate, fromDate)) return false;
      }

      if (filters.dateTo) {
        const toDate = startOfDay(new Date(filters.dateTo));
        if (isAfter(reportDate, toDate)) return false;
      }

      const timeFilterStart = startOfDay(timeFilterDate);
      if (isBefore(reportDate, timeFilterStart)) return false;

      if (drawnPolygon) {
        const point = turf.point([report.longitude, report.latitude]);
        const latlngs = drawnPolygon.getLatLngs()[0] as L.LatLng[];
        const coordinates = latlngs.map((ll) => [ll.lng, ll.lat]);
        coordinates.push(coordinates[0]);
        const polygon = turf.polygon([coordinates]);

        if (!turf.booleanPointInPolygon(point, polygon)) return false;
      }

      return true;
    });
  }, [reports, filters, drawnPolygon, timeFilterDate]);

  const goToUserLocation = () => {
    if (userLocation) {
      setMapCenter(userLocation);
      setMapZoom(15);
    }
  };

  const handleShare = async () => {
    const url = generateShareableURL({
      center: mapCenter,
      zoom: mapZoom,
      category: filters.category,
      status: filters.status,
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      selectedReportId: selectedReport?.id,
      basemap,
    });

    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link berhasil disalin!', {
        description: 'Link peta telah disalin ke clipboard',
      });
    } catch (error) {
      toast.error('Gagal menyalin link');
    }
  };

  const handleExport = async () => {
    if (!mapInstance) return;

    try {
      toast.loading('Mengekspor peta...');
      await exportMapToPNG(mapInstance, `map-export-${format(new Date(), 'yyyy-MM-dd')}.png`);
      toast.dismiss();
      toast.success('Peta berhasil diekspor!');
    } catch (error) {
      toast.dismiss();
      toast.error('Gagal mengekspor peta');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Peta Laporan Infrastruktur</h1>
          <p className="text-muted-foreground">
            Lihat semua laporan infrastruktur di peta interaktif
          </p>
        </div>

        <div className="relative h-[calc(100vh-220px)] rounded-lg overflow-hidden shadow-lg border">
          <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            className="h-full w-full"
            zoomControl={false}
            ref={setMapInstance}
          >
            <FlyToLocation center={mapCenter} zoom={mapZoom} />
            <BasemapSwitcher onBasemapChange={setBasemap} initialBasemap={basemap} />
            <DrawControls
              onPolygonCreated={(polygon) => setDrawnPolygon(polygon)}
              onPolygonEdited={(polygon) => setDrawnPolygon(polygon)}
              onPolygonDeleted={() => setDrawnPolygon(null)}
            />

            {filteredReports.map((report) => (
              <Marker
                key={report.id}
                position={[report.latitude, report.longitude]}
                icon={createCustomIcon(report.category, report.status)}
                eventHandlers={{
                  click: () => {
                    setSelectedReport(report);
                  },
                }}
              >
                <Popup>
                  <div className="p-2">
                    <h3 className="font-semibold text-sm mb-1">{report.title}</h3>
                    <p className="text-xs text-muted-foreground mb-2">{report.category}</p>
                    <Button
                      size="sm"
                      onClick={() => setSelectedReport(report)}
                      className="w-full"
                    >
                      Lihat Detail
                    </Button>
                  </div>
                </Popup>
              </Marker>
            ))}

            {userLocation && (
              <Marker
                position={userLocation}
                icon={L.icon({
                  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iOCIgZmlsbD0iIzM5ODJmNiIgZmlsbC1vcGFjaXR5PSIwLjMiLz4KPGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iNCIgZmlsbD0iIzM5ODJmNiIvPgo8L3N2Zz4=',
                  iconSize: [24, 24],
                  iconAnchor: [12, 12],
                })}
              />
            )}
          </MapContainer>

          <div className="absolute top-4 left-4 z-[1000] flex flex-col gap-2">
            {userLocation && (
              <Button onClick={goToUserLocation} size="sm" className="shadow-lg">
                <Navigation className="w-4 h-4 mr-2" />
                Lokasi Saya
              </Button>
            )}

            <Button
              onClick={() => setShowFilters(!showFilters)}
              variant={showFilters ? 'default' : 'outline'}
              size="sm"
              className="shadow-lg"
            >
              <FilterIcon className="w-4 h-4 mr-2" />
              Filter
            </Button>

            <Button
              onClick={() => setShowOverlays(!showOverlays)}
              variant={showOverlays ? 'default' : 'outline'}
              size="sm"
              className="shadow-lg"
            >
              <Layers className="w-4 h-4 mr-2" />
              Overlay
            </Button>

            <Button onClick={handleShare} variant="outline" size="sm" className="shadow-lg">
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>

            <Button onClick={handleExport} variant="outline" size="sm" className="shadow-lg">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>

          {showFilters && (
            <div className="absolute top-4 left-4 z-[1001] mt-60">
              <FilterPanel
                filters={filters}
                onFilterChange={(newFilters) => {
                  setFilters(newFilters);
                  setShowFilters(false);
                }}
                onClose={() => setShowFilters(false)}
              />
            </div>
          )}

          {showOverlays && (
            <div className="absolute top-4 right-24 z-[1001]">
              <OverlayToggle
                overlays={overlays}
                onOverlayChange={setOverlays}
                onClose={() => setShowOverlays(false)}
              />
            </div>
          )}

          {selectedReport && (
            <div className="absolute top-4 right-4 z-[1001]">
              <ReportDetailDrawer
                report={selectedReport}
                onClose={() => setSelectedReport(null)}
              />
            </div>
          )}

          {reports.length > 0 && (
            <div className="absolute bottom-4 left-4 right-4 z-[1000]">
              <TimeSlider
                minDate={minDate}
                maxDate={maxDate}
                currentDate={timeFilterDate}
                onDateChange={setTimeFilterDate}
              />
            </div>
          )}

          {loading && (
            <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-[1002]">
              <Card className="p-6">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span className="font-medium">Memuat laporan...</span>
                </div>
              </Card>
            </div>
          )}
        </div>

        <div className="mt-4 p-4 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong>Total laporan:</strong> {filteredReports.length} dari {reports.length} laporan
          </p>
        </div>
      </div>
    </div>
  );
};

export default MapView;
