/**
 * Advanced Clustering Component
 * Severity-based clustering with breakdown statistics
 */

import { useEffect, useState } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.markercluster';

export interface ClusterReport {
  id: string;
  coords: [number, number];
  severity: 'ringan' | 'sedang' | 'berat';
  category: string;
  status: string;
}

export interface ClusterBreakdown {
  ringan: number;
  sedang: number;
  berat: number;
  total: number;
}

interface AdvancedClusteringProps {
  reports: ClusterReport[];
  enabled: boolean;
  radius?: number;
  onClusterClick?: (reports: ClusterReport[]) => void;
  createMarkerIcon: (category: string, status: string, severity?: ClusterReport['severity']) => L.DivIcon;
}

export function AdvancedClustering({
  reports,
  enabled,
  radius = 80,
  onClusterClick,
  createMarkerIcon,
}: AdvancedClusteringProps) {
  const map = useMap();
  const [clusterGroup, setClusterGroup] = useState<L.MarkerClusterGroup | null>(null);

  useEffect(() => {
    if (!map || !enabled) {
      if (clusterGroup) {
        map.removeLayer(clusterGroup);
        setClusterGroup(null);
      }
      return;
    }

    // Create cluster group with custom icon
    const mcg = (L as typeof L & { markerClusterGroup: (options: Record<string, unknown>) => L.MarkerClusterGroup }).markerClusterGroup({
      chunkedLoading: true,
      maxClusterRadius: radius,
      showCoverageOnHover: true,
      spiderfyOnMaxZoom: true,
      iconCreateFunction: (cluster: L.MarkerCluster) => {
        const markers = cluster.getAllChildMarkers();
        const breakdown = calculateBreakdown(markers);
        return createSeverityClusterIcon(breakdown);
      },
    }) as L.MarkerClusterGroup;

    // Add markers
    reports.forEach(report => {
      const marker = L.marker([report.coords[0], report.coords[1]], {
        icon: createMarkerIcon(report.category, report.status, report.severity),
      });

      // Store report data
      (marker as L.Marker & { _reportData?: ClusterReport })._reportData = report;

      marker.on('click', () => {
        if (onClusterClick) {
          onClusterClick([report]);
        }
      });

      mcg.addLayer(marker);
    });

    // Handle cluster click
    mcg.on('clusterclick', (e: L.LeafletEvent & { layer: L.MarkerCluster }) => {
      const cluster = e.layer;
      const markers = cluster.getAllChildMarkers();
      const clusterReports = markers
        .map((m: L.Marker & { _reportData?: ClusterReport }) => m._reportData)
        .filter(Boolean) as ClusterReport[];

      if (onClusterClick && clusterReports.length > 0) {
        onClusterClick(clusterReports);
      }
    });

    mcg.addTo(map);
    setClusterGroup(mcg);

    return () => {
      if (map && mcg) {
        map.removeLayer(mcg);
      }
    };
  }, [map, reports, enabled, radius, clusterGroup, createMarkerIcon, onClusterClick]);

  return null;
}

function calculateBreakdown(markers: L.Marker[]): ClusterBreakdown {
  const breakdown: ClusterBreakdown = {
    ringan: 0,
    sedang: 0,
    berat: 0,
    total: markers.length,
  };

  markers.forEach((marker: L.Marker & { _reportData?: ClusterReport }) => {
    const report = marker._reportData;
    if (report?.severity) {
      breakdown[report.severity]++;
    }
  });

  return breakdown;
}

function createSeverityClusterIcon(breakdown: ClusterBreakdown): L.DivIcon {
  const { ringan, sedang, berat, total } = breakdown;
  
  // Determine dominant severity
  let dominantColor = '#3b82f6'; // default blue
  let dominantLabel = 'M'; // Mixed
  
  if (berat > sedang && berat > ringan) {
    dominantColor = '#ef4444'; // red
    dominantLabel = 'B';
  } else if (sedang > ringan) {
    dominantColor = '#f59e0b'; // amber
    dominantLabel = 'S';
  } else if (ringan > 0) {
    dominantColor = '#22c55e'; // green
    dominantLabel = 'R';
  }

  const size = total < 10 ? 50 : total < 100 ? 60 : 70;
  const fontSize = total < 10 ? '14px' : total < 100 ? '12px' : '11px';

  // Create pie chart segments if mixed
  const hasMixed = (ringan > 0 ? 1 : 0) + (sedang > 0 ? 1 : 0) + (berat > 0 ? 1 : 0) > 1;
  
  let pieChart = '';
  if (hasMixed) {
    const ringanPct = (ringan / total) * 100;
    const sedangPct = (sedang / total) * 100;
    const beratPct = (berat / total) * 100;
    
    pieChart = `
      <div style="
        position: absolute;
        inset: 0;
        border-radius: 50%;
        background: conic-gradient(
          #22c55e 0% ${ringanPct}%,
          #f59e0b ${ringanPct}% ${ringanPct + sedangPct}%,
          #ef4444 ${ringanPct + sedangPct}% 100%
        );
        opacity: 0.3;
      "></div>
    `;
  }

  return L.divIcon({
    html: `
      <div style="
        position: relative;
        width: ${size}px;
        height: ${size}px;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        ${pieChart}
        <div style="
          position: relative;
          width: ${size - 8}px;
          height: ${size - 8}px;
          background: linear-gradient(135deg, ${dominantColor} 0%, color-mix(in srgb, ${dominantColor} 85%, black) 100%);
          border: 3px solid white;
          border-radius: 50%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          box-shadow: 
            0 0 0 2px rgba(59, 130, 246, 0.2),
            0 8px 16px rgba(30, 64, 175, 0.3),
            inset 0 1px 2px rgba(255, 255, 255, 0.3);
          color: white;
          font-weight: 700;
          transition: all 0.2s ease;
        ">
          <div style="font-size: ${fontSize}; line-height: 1;">${total}</div>
          ${hasMixed ? `<div style="font-size: 9px; opacity: 0.9; margin-top: 2px;">R:${ringan} S:${sedang} B:${berat}</div>` : ''}
        </div>
      </div>
    `,
    className: 'severity-cluster-icon hover:scale-110',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}
