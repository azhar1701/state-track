import { useEffect } from 'react';
import { Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { useMapReports, Report } from '../hooks/useMapReports';
import { MapFilters } from '../FilterPanel';
import { MapOverlays } from '../OverlayToggle';
import { formatReportLocation } from '@/lib/formatters';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

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
    
    const heatLayer = (L as any).heatLayer(points, {
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
  const { data: reports = [] } = useMapReports(filters);

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
              <Popup className="custom-popup">
                <div className="p-1 max-w-[200px]">
                  <h3 className="font-bold text-sm mb-1 leading-tight">{report.title}</h3>
                  <div className="flex gap-1 mb-2">
                    <Badge variant="outline" className="text-[10px] h-4">{report.category}</Badge>
                    <Badge variant={report.status === 'selesai' ? 'success' : 'secondary'} className="text-[10px] h-4">
                      {report.status}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground line-clamp-2 mb-2">
                    {formatReportLocation(report.location_name, report.desa, report.kecamatan)}
                  </p>
                  <Button size="sm" className="w-full h-7 text-[10px]" onClick={() => onReportClick(report)}>
                    Detail Laporan
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
