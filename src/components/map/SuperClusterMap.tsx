import { useMemo } from 'react';
import { Marker } from 'react-leaflet';
import useSupercluster from 'use-supercluster';
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
  [key: string]: unknown;
}

interface SuperClusterMapProps {
  reports: Report[];
  bounds: L.LatLngBounds;
  zoom: number;
  onMarkerClick: (report: Report) => void;
  createIcon: (category: string, status: string, severity?: Report['severity']) => L.DivIcon;
  createClusterIcon: (count: number) => L.DivIcon;
}

export function SuperClusterMap({
  reports,
  bounds,
  zoom,
  onMarkerClick,
  createIcon,
  createClusterIcon,
}: SuperClusterMapProps) {
  const points = useMemo(
    () =>
      reports.map((report) => ({
        type: 'Feature' as const,
        properties: { cluster: false, reportId: report.id, report },
        geometry: {
          type: 'Point' as const,
          coordinates: [report.longitude, report.latitude],
        },
      })),
    [reports]
  );

  const { clusters, supercluster } = useSupercluster({
    points,
    bounds: bounds ? [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()] : undefined,
    zoom,
    options: { radius: 75, maxZoom: 20 },
  });

  return (
    <>
      {clusters.map((cluster) => {
        const [longitude, latitude] = cluster.geometry.coordinates;
        const { cluster: isCluster, point_count: pointCount } = cluster.properties;

        if (isCluster) {
          return (
            <Marker
              key={`cluster-${cluster.id}`}
              position={[latitude, longitude]}
              icon={createClusterIcon(pointCount)}
              eventHandlers={{
                click: () => {
                  const expansionZoom = Math.min(
                    supercluster!.getClusterExpansionZoom(cluster.id as number),
                    20
                  );
                  // Trigger zoom via parent component
                  const event = new CustomEvent('cluster-click', {
                    detail: { center: [latitude, longitude], zoom: expansionZoom },
                  });
                  window.dispatchEvent(event);
                },
              }}
            />
          );
        }

        const report = cluster.properties.report as Report;
        return (
          <Marker
            key={`report-${report.id}`}
            position={[latitude, longitude]}
            icon={createIcon(report.category, report.status, report.severity)}
            eventHandlers={{ click: () => onMarkerClick(report) }}
          />
        );
      })}
    </>
  );
}
