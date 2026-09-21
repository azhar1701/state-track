/**
 * mapIcons.ts
 * Pure helper functions for creating Leaflet marker and cluster icons.
 * Extracted from MapView.tsx for reusability and separation of concerns.
 */
import L from 'leaflet';
import type { Report } from '@/services/types';

// ---------------------------------------------------------------------------
// Layer colour utilities
// ---------------------------------------------------------------------------

/**
 * Deterministic colour generator per layer key.
 * Returns predefined colours for known layer types, falls back to HSL hash.
 */
export const getColorForKey = (key: string): string => {
  const lower = key.toLowerCase();
  if (lower.includes('sungai') || lower.includes('river')) return '#3b82f6';
  if (lower.includes('jalan') || lower.includes('road')) return '#6b7280';
  if (lower.includes('irigasi') || lower.includes('irrigation')) return '#06b6d4';
  if (lower.includes('drainase') || lower.includes('drainage')) return '#8b5cf6';

  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash << 5) - hash + key.charCodeAt(i);
    hash |= 0;
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue} 70% 48%)`;
};

// ---------------------------------------------------------------------------
// Cluster icon
// ---------------------------------------------------------------------------

export const createClusterCustomIcon = (cluster: L.MarkerCluster): L.DivIcon => {
  const count = cluster.getChildCount();
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
 box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2),
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

// ---------------------------------------------------------------------------
// Report marker icon
// ---------------------------------------------------------------------------

export const createCustomIcon = (
  _category: string,
  status: string,
  severity?: Report['severity'],
): L.DivIcon => {
  const statusColors = {
    baru: { bg: '#f97316', label: 'B' },
    diproses: { bg: '#3b82f6', label: 'P' },
    selesai: { bg: '#10b981', label: 'S' },
  } as const;

  const severityBorders = {
    ringan: '#22c55e',
    sedang: '#f59e0b',
    berat: '#ef4444',
  } as const;

  const statusConf = statusColors[status as keyof typeof statusColors] ?? statusColors.baru;
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
 box-shadow: 0 0 0 3px rgba(255, 255, 255, 1),
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
 .custom-marker-icon { animation: marker-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); }
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

// ---------------------------------------------------------------------------
// Asset marker icon
// ---------------------------------------------------------------------------

export const createAssetIcon = (
  status: 'aktif' | 'nonaktif' | 'rusak',
  category?: string,
): L.DivIcon => {
  const colors: Record<typeof status, string> = {
    aktif: '#16a34a',
    nonaktif: '#6b7280',
    rusak: '#ef4444',
  };
  const label = (() => {
    if (status === 'aktif') return 'A';
    if (status === 'rusak') return 'R';
    if (status === 'nonaktif') return 'N';
    return category?.charAt(0)?.toUpperCase() ?? 'L';
  })();
  const color = colors[status] ?? '#16a34a';

  return L.divIcon({
    className: 'asset-marker',
    html: `
 <div style="
 background-color: ${color};
 width: 24px;
 height: 24px;
 border-radius: 50% 50% 50% 0;
 transform: rotate(-45deg);
 border: 2px solid #fff;
 box-shadow: 0 2px 4px rgba(0,0,0,0.3);
 display: flex;
 align-items: center;
 justify-content: center;">
 <span style="transform: rotate(45deg); font-size: 11px; font-weight:600; color:#fff;">${label}</span>
 </div>
 `,
    iconSize: [24, 24],
    iconAnchor: [12, 24],
    popupAnchor: [0, -22],
  });
};
