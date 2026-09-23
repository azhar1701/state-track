import { useEffect } from 'react';
import { Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { useMapReports, Report } from '../hooks/useMapReports';
import { MapFilters } from '../FilterPanel';
import { MapOverlays } from '../OverlayToggle';
import { formatReportLocation, getOptimizedImageUrl } from '@/lib/formatters';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StatusBadge, SeverityBadge } from '@/components/common/ReportBadges';
import { MapPin, ArrowRight } from 'lucide-react';

interface ReportLayerProps {
  filters: MapFilters;
  overlays: MapOverlays;
  onReportClick: (report: Report) => void;
}

const createClusterCustomIcon = (cluster: L.MarkerCluster) => {
  const count = cluster.getChildCount();
  const size = count < 10 ? 44 : count < 100 ? 54 : 64;
  return L.divIcon({
    html: `<div class="flex items-center justify-center w-full h-full bg-primary text-white rounded-full border-4 border-white shadow-lg font-bold">${count}</div>`,
    className: 'custom-cluster-icon',
    iconSize: [size, size],
  });
};

const createCustomIcon = (status: string, severity?: Report['severity']) => {
  const statusColors: Record<string, string> = {
    baru: '#f97316',
    diproses: '#3b82f6',
    selesai: '#10b981',
  };
  const color = statusColors[status] || '#6b7280';
  
  return L.divIcon({
    html: `<div class="w-8 h-8 rounded-full border-2 border-white shadow-md flex items-center justify-center text-white font-bold" style="background-color: ${color}">${status[0].toUpperCase()}</div>`,
    className: 'custom-report-icon',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  });
};

// Heatmap internal component
const HeatLayer = ({ reports, visible }: { reports: Report[], visible: boolean }) => {
  const map = useMap();
  
  useEffect(() => {
    if (!visible || reports.length === 0) return;
    
    const points: Array<[number, number, number]> = reports.map(r => [
      r.latitude,
      r.longitude,
      r.severity === 'berat' ? 1.0 : r.severity === 'sedang' ? 0.6 : 0.3
    ]);
    
    const heatLayer = L.heatLayer(points, {
      radius: 25,
      blur: 15,
      maxZoom: 17,
      gradient: { 0.4: 'blue', 0.6: 'cyan', 0.7: 'lime', 0.8: 'yellow', 1.0: 'red' }
    }).addTo(map);
    
    return () => {
      map.removeLayer(heatLayer);
    };
  }, [map, reports, visible]);
  
  return null;
};

export const ReportLayer = ({ filters, overlays, onReportClick }: ReportLayerProps) => {
  const { reports: allReports } = useMapReports();

  // Apply filters client-side (consistent with MapView pattern)
  const reports = allReports.filter((r) => {
    if (filters.category && filters.category !== 'semua' && r.category !== filters.category) return false;
    if (filters.status && filters.status !== 'semua' && r.status !== filters.status) return false;
    return true;
  });

  return (
    <>
      {overlays.heatmap && <HeatLayer reports={reports} visible={true} />}
      
      {overlays.reports && (
        <MarkerClusterGroup
          chunkedLoading
          iconCreateFunction={createClusterCustomIcon}
          maxClusterRadius={50}
          showCoverageOnHover={false}
        >
          {reports.map((report) => (
            <Marker
              key={report.id}
              position={[report.latitude, report.longitude]}
              icon={createCustomIcon(report.status, report.severity)}
              eventHandlers={{
                click: () => onReportClick(report),
              }}
            >
              <Popup className="custom-popup" maxWidth={260} minWidth={220}>
                <div className="p-3 w-[230px] space-y-2">
                  {(report.photo_urls?.[0] || report.photo_url) && (
                    <div className="w-full h-24 rounded-xl overflow-hidden bg-muted/50 border border-border/40">
                      <img
                        src={getOptimizedImageUrl(report.photo_urls?.[0] || report.photo_url, 300, 60)}
                        alt={report.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  )}
                  <div>
                    <h3 className="font-bold text-sm leading-tight text-foreground line-clamp-2">
                      {report.title}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      <StatusBadge status={report.status} className="text-[10px] py-0 h-4.5 px-2 font-medium" />
                      {report.severity && (
                        <SeverityBadge severity={report.severity} className="text-[10px] py-0 h-4.5 px-2 font-medium" />
                      )}
                      <Badge variant="outline" className="text-[10px] py-0 h-4.5 px-2 font-normal text-muted-foreground border-border/60">
                        {report.category}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-start gap-1.5 text-[11px] text-muted-foreground pt-1">
                    <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5 text-primary" />
                    <span className="line-clamp-2 leading-relaxed">
                      {formatReportLocation(report.location_name, report.desa, report.kecamatan)}
                    </span>
                  </div>

                  <Button
                    size="sm"
                    className="w-full h-8 text-xs font-medium gap-1.5 mt-2 rounded-xl"
                    onClick={(e) => {
                      e.stopPropagation();
                      onReportClick(report);
                    }}
                  >
                    <span>Detail Laporan</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>
      )}
    </>
  );
};
