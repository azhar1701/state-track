import { formatReportLocation } from "@/lib/formatters";
import { logger } from "@/lib/logger";
import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { MapContainer, Marker, Popup, useMap, GeoJSON as RLGeoJSON, Pane, Polyline } from 'react-leaflet';
import { supabase } from '@/services/client';
import { Button } from '@/components/ui/button';
import { Loader as Loader2, FileText, Clock, CheckCircle } from 'lucide-react';
import L from 'leaflet';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.markercluster';
import 'leaflet.heat';
import 'leaflet/dist/leaflet.css';

declare module 'leaflet' {
  export function heatLayer(latlngs: Array<[number, number, number]>, options?: Record<string, unknown>): L.Layer;
}
import { BasemapSwitcher } from '@/features/map/BasemapSwitcher';
import type { BasemapType } from '@/features/map/basemap-config';
import { type LegendOverlayItem } from '@/features/map/Legend';
import { reverseGeocode } from '@/features/map/geocoding';
import type { MapFilters } from '@/features/map/FilterPanel';
import { MapSearch } from '@/features/map/MapSearch';
import { FilterPanel } from '@/features/map/FilterPanel';
import { OverlayToggle, type MapOverlays } from '@/features/map/OverlayToggle';
import { ReportDetailDrawer } from '@/features/map/ReportDetailDrawer';
import { ModernMapOverlay } from '@/features/map/ModernMapOverlay';
import { LayerDetailDrawer } from '@/features/map/LayerDetailDrawer';
import { useLayerHighlight } from '@/features/map/useLayerHighlight';
import { exportMapToPNG, generateShareableURL, parseURLParams } from '@/features/map/mapExport';
import { toast } from 'sonner';
import * as turf from '@turf/turf';
import { format, isAfter, isBefore, startOfDay, addDays, differenceInCalendarDays } from 'date-fns';
import type { FeatureCollection, Geometry, Feature, Polygon, MultiPolygon, LineString, MultiLineString } from 'geojson';
import proj4 from 'proj4';
import { sanitizeText, sanitizeForLog } from '@/lib/security';
import { MobileMapControls } from '@/features/map/MobileMapControls';
import { SpatialAnalysisPanel } from '@/features/map/SpatialAnalysisPanel';
import { RouteOptimizationPanel } from '@/features/map/RouteOptimizationPanel';
import { MapInteractionLayer } from '@/features/map/MapInteractionLayer';
import { GeomanControls } from '@/features/map/GeomanControls';
import { DrawToolbar } from '@/features/map/DrawToolbar';
import '@/styles/geoman-custom.css';
import { MultiLayerHeatmap } from '@/features/map/MultiLayerHeatmap';
import type { DensityCell } from '@/features/map/spatialAnalysis';

interface Report {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  severity?: 'ringan' | 'sedang' | 'berat' | null;
  latitude: number;
  longitude: number;
  location_name: string | null;
  photo_url: string | null;
  photo_urls?: string[] | null;
  created_at: string;
  user_id: string;
  // Reporter information
  reporter_name?: string | null;
  phone?: string | null;
  // Administrative location
  kecamatan?: string | null;
  desa?: string | null;
}

type AssetRow = {
  id: string;
  code: string | null;
  name: string | null;
  category: string | null;
  status: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
  keterangan: string | null;
  created_at: string | null;
};

const MAP_PREFS_STORAGE_KEY = 'admin:mapPreferences';
const MAP_OVERLAY_STORAGE_KEY = 'map:overlays';

// Deterministic color generator per layer key to provide visual distinction
const getColorForKey = (key: string) => {
  const lower = key.toLowerCase();
  // Predefined colors for specific layer types
  if (lower.includes('sungai') || lower.includes('river')) return '#3b82f6'; // Blue
  if (lower.includes('jalan') || lower.includes('road')) return '#6b7280'; // Gray
  if (lower.includes('irigasi') || lower.includes('irrigation')) return '#06b6d4'; // Cyan
  if (lower.includes('drainase') || lower.includes('drainage')) return '#8b5cf6'; // Purple

  // Fallback to hash-based color for other layers
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash << 5) - hash + key.charCodeAt(i);
    hash |= 0;
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue} 70% 48%)`;
};

const createClusterCustomIcon = (cluster: L.MarkerCluster) => {
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

const createAssetIcon = (status: 'aktif' | 'nonaktif' | 'rusak', category?: string) => {
  const colors: Record<typeof status, string> = {
    aktif: '#16a34a',
    nonaktif: '#6b7280',
    rusak: '#ef4444',
  } as const;
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

const FlyToLocation = ({ center, zoom }: { center: [number, number]; zoom: number }) => {
  const map = useMap();

  useEffect(() => {
    map.flyTo(center, zoom);
  }, [center, zoom, map]);

  return null;
};

const MapView = () => {
  const urlParams = parseURLParams();
  const hasUrlCenter = Boolean(urlParams.center);
  const hasUrlZoom = typeof urlParams.zoom === 'number';
  const hasUrlBasemap = Boolean(urlParams.basemap);
  const isMobile = useIsMobile();

  // Define minDate at the very top before any hooks that use it
  const minDate = startOfDay(new Date('2025-10-01'));

  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [selectedLayer, setSelectedLayer] = useState<{
    id: string;
    feature: Feature<Geometry>;
    layer: L.Layer;
  } | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>(
    urlParams.center || [-7.325, 108.353] // Ciamis
  );
  const [mapZoom, setMapZoom] = useState(urlParams.zoom || 12);
  const [basemap, setBasemap] = useState<BasemapType>((urlParams.basemap as BasemapType) || 'osm');

  const [filters, setFilters] = useState<MapFilters>({
    category: urlParams.category,
    status: urlParams.status,
    dateFrom: urlParams.dateFrom,
    dateTo: urlParams.dateTo,
  });
  const [routingPath, setRoutingPath] = useState<[number, number][] | null>(null);

  // Sidebar removed per request; use floating mini panels instead
  const [showSearchPanel, setShowSearchPanel] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [showOverlayPanel, setShowOverlayPanel] = useState(false);
  const [overlays, setOverlays] = useState<MapOverlays>({
    adminBoundaries: true,
    clustering: true,
    heatmap: false,
    dynamic: {},
  });

  const statusCounts = useMemo(() => {
    const counts = { total: reports.length, baru: 0, diproses: 0, selesai: 0 };
    for (const report of reports) {
      if (report.status === 'baru') counts.baru += 1;
      else if (report.status === 'diproses') counts.diproses += 1;
      else if (report.status === 'selesai') counts.selesai += 1;
    }
    return counts;
  }, [reports]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const report of reports) {
      counts[report.category] = (counts[report.category] || 0) + 1;
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
  }, [reports]);

  const locationCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const report of reports) {
      // Uses centralized formatter
      const loc = formatReportLocation(report.location_name, (report as { desa?: string }).desa, (report as { kecamatan?: string }).kecamatan);
      if (loc && loc !== 'Lokasi Lain') {
        counts[loc] = (counts[loc] || 0) + 1;
      }
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
  }, [reports]);

  const recentReports = useMemo(() => {
    return reports.slice(0, 3);
  }, [reports]);

  const statusSummary = useMemo(
    () => [
      { key: 'total', label: 'Total', value: statusCounts.total, icon: FileText, tone: 'text-primary' },
      { key: 'baru', label: 'Baru', value: statusCounts.baru, icon: Clock, tone: 'text-amber-500 dark:text-amber-400' },
      { key: 'diproses', label: 'Diproses', value: statusCounts.diproses, icon: Loader2, tone: 'text-sky-500 dark:text-sky-400' },
      { key: 'selesai', label: 'Selesai', value: statusCounts.selesai, icon: CheckCircle, tone: 'text-emerald-500 dark:text-emerald-400' },
    ],
    [statusCounts],
  );

  // Apply persisted admin map preferences (center, zoom, basemap, default overlays)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = window.localStorage.getItem(MAP_PREFS_STORAGE_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored) as Partial<{
        centerLat: string;
        centerLng: string;
        zoom: string;
        basemap: BasemapType;
        showAdminBoundaries: boolean;
        showAssets: boolean;
        enableClustering: boolean;
        clusterRadius: number;
        enableHeatmap: boolean;
        heatmapRadius: number;
        maxZoom: number;
        minZoom: number;
        enableGeolocation: boolean;
        defaultOpacity: number;
      }>;

      setOverlays((prev) => {
        const nextDynamic = { ...(prev.dynamic || {}) };
        let dynamicChanged = false;

        // Paksa layer aset selalu nonaktif
        if (typeof nextDynamic.assets !== 'undefined') {
          nextDynamic.assets = false;
          dynamicChanged = true;
        }

        const nextAdminBoundaries = typeof parsed.showAdminBoundaries === 'boolean'
          ? parsed.showAdminBoundaries
          : prev.adminBoundaries;
        const adminChanged = nextAdminBoundaries !== prev.adminBoundaries;

        const nextClustering = typeof parsed.enableClustering === 'boolean'
          ? parsed.enableClustering
          : prev.clustering;
        const clusterChanged = nextClustering !== prev.clustering;

        const nextHeatmap = typeof parsed.enableHeatmap === 'boolean'
          ? parsed.enableHeatmap
          : prev.heatmap;
        const heatChanged = nextHeatmap !== prev.heatmap;

        if (!adminChanged && !dynamicChanged && !clusterChanged && !heatChanged) {
          return prev;
        }

        return {
          ...prev,
          adminBoundaries: nextAdminBoundaries,
          clustering: nextClustering,
          heatmap: nextHeatmap,
          dynamic: dynamicChanged ? nextDynamic : prev.dynamic,
        };
      });

      if (!hasUrlCenter && parsed.centerLat && parsed.centerLng) {
        const lat = parseFloat(parsed.centerLat);
        const lng = parseFloat(parsed.centerLng);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          setMapCenter([lat, lng]);
        }
      }

      if (!hasUrlZoom && parsed.zoom) {
        const zoomVal = parseInt(parsed.zoom, 10);
        if (!Number.isNaN(zoomVal)) {
          setMapZoom(zoomVal);
        }
      }

      if (!hasUrlBasemap && parsed.basemap) {
        setBasemap(parsed.basemap);
      }

      // Apply geolocation if enabled
      if (parsed.enableGeolocation && !userLocation) {
        getUserLocation();
      }
    } catch (error) {
      console.warn('Failed to apply stored map preferences', sanitizeForLog(error));
    }
  }, [hasUrlBasemap, hasUrlCenter, hasUrlZoom, userLocation]);

  // Restore last overlay toggles (if any)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = window.localStorage.getItem(MAP_OVERLAY_STORAGE_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored) as Partial<MapOverlays>;
      setOverlays((prev) => {
        const nextDynamic = { ...(prev.dynamic || {}) };
        for (const key of Object.keys(nextDynamic)) {
          const lower = key.toLowerCase();
          if (lower.includes('sawah') || lower.includes('padi')) {
            delete nextDynamic[key];
          }
        }
        if (parsed.dynamic && typeof parsed.dynamic === 'object') {
          for (const [key, value] of Object.entries(parsed.dynamic)) {
            const lower = key.toLowerCase();
            if (lower.includes('sawah') || lower.includes('padi')) continue;
            if (typeof value === 'boolean') nextDynamic[key] = value;
          }
        }
        return {
          adminBoundaries: typeof parsed.adminBoundaries === 'boolean' ? parsed.adminBoundaries : prev.adminBoundaries,
          clustering: typeof parsed.clustering === 'boolean' ? parsed.clustering : prev.clustering,
          heatmap: typeof parsed.heatmap === 'boolean' ? parsed.heatmap : prev.heatmap,
          dynamic: nextDynamic,
        };
      });
    } catch (error) {
      console.warn('Failed to restore overlay toggles', sanitizeForLog(error));
    }
  }, []);

  // Persist overlay toggles for next session
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const snapshot: MapOverlays = {
        adminBoundaries: overlays.adminBoundaries,
        clustering: overlays.clustering,
        heatmap: overlays.heatmap,
        dynamic: Object.fromEntries(
          Object.entries(overlays.dynamic || {}).filter(([key]) => {
            const lower = key.toLowerCase();
            return !lower.includes('sawah') && !lower.includes('padi');
          })
        ),
      };
      window.localStorage.setItem(MAP_OVERLAY_STORAGE_KEY, JSON.stringify(snapshot));
    } catch (error) {
      console.warn('Failed to persist overlay toggles', sanitizeForLog(error));
    }
  }, [overlays]);

  // Administrative boundaries geojson cache
  const [adminGeoJson, setAdminGeoJson] = useState<FeatureCollection<Geometry> | null>(null);
  const [kecamatanLines, setKecamatanLines] = useState<FeatureCollection<Geometry> | null>(null);
  const [adminLoading, setAdminLoading] = useState(false);
  // Additional overlays
  // Dynamic overlays from geo_layers
  const [availableLayers, setAvailableLayers] = useState<Array<{ key: string; name: string; geometry_type: string | null }>>([]);
  const [dynamicData, setDynamicData] = useState<Record<string, FeatureCollection<Geometry> | null>>({});
  type LayerStyleConfig = {
    color?: string;
    weight?: number;
    opacity?: number;
    fillColor?: string;
    fillOpacity?: number;
    dashArray?: string;
    radius?: number;
  };
  const [dynamicStyle, setDynamicStyle] = useState<Record<string, LayerStyleConfig>>(() => {
    try {
      const cached = sessionStorage.getItem('map:layerStyles');
      return cached ? JSON.parse(cached) : {};
    } catch {
      return {};
    }
  });
  const [dynamicLoading, setDynamicLoading] = useState<Record<string, boolean>>({});
  const processedLayersRef = useRef<Set<string>>(new Set());
  const layerErrorsRef = useRef<Set<string>>(new Set());

  const [drawnPolygon, setDrawnPolygon] = useState<L.Polygon | null>(null);
  const [timeFilterDate, setTimeFilterDate] = useState<Date>(new Date());
  const [isPlaying, setIsPlaying] = useState(false);
  const [sliderValue, setSliderValue] = useState(0);

  // New geospatial features state
  const [activeMapTool, setActiveMapTool] = useState<'draw' | 'measure' | null>(null);
  const [showGeomanDraw, setShowGeomanDraw] = useState(false);
  const [geomanDrawMode, setGeomanDrawMode] = useState<string | null>(null);
  const [showSpatialAnalysis, setShowSpatialAnalysis] = useState(false);
  const [showRouteOptimization, setShowRouteOptimization] = useState(false);
  const [multiLayerHeatmap] = useState(false);
  const [densityCells, setDensityCells] = useState<DensityCell[]>([]);

  // Calculate maxDate from reports (must be before useEffect hooks that use it)
  const maxDate = useMemo(() => {
    if (reports.length === 0) return new Date();
    const dates = reports.map((r) => new Date(r.created_at));
    return startOfDay(new Date(Math.max(...dates.map((d) => d.getTime()))));
  }, [reports]);

  // Sinkronkan perubahan timeFilterDate ke filters.dateTo
  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      dateTo: format(timeFilterDate, 'yyyy-MM-dd'),
    }));
  }, [timeFilterDate]);

  // Sync slider value with current date
  useEffect(() => {
    const currentDays = Math.max(0, differenceInCalendarDays(startOfDay(timeFilterDate), minDate));
    setSliderValue(currentDays);
  }, [timeFilterDate, minDate, userLocation]);

  // Auto-play timeline
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setSliderValue((prev) => {
        const totalDays = Math.max(0, differenceInCalendarDays(maxDate, minDate));
        if (prev >= totalDays) {
          setIsPlaying(false);
          return prev;
        }
        const next = prev + 1;
        const newDate = addDays(minDate, next);
        setTimeFilterDate(newDate);
        return next;
      });
    }, 500);
    return () => clearInterval(interval);
  }, [isPlaying, minDate, maxDate]);
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const [clusterLayer, setClusterLayer] = useState<L.MarkerClusterGroup | null>(null);
  const [heatLayer, setHeatLayer] = useState<L.Layer | null>(null);
  const [cursorLatLng, setCursorLatLng] = useState<[number, number] | null>(null);
  const [ctxOpen, setCtxOpen] = useState(false);
  const [ctxPoint, setCtxPoint] = useState<{ x: number; y: number } | null>(null);
  const [ctxLatLng, setCtxLatLng] = useState<[number, number] | null>(null);
  const [ctxAddress, setCtxAddress] = useState<string | null>(null);
  const [ctxLoading, setCtxLoading] = useState(false);

  const { registerLayer, unregisterLayer } = useLayerHighlight({
    selectedFeatureId: selectedLayer?.id || null,
  });

  const handleZoomToLayer = useCallback(() => {
    if (!selectedLayer || !mapInstance) return;
    const layer = selectedLayer.layer;
    if ('getBounds' in layer && typeof layer.getBounds === 'function') {
      const bounds = (layer as L.Polyline | L.Polygon).getBounds();
      mapInstance.fitBounds(bounds.pad(0.1));
    }
  }, [selectedLayer, mapInstance]);
  const fetchRoute = useCallback(async (targetCoords: [number, number]) => {
    if (!userLocation) {
      toast.error('Gunakan GPS untuk menentukan lokasi Anda sebelum membuat rute');
      return;
    }
    setRoutingPath(null);
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${userLocation[1]},${userLocation[0]};${targetCoords[1]},${targetCoords[0]}?overview=full&geometries=geojson`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.routes && data.routes[0]) {
        const coords = data.routes[0].geometry.coordinates.map((c: [number, number]) => [c[1], c[0]] as [number, number]);
        setRoutingPath(coords);
        if (mapInstance) {
          const bounds = L.latLngBounds(coords);
          mapInstance.fitBounds(bounds.pad(0.1));
        }
        toast.success('Rute berhasil dibuat');
      } else {
        toast.error('Rute tidak ditemukan');
      }
    } catch (err) {
      logger.error('Routing error:', err);
      toast.error('Gagal memuat rute');
    } finally {
      // Logic for cleanup if needed
    }
  }, [userLocation, mapInstance]);

  // Memoize rendered layers to force re-render when style changes
  const renderedLayers = useMemo(() => {
    return Object.entries(overlays.dynamic || {}).map(([key, on]) => {
      if (!on || !dynamicData[key]) return null;
      const config = dynamicStyle[key] || {};
      logger.info(`[MapView] Rendering layer ${key} with style:`, config);

      // Force dynamic layers (non-admin) to use the same visual style as
      // administrative boundaries. Only the admin boundary layer may have
      // a custom/different appearance.
      const geomType = availableLayers.find((l) => l.key === key)?.geometry_type
        || dynamicData[key]?.features?.find((f) => !!f?.geometry)?.geometry?.type
        || '';

      return (
        <Pane key={`pane-${key}`} name={`dyn-${key}`} style={{ zIndex: 365 }}>
          <RLGeoJSON
            key={`geojson-${key}-${JSON.stringify(config)}`}
            data={dynamicData[key]!}
            style={() => {
              const layerColor = getColorForKey(key);
              // Points: keep marker-only styling (no polygon stroke)
              if (/Point/i.test(String(geomType))) {
                return {
                  color: 'transparent',
                  weight: 0,
                  opacity: 0,
                  fillColor: config.fillColor || layerColor,
                  fillOpacity: config.fillOpacity ?? 0.75,
                } as L.PathOptions;
              }

              // Lines: show stroke, no fill
              if (/LineString/i.test(String(geomType))) {
                return {
                  color: config.color || layerColor,
                  weight: config.weight ?? 2,
                  opacity: config.opacity ?? 0.9,
                  fillOpacity: 0,
                  dashArray: config.dashArray,
                } as L.PathOptions;
              }

              // Polygons/MultiPolygons: show stroke + fill
              return {
                color: config.color || '#6b7280',
                weight: config.weight ?? 1,
                opacity: config.opacity ?? 0.85,
                fillColor: config.fillColor || layerColor,
                fillOpacity: config.fillOpacity ?? 0.45,
                dashArray: config.dashArray,
              } as L.PathOptions;
            }}
            pointToLayer={(feature, latlng) => {
              if (key === 'assets') {
                const p = feature.properties as Record<string, unknown> | undefined;
                const status = (p?.status as string) || 'aktif';
                const cat = (p?.category as string) || '';
                return L.marker(latlng, { icon: createAssetIcon((['aktif', 'nonaktif', 'rusak'].includes(status) ? (status as 'aktif' | 'nonaktif' | 'rusak') : 'aktif'), cat) });
              }
              // Point marker: no stroke, dynamic fill color
              const layerColor = getColorForKey(key);
              return L.circleMarker(latlng, {
                radius: config.radius ?? 8,
                color: 'transparent',
                weight: 0,
                fillColor: config.fillColor || layerColor,
                fillOpacity: config.fillOpacity ?? 0.75,
              });
            }}
            onEachFeature={(feature, layer) => {
              const p = feature.properties as Record<string, unknown> | undefined;
              const featureId = `${key}-${Math.random().toString(36).substr(2, 9)}`;

              // not registering dynamic layer for highlight

              const title = (p?.name as string) || (p?.title as string) || (p?.NAMOBJ as string) || key;
              if (title) {
                layer.bindTooltip(String(title), { sticky: true });
              }

              if (key === 'assets') {
                const code = p?.code as string | undefined;
                const cat = p?.category as string | undefined;
                const status = p?.status as string | undefined;
                const ket = p?.keterangan as string | undefined;
                const safeTitle = sanitizeText(title);
                const safeCode = sanitizeText(code ?? '-');
                const safeCat = sanitizeText(cat ?? '-');
                const safeStatus = sanitizeText(status ?? '-');
                const safeKet = sanitizeText(ket ?? '-');
                layer.bindPopup(`
                  <div style="min-width:200px">
                    <div style="font-weight:600;margin-bottom:4px">${safeTitle}</div>
                    <div><strong>Kode:</strong> ${safeCode}</div>
                    <div><strong>Kategori:</strong> ${safeCat}</div>
                    <div><strong>Status:</strong> ${safeStatus}</div>
                    <div><strong>Keterangan:</strong> ${safeKet}</div>
                  </div>
                `);
              } else {
                layer.on('click', () => {
                  setSelectedLayer({ id: featureId, feature, layer });
                });
              }

              layer.on('remove', () => {
                unregisterLayer(featureId);
              });
            }}
          />
        </Pane>
      );
    });
  }, [overlays.dynamic, dynamicData, dynamicStyle, unregisterLayer, setSelectedLayer, availableLayers]);

  // Build dynamic legend items based on active overlays and layer types
  const legendOverlays = useMemo<LegendOverlayItem[]>(() => {
    const items: LegendOverlayItem[] = [];
    const seenLabels = new Set<string>();

    if (overlays.adminBoundaries) {
      const label = 'Batas Administratif';
      if (!seenLabels.has(label)) {
        items.push({ type: 'line', label, color: '#6b7280', dashArray: '4 3' });
        seenLabels.add(label);
      }
    }
    const dyn = overlays.dynamic || {};
    const activeDyn = Object.entries(dyn).filter(([, on]) => on).map(([k]) => k);
    const getName = (key: string) => availableLayers.find((l) => l.key === key)?.name || key;

    for (const key of activeDyn) {
      const lower = key.toLowerCase();
      if (lower === 'assets') continue;

      // Compute dynamic color per-layer; keep ability to override via style
      const config = dynamicStyle[key] || {};
      const layerColor = getColorForKey(key);
      const strokeColor = config.color || layerColor;
      const fillColor = config.fillColor || layerColor;
      const dashArray = config.dashArray;

      // Determine geometry type
      const gt = availableLayers.find((l) => l.key === key)?.geometry_type
        || dynamicData[key]?.features?.find((f) => !!f?.geometry)?.geometry?.type
        || '';

      if (/LineString/i.test(String(gt))) {
        items.push({ type: 'line', label: getName(key), color: strokeColor, dashArray });
      } else if (/Point/i.test(String(gt))) {
        if (getName(key).toLowerCase() === 'aset' || lower === 'assets') continue;
        items.push({ type: 'point', label: getName(key), color: fillColor });
      } else {
        // Polygon/MultiPolygon
        items.push({
          type: 'fill',
          label: getName(key),
          color: strokeColor,
          fillColor: fillColor,
        });
      }
    }
    return items;
  }, [overlays.adminBoundaries, overlays.dynamic, availableLayers, dynamicData, dynamicStyle]);

  // Listen for layer deletion/update events from GeoDataManager
  useEffect(() => {
    const handleLayerDeleted = (e: Event) => {
      const { layerKey } = (e as CustomEvent).detail;
      logger.info('[MapView] Layer deleted:', layerKey);

      setDynamicData(prev => {
        const next = { ...prev };
        delete next[layerKey];
        return next;
      });

      setOverlays(prev => {
        const nextDynamic = { ...prev.dynamic };
        delete nextDynamic[layerKey];
        return { ...prev, dynamic: nextDynamic };
      });

      processedLayersRef.current.delete(layerKey);
      layerErrorsRef.current.delete(layerKey);
    };

    const handleLayerUpdated = () => {
      sessionStorage.removeItem('map:availableLayers');
    };

    window.addEventListener('layer-deleted', handleLayerDeleted);
    window.addEventListener('layer-updated', handleLayerUpdated);

    return () => {
      window.removeEventListener('layer-deleted', handleLayerDeleted);
      window.removeEventListener('layer-updated', handleLayerUpdated);
    };
  }, []);

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
          void fetchReports();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);
  useEffect(() => {
    const loadAdminBoundaries = async () => {
      if (!overlays.adminBoundaries) return;
      if (adminGeoJson && kecamatanLines) return; // already loaded
      setAdminLoading(true);
      try {
        // Try from DB first (geo_layers.key = 'admin_boundaries')
        let data: FeatureCollection<Geometry> | null = null;
        let srcCrsFromDb: string | undefined = undefined;
        try {
          const { data: row, error } = await supabase
            .from('geo_layers')
            .select('data')
            .eq('key', 'admin_boundaries')
            .maybeSingle();
          if (!error && row?.data) {
            const raw = row.data as unknown as Record<string, unknown>;
            if (raw && typeof raw === 'object' && 'featureCollection' in raw) {
              const wrapper = raw as { featureCollection?: unknown; crs?: string };
              if (wrapper.featureCollection && (wrapper.featureCollection as { type?: string }).type === 'FeatureCollection') {
                data = wrapper.featureCollection as FeatureCollection<Geometry>;
                srcCrsFromDb = typeof wrapper.crs === 'string' ? wrapper.crs : undefined;
              }
            }
            if (!data) {
              if ((raw as { type?: string }).type === 'FeatureCollection') {
                data = raw as unknown as FeatureCollection<Geometry>;
              } else if (raw && typeof raw === 'object') {
                const vals = Object.values(raw);
                const found = vals.find((v) => !!v && typeof v === 'object' && (v as { type?: string }).type === 'FeatureCollection');
                if (found) data = found as FeatureCollection<Geometry>;
              }
            }
          }
        } catch {
          // ignore
        }

        // Fallback to public files
        if (!data) {
          const candidates = ['/data/ciamis_kecamatan.geojson', '/data/adm_ciamis.geojson'];
          for (const url of candidates) {
            try {
              const r = await fetch(url, { cache: 'force-cache' });
              if (r.ok) {
                data = (await r.json()) as FeatureCollection<Geometry>;
                break;
              }
            } catch {
              // try next
            }
          }
        }

        if (!data) throw new Error('No admin boundaries found');

        // Detect CRS from wrapper/db or embedded GeoJSON, or infer by coordinate magnitude
        const embeddedCrsName = (data as unknown as { crs?: { properties?: { name?: string } } })?.crs?.properties?.name;
        const srcName = (srcCrsFromDb || embeddedCrsName || '').toUpperCase();
        const needsUTM49S = srcName.includes('EPSG:32749') || srcName.includes('32749') || srcName.includes('EPSG::32749');
        const sample = (() => {
          const f = data!.features?.find((f) => f.geometry && 'coordinates' in f.geometry);
          if (!f) return null;
          const g = f.geometry;
          const peek = (coords: unknown): [number, number] | null => {
            if (!Array.isArray(coords)) return null;
            if (coords.length > 0 && typeof coords[0] === 'number' && typeof coords[1] === 'number') return [coords[0] as number, coords[1] as number];
            for (const c of coords as unknown[]) {
              const p = peek(c);
              if (p) return p;
            }
            return null;
          };
          return peek((g as { coordinates: unknown }).coordinates);
        })();
        const looksProjected = sample ? Math.abs(sample[0]) > 1000 || Math.abs(sample[1]) > 1000 : false;

        let result = data;
        if (needsUTM49S || looksProjected) {
          proj4.defs('EPSG:32749', '+proj=utm +zone=49 +south +datum=WGS84 +units=m +no_defs +type=crs');
          const transformCoord = (pt: number[]): [number, number] => {
            const x = pt[0];
            const y = pt[1];
            const [lon, lat] = proj4('EPSG:32749', 'EPSG:4326', [x, y]);
            return [lon, lat];
          };
          const reprojectGeometry = (geom: Record<string, unknown> | null | undefined): Record<string, unknown> | null | undefined => {
            if (!geom) return geom;
            const t = geom.type;
            const coords = geom.coordinates;
            const mapCoords = (arr: unknown): unknown => {
              if (!Array.isArray(arr)) return arr;
              if (arr.length > 0 && typeof arr[0] === 'number') return transformCoord(arr as number[]);
              return (arr as unknown[]).map((a) => mapCoords(a));
            };
            if (t === 'GeometryCollection') {
              return { type: 'GeometryCollection', geometries: (geom.geometries as unknown[]).map((g: unknown) => reprojectGeometry(g as Record<string, unknown>)) };
            }
            return { type: t, coordinates: mapCoords(coords) };
          };
          result = {
            type: 'FeatureCollection',
            features: (data.features as unknown[]).map((f) => {
              const feat = f as unknown as { properties: Record<string, unknown>; geometry: Record<string, unknown> };
              return {
                type: 'Feature',
                properties: feat.properties || {},
                geometry: reprojectGeometry(feat.geometry),
              };
            }),
          } as unknown as FeatureCollection;
        }

        // Build kecamatan boundary lines
        try {
          const getKecName = (p?: Record<string, unknown>): string | undefined =>
            (p?.KECAMATAN as string) || (p?.Kecamatan as string) || undefined;
          const groups = new Map<string, Array<Feature<Polygon | MultiPolygon>>>();
          for (const f of result.features as Array<Feature<Polygon | MultiPolygon>>) {
            const name = getKecName(f.properties as Record<string, unknown> | undefined);
            if (!name) continue;
            const arr = groups.get(name) || [];
            arr.push(f);
            groups.set(name, arr);
          }
          const lineFeatures: Array<Feature<LineString | MultiLineString>> = [];
          groups.forEach((features, name) => {
            try {
              for (const poly of features) {
                const line = turf.polygonToLine(poly as unknown as Feature<Polygon | MultiPolygon>) as Feature<LineString | MultiLineString>;
                line.properties = { ...(line.properties || {}), KECAMATAN: name };
                lineFeatures.push(line);
              }
            } catch (e) {
              console.warn('Failed to build kecamatan boundary for', name, sanitizeForLog(e));
            }
          });
          const kecLinesFC: FeatureCollection<Geometry> = {
            type: 'FeatureCollection',
            features: lineFeatures as unknown as Feature<Geometry>[],
          } as FeatureCollection<Geometry>;
          setKecamatanLines(kecLinesFC);
        } catch (e) {
          console.warn('Failed generating kecamatan lines', sanitizeForLog(e));
          setKecamatanLines(null);
        }

        setAdminGeoJson(result);
      } catch (err) {
        logger.error('Failed to load admin boundaries', sanitizeForLog(err));
        toast.error('Gagal memuat batas administratif', {
          description: 'Pastikan file data tersedia di /public/data/ciamis_kecamatan.geojson atau /public/data/adm_ciamis.geojson',
        });
      } finally {
        setAdminLoading(false);
      }
    };
    void loadAdminBoundaries();
  }, [overlays.adminBoundaries, adminGeoJson, kecamatanLines]);

  // When boundaries are first loaded and toggled on, fit the map to their extent for visibility
  useEffect(() => {
    if (!mapInstance) return;
    if (!overlays.adminBoundaries) return;
    if (!adminGeoJson) return;
    try {
      const tmp = L.geoJSON(adminGeoJson);
      const b = tmp.getBounds();
      if (b.isValid()) {
        mapInstance.fitBounds(b.pad(0.05));
      }
      // Clean up temporary layer
      tmp.remove();
    } catch (e) {
      console.warn('Failed to fit bounds', sanitizeForLog(e));
    }
    // run only on first availability of adminGeoJson while overlay is on
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapInstance, overlays.adminBoundaries, !!adminGeoJson, userLocation]);

  // Load list of available geo_layers to display as toggles and apply default visibility
  useEffect(() => {
    let cancelled = false;
    const cached = sessionStorage.getItem('map:availableLayers');
    if (cached) {
      try {
        const parsed: Array<{ key: string; name: string; geometry_type: string | null }> = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0 && !cancelled) {
          setAvailableLayers(parsed);
        }
      } catch {
        // ignore cache parse errors
      }
    }

    const loadList = async () => {
      try {
        const { data, error } = await supabase
          .from('geo_layers')
          .select('key,name,geometry_type,data')
          .order('created_at', { ascending: false });
        if (cancelled || error || !data) return;

        const rows = data as Array<{ key: string; name: string; geometry_type: string | null; data?: Record<string, unknown> | null }>;
        const layers = rows.filter((l) => l.key !== 'admin_boundaries');
        const mapped = layers.map(({ key, name, geometry_type }) => ({ key, name, geometry_type }));
        setAvailableLayers(mapped);
        sessionStorage.setItem('map:availableLayers', JSON.stringify(mapped));

        setOverlays((prev) => {
          const dyn = { ...(prev.dynamic || {}) } as Record<string, boolean>;
          let changed = false;
          for (const l of layers) {
            const visibility = Boolean(((l.data || undefined) as { meta?: { visibility_default?: boolean } } | undefined)?.meta?.visibility_default);
            const keyLower = l.key.toLowerCase();
            const allowAutoToggle = !keyLower.includes('sawah') && !keyLower.includes('padi');
            if (visibility && allowAutoToggle && typeof dyn[l.key] === 'undefined') {
              dyn[l.key] = true;
              changed = true;
            }
          }
          const hasAssets = layers.some((l) => l.key === 'assets');
          if (hasAssets && typeof dyn['assets'] === 'undefined') { dyn['assets'] = true; changed = true; }
          return changed ? { ...prev, dynamic: dyn } : prev;
        });
      } catch (e) {
        console.warn('Failed to load layers list', sanitizeForLog(e));
      }
    };

    if (!cached || cached === '[]') {
      void loadList();
    } else {
      void loadList();
    }

    return () => {
      cancelled = true;
    };
  }, []);

  // Lazy-load any toggled dynamic layer data and cache it
  useEffect(() => {
    const loadToggled = async () => {
      const dyn = overlays.dynamic || {};
      const keysToLoad = Object.entries(dyn)
        .filter(([, on]) => on)
        .map(([k]) => k);

      for (const key of keysToLoad) {
        // Skip if already loaded, loading, or previously errored
        if (dynamicData[key] || dynamicLoading[key] || layerErrorsRef.current.has(key)) continue;

        // Skip if already processed in this session
        if (processedLayersRef.current.has(key)) continue;

        processedLayersRef.current.add(key);
        setDynamicLoading((s) => ({ ...s, [key]: true }));

        try {
          // Fetch full layer data
          const { data: fullLayer, error: layerError } = await supabase
            .from('geo_layers')
            .select('data')
            .eq('key', key)
            .limit(1)
            .maybeSingle();

          let fc: FeatureCollection<Geometry> | null = null;
          let srcCrs: string | undefined = undefined;
          let raw: Record<string, unknown> | null = null;

          if (!layerError && fullLayer) {
            raw = fullLayer.data as unknown as Record<string, unknown>;

            // CRITICAL: Extract and store style FIRST before anything else
            const dataStyle = (raw?.style || {}) as Record<string, unknown>;
            const geomType = availableLayers.find((l) => l.key === key)?.geometry_type || '';

            const styleConfig: LayerStyleConfig = {};
            if (/Point/i.test(geomType)) {
              const pt = dataStyle.point as Record<string, unknown> | undefined;
              if (pt) {
                styleConfig.color = pt.color as string;
                styleConfig.fillColor = pt.fillColor as string;
                styleConfig.fillOpacity = pt.fillOpacity as number;
                styleConfig.radius = pt.radius as number;
                styleConfig.weight = pt.weight as number;
              }
            } else if (/LineString/i.test(geomType)) {
              const ln = dataStyle.line as Record<string, unknown> | undefined;
              if (ln) {
                styleConfig.color = ln.color as string;
                styleConfig.weight = ln.weight as number;
                styleConfig.opacity = ln.opacity as number;
                styleConfig.dashArray = ln.dashArray as string;
              }
            } else if (/Polygon/i.test(geomType)) {
              const pg = dataStyle.polygon as Record<string, unknown> | undefined;
              if (pg) {
                styleConfig.color = pg.color as string;
                styleConfig.weight = pg.weight as number;
                styleConfig.opacity = pg.opacity as number;
                styleConfig.fillColor = pg.fillColor as string;
                styleConfig.fillOpacity = pg.fillOpacity as number;
              }
            }

            // Store style SYNCHRONOUSLY before setting data
            if (Object.keys(styleConfig).length > 0) {
              logger.info(`[MapView] Loading style for ${key}:`, styleConfig);
              setDynamicStyle((s) => {
                const next = { ...s, [key]: styleConfig };
                try {
                  sessionStorage.setItem('map:layerStyles', JSON.stringify(next));
                } catch (error) {
                  // Ignore session storage errors
                  console.debug('Session storage error:', error);
                }
                return next;
              });
              // Wait for state update before loading data
              await new Promise(resolve => setTimeout(resolve, 50));
            }

            // Now extract FeatureCollection

            raw = fullLayer.data as unknown as Record<string, unknown>;
            if (raw && typeof raw === 'object' && 'featureCollection' in raw) {
              const wrapper = raw as { featureCollection?: unknown; crs?: string };
              if (wrapper.featureCollection && (wrapper.featureCollection as { type?: string }).type === 'FeatureCollection') {
                fc = wrapper.featureCollection as FeatureCollection<Geometry>;
                srcCrs = typeof wrapper.crs === 'string' ? wrapper.crs : undefined;
              }
            }
            if (!fc) {
              if ((raw as { type?: string }).type === 'FeatureCollection') {
                fc = raw as unknown as FeatureCollection<Geometry>;
              } else if (raw && typeof raw === 'object') {
                const vals = Object.values(raw);
                const found = vals.find((v) => !!v && typeof v === 'object' && (v as { type?: string }).type === 'FeatureCollection');
                if (found) fc = found as FeatureCollection<Geometry>;
              }
            }
          }

          if (!fc && key === 'assets') {
            try {
              const { data: assetRows, error: assetError } = await supabase
                .from('assets')
                .select('id,code,name,category,status,latitude,longitude,keterangan,created_at')
                .order('created_at', { ascending: false });
              if (!assetError && assetRows) {
                const rows = assetRows as AssetRow[];
                const features = rows
                  .map((row) => {
                    const rawLat = row.latitude as unknown;
                    const rawLon = row.longitude as unknown;
                    const lat =
                      typeof rawLat === 'number'
                        ? rawLat
                        : typeof rawLat === 'string'
                          ? parseFloat(rawLat)
                          : null;
                    const lon =
                      typeof rawLon === 'number'
                        ? rawLon
                        : typeof rawLon === 'string'
                          ? parseFloat(rawLon)
                          : null;
                    if (lat === null || lon === null || Number.isNaN(lat) || Number.isNaN(lon)) {
                      return null;
                    }
                    return {
                      type: 'Feature',
                      geometry: {
                        type: 'Point',
                        coordinates: [lon, lat],
                      },
                      properties: {
                        id: row.id,
                        code: row.code,
                        name: row.name,
                        category: row.category,
                        status: row.status,
                        keterangan: row.keterangan,
                        created_at: row.created_at,
                      },
                    } as Feature<Geometry>;
                  })
                  .filter((f): f is Feature<Geometry> => Boolean(f));
                fc = {
                  type: 'FeatureCollection',
                  features,
                } as FeatureCollection<Geometry>;
              } else if (assetError) {
                console.warn('Failed to fetch assets fallback layer', sanitizeForLog(assetError));
              }
            } catch (assetFallbackError) {
              console.warn('Failed to build assets feature collection', sanitizeForLog(assetFallbackError));
            }
          }

          if (fc) {
            // EPSG defs we support
            proj4.defs('EPSG:4326', '+proj=longlat +datum=WGS84 +no_defs');
            proj4.defs('EPSG:3857', '+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +no_defs');
            proj4.defs('EPSG:32749', '+proj=utm +zone=49 +south +datum=WGS84 +units=m +no_defs +type=crs');

            // Decide source CRS: prefer stored srcCrs, fallback to embedded fc.crs.name, then heuristic
            const embeddedCrsName = (fc as unknown as { crs?: { properties?: { name?: string } } })?.crs?.properties?.name;
            const src = (srcCrs || embeddedCrsName || '').toUpperCase();
            const isEPSG4326 = src.includes('EPSG:4326');
            const isEPSG3857 = src.includes('EPSG:3857') || src.includes('EPSG:900913');
            const isEPSG32749 = src.includes('EPSG:32749') || src.includes('EPSG::32749') || src.includes('32749');
            const sample = (() => {
              const f = fc!.features?.find((f) => f.geometry && 'coordinates' in f.geometry);
              if (!f) return null;
              const g = f.geometry as unknown as { coordinates?: unknown };
              const peek = (coords: unknown): [number, number] | null => {
                if (!Array.isArray(coords)) return null;
                if (coords.length > 0 && typeof coords[0] === 'number' && typeof coords[1] === 'number') {
                  return [coords[0] as number, coords[1] as number];
                }
                for (const c of coords as unknown[]) {
                  const p = peek(c);
                  if (p) return p;
                }
                return null;
              };
              return peek(g.coordinates);
            })();
            const looksProjected = sample ? Math.abs(sample[0]) > 1000 || Math.abs(sample[1]) > 1000 : false;

            let resultFC = fc as FeatureCollection<Geometry>;
            // Determine transform only when needed
            const needTransform = isEPSG3857 || isEPSG32749 || (!isEPSG4326 && looksProjected);
            if (needTransform) {
              const from = isEPSG3857 ? 'EPSG:3857' : (isEPSG32749 ? 'EPSG:32749' : 'EPSG:32749');
              const transformCoord = (pt: number[]): [number, number] => {
                const [x, y] = pt;
                const [lon, lat] = proj4(from, 'EPSG:4326', [x, y]);
                return [lon, lat];
              };
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const reprojectGeometry = (geom: any): any => {
                if (!geom) return geom;
                const t = geom.type;
                const coords = geom.coordinates;
                const mapCoords = (arr: unknown): unknown => {
                  if (!Array.isArray(arr)) return arr;
                  if (arr.length > 0 && typeof arr[0] === 'number') return transformCoord(arr as number[]);
                  return (arr as unknown[]).map((a) => mapCoords(a));
                };
                if (t === 'GeometryCollection') {
                  return { type: 'GeometryCollection', geometries: geom.geometries.map((g: unknown) => reprojectGeometry(g)) };
                }
                return { type: t, coordinates: mapCoords(coords) };
              };
              resultFC = {
                type: 'FeatureCollection',
                features: fc.features.map((f) => ({
                  type: 'Feature',
                  properties: f.properties || {},
                  geometry: reprojectGeometry(f.geometry),
                })) as unknown as Feature<Geometry>[],
              } as FeatureCollection<Geometry>;
            }
            setDynamicData((s) => ({ ...s, [key]: resultFC }));
          } else {
            // Mark as errored to prevent retry loops
            layerErrorsRef.current.add(key);
            processedLayersRef.current.delete(key);

            // Show ONE toast with unique ID
            const toastId = `layer-error-${key}`;
            toast.error(`Gagal memuat layer: ${key}`, {
              id: toastId,
              description: key === 'assets'
                ? (!layerError && !fullLayer?.data
                  ? 'Tidak ditemukan data aset. Tambahkan aset dari GeoData Manager terlebih dahulu.'
                  : 'Data aset belum tersedia atau koordinat aset belum lengkap.')
                : 'Format data tidak dikenali. Harap unggah GeoJSON FeatureCollection atau ZIP Shapefile.',
            });

            // Auto-remove from overlays to prevent re-render attempts
            setOverlays(prev => {
              const nextDynamic = { ...prev.dynamic };
              delete nextDynamic[key];
              return { ...prev, dynamic: nextDynamic };
            });
          }
        } catch (e) {
          console.warn('Failed to load layer', key, sanitizeForLog(e));

          // Mark as errored
          layerErrorsRef.current.add(key);
          processedLayersRef.current.delete(key);

          const toastId = `layer-error-${key}`;
          toast.error(`Gagal memuat layer: ${key}`, {
            id: toastId,
            description: key === 'assets'
              ? 'Terjadi kesalahan saat mengambil data aset.'
              : undefined,
          });

          // Auto-remove from overlays
          setOverlays(prev => {
            const nextDynamic = { ...prev.dynamic };
            delete nextDynamic[key];
            return { ...prev, dynamic: nextDynamic };
          });
        } finally {
          setDynamicLoading((s) => ({ ...s, [key]: false }));
        }
      }
    };
    void loadToggled();
  }, [overlays.dynamic, dynamicData, dynamicLoading, availableLayers]);

  // Attach map interactions once map instance is ready
  useEffect(() => {
    if (!mapInstance) return;
    const onMove = (e: L.LeafletMouseEvent) => setCursorLatLng([e.latlng.lat, e.latlng.lng]);
    const onContext = (e: L.LeafletMouseEvent) => {
      e.originalEvent.preventDefault();
      setCtxOpen(true);
      setCtxPoint({ x: e.containerPoint.x, y: e.containerPoint.y });
      setCtxLatLng([e.latlng.lat, e.latlng.lng]);
      setCtxAddress(null);
      setCtxLoading(false);
    };
    mapInstance.on('mousemove', onMove);
    mapInstance.on('contextmenu', onContext);
    return () => {
      mapInstance.off('mousemove', onMove);
      mapInstance.off('contextmenu', onContext);
    };
  }, [mapInstance]);

  // Custom scale control with Indonesian format
  useEffect(() => {
    if (!mapInstance) return;

    // Remove default scale control
    const existingScale = document.querySelector('.leaflet-control-scale');
    if (existingScale) existingScale.remove();

    // Create custom scale element
    const scaleDiv = document.createElement('div');
    scaleDiv.className = 'custom-scale-control';
    scaleDiv.style.cssText = `
      position: absolute;
      bottom: 72px;
      left: 16px;
      z-index: 850;
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 0.75rem;
      padding: 8px 12px;
      box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
      font-size: 11px;
      font-weight: 600;
      color: rgba(0, 0, 0, 0.9);
      font-family: system-ui, -apple-system, sans-serif;
      pointer-events: none;
    `;

    const updateScale = () => {
      const zoom = mapInstance.getZoom();
      const scale = 40075017 * Math.cos(mapInstance.getCenter().lat * Math.PI / 180) / Math.pow(2, zoom + 8);
      const roundedScale = Math.round(scale / 100) * 100;
      scaleDiv.textContent = `Skala 1 : ${roundedScale.toLocaleString('id-ID')}`;
    };

    mapInstance.on('zoomend moveend', updateScale);
    updateScale();

    const mapContainer = mapInstance.getContainer();
    mapContainer.appendChild(scaleDiv);

    return () => {
      mapInstance.off('zoomend moveend', updateScale);
      scaleDiv.remove();
    };
  }, [mapInstance]);


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
      .order('created_at', { ascending: false })
      .limit(1000);

    if (!error && data) {
      setReports(data as Report[]);
      // Set timeFilterDate ke tanggal paling akhir laporan agar semua titik langsung tampil
      if (Array.isArray(data) && data.length > 0) {
        const maxDate = data.reduce((max, r) => {
          const d = new Date(r.created_at);
          return d > max ? d : max;
        }, new Date(data[0].created_at));
        setTimeFilterDate(maxDate);
      }
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
          logger.info('Error getting location:', sanitizeForLog(error));
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

      // Hilangkan filter 7 hari, tampilkan semua laporan

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
  }, [reports, filters, drawnPolygon]);

  // Build or rebuild cluster layer when toggled or data changes
  useEffect(() => {
    if (!mapInstance) return;
    if (clusterLayer) {
      mapInstance.removeLayer(clusterLayer);
      setClusterLayer(null);
    }
    if (!overlays.clustering) return;

    // Get cluster radius from settings or use default
    let clusterRadius = 80;
    try {
      const stored = window.localStorage.getItem(MAP_PREFS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as { clusterRadius?: number };
        if (parsed.clusterRadius) clusterRadius = parsed.clusterRadius;
      }
    } catch (e) {
      console.warn('Failed to load cluster radius', sanitizeForLog(e));
    }

    const mcg = new L.MarkerClusterGroup({
      chunkedLoading: true,
      maxClusterRadius: clusterRadius,
      showCoverageOnHover: true,
      spiderfyOnMaxZoom: true,
      iconCreateFunction: createClusterCustomIcon,
    }) as L.MarkerClusterGroup;
    filteredReports.forEach((r) => {
      const marker = L.marker([r.latitude, r.longitude], {
        icon: createCustomIcon(r.category, r.status, r.severity),
      }).on('click', () => setSelectedReport(r));
      mcg.addLayer(marker);
    });
    mcg.addTo(mapInstance);
    setClusterLayer(mcg);
    return () => {
      if (mapInstance && mcg) {
        mapInstance.removeLayer(mcg);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapInstance, overlays.clustering, filteredReports]);

  // Build or rebuild heatmap layer when toggled or data changes
  useEffect(() => {
    if (!mapInstance) return;
    if (heatLayer) {
      mapInstance.removeLayer(heatLayer);
      setHeatLayer(null);
    }
    if (!overlays.heatmap) return;

    // Get heatmap radius from settings or use default
    let heatmapRadius = 25;
    try {
      const stored = window.localStorage.getItem(MAP_PREFS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as { heatmapRadius?: number };
        if (parsed.heatmapRadius) heatmapRadius = parsed.heatmapRadius;
      }
    } catch (e) {
      console.warn('Failed to load heatmap radius', sanitizeForLog(e));
    }

    const pts: Array<[number, number, number]> = filteredReports.map((r) => [r.latitude, r.longitude, 0.6]);
    const hl = L.heatLayer(pts, { radius: heatmapRadius, blur: 15, maxZoom: 17, minOpacity: 0.25 }) as L.Layer;
    hl.addTo(mapInstance);
    setHeatLayer(hl);
    return () => {
      if (mapInstance && hl) {
        mapInstance.removeLayer(hl);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapInstance, overlays.heatmap, filteredReports]);

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

  const handleExport = async (opts?: { filename?: string; includeControls?: boolean; scale?: number }) => {
    if (!mapInstance) return;

    try {
      toast.loading('Mengekspor peta...');
      const filename = opts?.filename || `map-export-${format(new Date(), 'yyyy-MM-dd')}.png`;
      await exportMapToPNG(mapInstance, { filename, includeControls: opts?.includeControls ?? true, scale: opts?.scale ?? 1 });
      toast.dismiss();
      toast.success('Peta berhasil diekspor!');
    } catch (error) {
      toast.dismiss();
      toast.error('Gagal mengekspor peta');
    }
  };

  return (
    <div className="min-h-screen bg-background page-transition">
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6 space-y-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Peta Laporan dan Infrastruktur SDA</h1>
            <p className="text-muted-foreground">
              Lihat semua laporan dan sebaran infrastruktur SDA di peta interaktif
            </p>
          </div>

          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4 flex-wrap">
              {statusSummary.map(({ key, label, value, icon: Icon, tone }) => (
                <div key={key} className="flex items-center gap-2 px-4 py-2 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-lg border shadow-sm">
                  <Icon className={`h-5 w-5 ${tone}`} />
                  <div>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="text-lg font-bold">{loading ? '...' : value}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3">
              {categoryCounts.length > 0 && (
                <div className="px-4 py-2 bg-blue-50/80 dark:bg-primary/20 backdrop-blur-sm rounded-lg border border-blue-200 dark:border-primary">
                  <p className="text-xs text-primary dark:text-blue-400 font-medium mb-1">Kategori Teratas</p>
                  <div className="flex gap-3">
                    {categoryCounts.map(([cat, count]) => (
                      <div key={cat} className="text-xs">
                        <span className="font-semibold text-primary dark:text-blue-100">{count}</span>
                        <span className="text-primary dark:text-blue-400 ml-1">{cat}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {locationCounts.length > 0 && (
                <div className="px-4 py-2 bg-purple-50/80 dark:bg-purple-950/30 backdrop-blur-sm rounded-lg border border-purple-200 dark:border-purple-800">
                  <p className="text-xs text-purple-600 dark:text-purple-400 font-medium mb-1">Lokasi Teratas</p>
                  <div className="flex gap-3">
                    {locationCounts.map(([loc, count]) => (
                      <div key={loc} className="text-xs">
                        <span className="font-semibold text-purple-900 dark:text-purple-100">{count}</span>
                        <span className="text-purple-600 dark:text-purple-400 ml-1">{loc.slice(0, 15)}{loc.length > 15 ? '...' : ''}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {recentReports.length > 0 && (
                <div className="px-4 py-2 bg-green-50/80 dark:bg-green-950/30 backdrop-blur-sm rounded-lg border border-green-200 dark:border-green-800">
                  <p className="text-xs text-green-600 dark:text-green-400 font-medium mb-1">Laporan Terbaru</p>
                  <p className="text-xs text-green-900 dark:text-green-100">
                    <span className="font-semibold">{recentReports[0].title.slice(0, 30)}{recentReports[0].title.length > 30 ? '...' : ''}</span>
                    <span className="text-green-600 dark:text-green-400 ml-1">• {format(new Date(recentReports[0].created_at), 'HH:mm')}</span>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className={`relative rounded-lg overflow-hidden shadow-lg border ${isMobile ? 'h-[calc(100dvh-120px)]' : 'h-[calc(100vh-180px)]'} ${activeMapTool ? 'cursor-crosshair' : ''}`}>
          <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            className={`h-full w-full ${activeMapTool ? 'cursor-crosshair' : ''}`}
            zoomControl={false}
            ref={setMapInstance}
          >
            <FlyToLocation center={mapCenter} zoom={mapZoom} />
            <BasemapSwitcher onBasemapChange={setBasemap} initialBasemap={basemap} />

            {isMobile && (
              <MobileMapControls
                onZoomIn={() => mapInstance?.zoomIn()}
                onZoomOut={() => mapInstance?.zoomOut()}
                onLocate={goToUserLocation}
              />
            )}

            {/* Legend now integrated in ModernMapOverlay */}
            {/* DrawControls removed */}

            {/* Administrative boundaries overlay (under markers) */}
            {overlays.adminBoundaries && adminGeoJson && (
              <Pane name="admin-boundaries" style={{ zIndex: 350 }}>
                <RLGeoJSON
                  key="admin-boundaries"
                  data={adminGeoJson}
                  style={() => ({
                    // Indonesia guideline approximation:
                    // Desa: tipis abu-abu
                    color: '#6b7280',
                    weight: 1,
                    opacity: 0.8,
                    dashArray: '4 3',
                    fillOpacity: 0,
                  })}
                  onEachFeature={(feature, layer) => {
                    const p = feature.properties as Record<string, unknown> | undefined;
                    const featureId = `admin-${Math.random().toString(36).substr(2, 9)}`;

                    registerLayer(featureId, layer, {
                      color: '#6b7280',
                      weight: 1,
                      opacity: 0.8,
                      fillOpacity: 0,
                    });

                    const name =
                      (p?.DESA_1 as string) ||
                      (p?.DESA as string) ||
                      (p?.KECAMATAN as string) ||
                      (p?.Kecamatan as string) ||
                      (p?.name as string) ||
                      (p?.NAMOBJ as string) ||
                      undefined;
                    if (name) {
                      layer.bindTooltip(String(name), { sticky: true, direction: 'center', className: 'bg-black/60 text-white px-1 py-0.5 rounded border text-[11px]' });
                    }

                    layer.on('click', () => {
                      setSelectedLayer({ id: featureId, feature, layer });
                    });

                    layer.on('mouseover', () => {
                      const anyLayer = layer as unknown as { setStyle?: (opts: L.PathOptions) => void };
                      if (typeof anyLayer.setStyle === 'function') anyLayer.setStyle({ weight: 2, color: '#111827' });
                    });
                    layer.on('mouseout', () => {
                      if (selectedLayer?.id !== featureId) {
                        const anyLayer = layer as unknown as { setStyle?: (opts: L.PathOptions) => void };
                        if (typeof anyLayer.setStyle === 'function') anyLayer.setStyle({ weight: 1, color: '#6b7280' });
                      }
                    });
                    layer.on('remove', () => {
                      unregisterLayer(featureId);
                    });
                  }}
                />
              </Pane>
            )}

            {/* Kecamatan boundary lines (dashed thicker) */}
            {overlays.adminBoundaries && kecamatanLines && (
              <Pane name="kecamatan-boundaries" style={{ zIndex: 360, pointerEvents: 'none' }}>
                <RLGeoJSON
                  key="kecamatan-boundaries"
                  data={kecamatanLines}
                  style={() => ({
                    color: '#111827',
                    weight: 2,
                    opacity: 0.9,
                    dashArray: '6 4',
                  })}
                />
              </Pane>
            )}

            {/* Render any toggled dynamic layers */}
            {renderedLayers}

            {/* Render plain markers only when clustering is off */}
            {!overlays.clustering && filteredReports.map((report) => (
              <Marker
                key={report.id}
                position={[report.latitude, report.longitude]}
                icon={createCustomIcon(report.category, report.status, report.severity)}
                eventHandlers={{ click: () => setSelectedReport(report) }}
              >
                <Popup>
                  <div className="p-2">
                    <h3 className="font-semibold text-sm mb-1">{report.title}</h3>
                    <p className="text-xs text-muted-foreground mb-2">{report.category}</p>
                    <Button size="sm" onClick={() => setSelectedReport(report)} className="w-full">Lihat Detail</Button>
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
            {/* OSRM Routing Path */}
            {routingPath && (
              <Polyline
                positions={routingPath}
                pathOptions={{ color: '#3b82f6', weight: 6, opacity: 0.8, dashArray: '10, 10' }}
              />
            )}

            {/* Map Interaction Layer - handles measuring inside MapContainer */}
            <MapInteractionLayer
              activeMapTool={activeMapTool}
              onPolygonDrawn={(polygon) => {
                setDrawnPolygon(polygon);
                toast.success('Polygon berhasil digambar');
              }}
              onMeasurement={(measurement) => {
                if (measurement.distance) {
                  toast.success(`Jarak: ${measurement.distance.toFixed(2)} km`);
                }
                if (measurement.area) {
                  toast.success(`Luas: ${measurement.area.toFixed(3)} km²`);
                }
              }}
            />

            {/* Geoman Drawing Controls */}
            <GeomanControls
              enabled={showGeomanDraw}
              onPolygonDrawn={(polygon) => {
                setDrawnPolygon(polygon);
              }}
              onDrawModeChange={setGeomanDrawMode}
            />
          </MapContainer>

          <ModernMapOverlay
            showSearch={showSearchPanel}
            onToggleSearch={() => {
              setShowSearchPanel((v) => !v);
              setShowFilterPanel(false);
              setShowOverlayPanel(false);
            }}
            canLocate={!!userLocation}
            onLocate={goToUserLocation}
            onToggleFilters={() => {
              setShowFilterPanel((v) => !v);
              setShowSearchPanel(false);
              setShowOverlayPanel(false);
            }}
            onToggleOverlays={() => {
              setShowOverlayPanel((v) => !v);
              setShowSearchPanel(false);
              setShowFilterPanel(false);
            }}
            onToggleDrawing={() => {
              setShowGeomanDraw(prev => !prev);
              setActiveMapTool(null);
              setShowSpatialAnalysis(false);
              setShowRouteOptimization(false);
            }}
            drawToolbarContent={
              mapInstance && showGeomanDraw ? (
                <DrawToolbar visible={showGeomanDraw} activeMode={geomanDrawMode} map={mapInstance} />
              ) : null
            }
            onShare={handleShare}
            onExport={() => handleExport()}
            minDate={minDate}
            maxDate={maxDate}
            currentDate={timeFilterDate}
            onDateChange={setTimeFilterDate}
            totalDays={Math.max(0, differenceInCalendarDays(maxDate, minDate))}
            sliderValue={sliderValue}
            onSliderChange={(value) => {
              const days = value[0];
              setSliderValue(days);
              const newDate = addDays(minDate, days);
              setTimeFilterDate(newDate);
            }}
            isPlaying={isPlaying}
            onPlayPause={() => setIsPlaying(!isPlaying)}
            onStepPrev={() => {
              setIsPlaying(false);
              setSliderValue((prev) => {
                const next = Math.max(0, prev - 1);
                setTimeFilterDate(addDays(minDate, next));
                return next;
              });
            }}
            onStepNext={() => {
              setIsPlaying(false);
              setSliderValue((prev) => {
                const totalDays = Math.max(0, differenceInCalendarDays(maxDate, minDate));
                const next = Math.min(totalDays, prev + 1);
                setTimeFilterDate(addDays(minDate, next));
                return next;
              });
            }}
            onReset={() => {
              setIsPlaying(false);
              setSliderValue(0);
              setTimeFilterDate(minDate);
            }}
            legendOverlays={legendOverlays}
            statusCounts={statusCounts}
          />


          {/* Search panel centered below toolbar */}
          {showSearchPanel && (
            <div className={`absolute z-[1200] top-20 left-1/2 -translate-x-1/2 ${isMobile ? 'w-[calc(100%-1rem)]' : 'w-auto'}`}>
              <MapSearch
                onSelect={(lat, lon, label) => {
                  setMapCenter([lat, lon]);
                  setMapZoom(16);
                  setShowSearchPanel(false);
                  toast.success('Pergi ke lokasi', { description: label });
                }}
                onClose={() => setShowSearchPanel(false)}
              />
            </div>
          )}

          {/* Clear Route Button */}
          {routingPath && (
            <div className="absolute z-[1200] top-40 right-4">
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={() => setRoutingPath(null)}
                className="glass-floating shadow-lg font-bold"
              >
                Hapus Rute
              </Button>
            </div>
          )}
          {showFilterPanel && (
            <FilterPanel
              filters={filters}
              onFilterChange={(newFilters) => {
                setFilters(newFilters);
                const url = generateShareableURL({
                  center: mapCenter,
                  zoom: mapZoom,
                  category: newFilters.category,
                  status: newFilters.status,
                  dateFrom: newFilters.dateFrom,
                  dateTo: newFilters.dateTo,
                  selectedReportId: selectedReport?.id,
                  basemap,
                });
                window.history.replaceState({}, '', url);
                setShowFilterPanel(false);
              }}
              onClose={() => setShowFilterPanel(false)}
            />
          )}
          {showOverlayPanel && (
            <OverlayToggle
              overlays={overlays}
              onOverlayChange={setOverlays}
              availableLayers={availableLayers.map(({ key, name }) => ({ key, name }))}
              onClose={() => setShowOverlayPanel(false)}
            />
          )}

          {/* Floating detail card (left-aligned on desktop) */}
          {selectedReport && (
            <div
              className={`absolute z-[1300] ${isMobile
                ? 'bottom-32 left-2 right-2'
                : 'top-24 left-4'
                }`}
            >
              <div className="max-w-[42rem]">
                <ReportDetailDrawer 
                  report={selectedReport} 
                  onClose={() => setSelectedReport(null)} 
                  onRoute={() => fetchRoute([selectedReport.latitude, selectedReport.longitude])}
                />
              </div>
            </div>
          )}

          {/* Layer Detail Drawer */}
          <LayerDetailDrawer
            isOpen={!!selectedLayer}
            onClose={() => setSelectedLayer(null)}
            feature={(selectedLayer?.feature as GeoJSON.Feature<Geometry, Record<string, unknown>>) || null}
            onZoomToFeature={handleZoomToLayer}
          />

          {/* Spatial Analysis Panel */}
          {showSpatialAnalysis && (
            <SpatialAnalysisPanel
              reports={filteredReports.map(r => ({
                id: r.id,
                coords: [r.latitude, r.longitude],
                category: r.category,
                status: r.status,
              }))}
              onBufferCreated={(buffer) => {
                if (!mapInstance) return;
                L.geoJSON(buffer, {
                  style: { color: '#3b82f6', weight: 2, fillOpacity: 0.1 }
                }).addTo(mapInstance);
                toast.success('Buffer zone berhasil dibuat');
              }}
              onDensityCalculated={(cells) => {
                setDensityCells(cells);
                toast.success(`${cells.length} density cells dihitung`);
              }}
              onStatsCalculated={(stats) => {
                toast.success('Analisis statistik selesai', {
                  description: `NNI: ${stats.nni.toFixed(3)} - ${stats.clustered ? 'Clustered' : 'Dispersed'}`
                });
              }}
              onClose={() => setShowSpatialAnalysis(false)}
            />
          )}

          {/* Route Optimization Panel */}
          {showRouteOptimization && (
            <RouteOptimizationPanel
              reports={filteredReports.map(r => ({
                id: r.id,
                title: r.title,
                coords: [r.latitude, r.longitude],
                category: r.category,
                status: r.status,
                severity: r.severity || undefined,
              }))}
              onRouteGenerated={(route) => {
                if (mapInstance) {
                  const coords = route.points.map(p => [p.coords[0], p.coords[1]] as [number, number]);
                  L.polyline(coords, {
                    color: '#10b981',
                    weight: 4,
                    opacity: 0.8,
                  }).addTo(mapInstance);

                  route.points.forEach((point, idx) => {
                    L.marker([point.coords[0], point.coords[1]], {
                      icon: L.divIcon({
                        html: `<div style="background: #10b981; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px;">${idx + 1}</div>`,
                        className: 'route-marker',
                        iconSize: [24, 24],
                      })
                    }).addTo(mapInstance);
                  });
                }
              }}
              onClose={() => setShowRouteOptimization(false)}
            />
          )}



          {/* Multi-Layer Heatmap */}
          {multiLayerHeatmap && (
            <MultiLayerHeatmap
              points={filteredReports.map(r => ({
                coords: [r.latitude, r.longitude],
                category: r.category,
                severity: r.severity || undefined,
              }))}
              enabled={multiLayerHeatmap}
              categories={Array.from(new Set(reports.map(r => r.category)))}
            />
          )}

          {/* Density Visualization */}
          {densityCells.length > 0 && (
            <Pane name="density-cells" style={{ zIndex: 370 }}>
              {densityCells.map(cell => (
                <RLGeoJSON
                  key={cell.id}
                  data={{
                    type: 'Feature',
                    properties: { count: cell.count },
                    geometry: cell.geometry,
                  } as Feature<Geometry>}
                  style={() => {
                    const opacity = Math.min(cell.count / 10, 1);
                    return {
                      fillColor: '#ef4444',
                      fillOpacity: opacity * 0.6,
                      color: '#dc2626',
                      weight: 1,
                    };
                  }}
                  onEachFeature={(feature, layer) => {
                    layer.bindTooltip(`${cell.count} laporan`, { sticky: true });
                  }}
                />
              ))}
            </Pane>
          )}

          {/* Coordinates readout below scale at bottom-left */}
          {cursorLatLng && !selectedReport && (
            <div className="absolute bottom-4 left-4 z-[800] bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-white/20 rounded-lg px-3 py-1.5 text-[10px] font-mono shadow-xl pointer-events-none">
              <div className="text-[9px] uppercase tracking-wide text-muted-foreground mb-0.5">Koordinat</div>
              <div className="font-semibold">{cursorLatLng[0].toFixed(5)}, {cursorLatLng[1].toFixed(5)}</div>
            </div>
          )}

          {/* Scale bar via custom control */}
          {mapInstance && null}

          {/* Context menu */}
          {ctxOpen && ctxPoint && ctxLatLng && (
            <div
              className="absolute z-[1002] bg-background border rounded shadow-lg p-2 text-sm w-64"
              style={{ left: ctxPoint.x, top: ctxPoint.y }}
              onMouseLeave={() => setCtxOpen(false)}
            >
              <div className="font-medium mb-1">Koordinat</div>
              <div className="font-mono text-xs mb-2">{ctxLatLng[0].toFixed(6)}, {ctxLatLng[1].toFixed(6)}</div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    await navigator.clipboard.writeText(`${ctxLatLng[0]}, ${ctxLatLng[1]}`);
                    toast.success('Koordinat disalin');
                    setCtxOpen(false);
                  }}
                >
                  Salin koordinat
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    setCtxLoading(true);
                    const res = await reverseGeocode(ctxLatLng[0], ctxLatLng[1]);
                    setCtxLoading(false);
                    if (res) {
                      setCtxAddress(res.display_name);
                    } else {
                      toast.error('Gagal mendapatkan alamat');
                    }
                  }}
                >
                  {ctxLoading ? 'Mencari...' : 'Lihat alamat'}
                </Button>
              </div>
              {ctxAddress && (
                <div className="mt-2 text-xs text-muted-foreground">{ctxAddress}</div>
              )}
            </div>
          )}

          {/* Loading indicators - stacked vertically top-center */}
          {(loading || adminLoading || Object.entries(dynamicLoading).some(([k, v]) => overlays.dynamic?.[k] && v)) && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[1100] flex flex-col gap-2 pointer-events-none">
              {loading && (
                <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700 rounded-lg px-4 py-2 shadow-xl">
                  <div className="flex items-center gap-2 text-sm text-white">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="font-medium">Memuat laporan...</span>
                  </div>
                </div>
              )}
              {adminLoading && overlays.adminBoundaries && (
                <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700 rounded-lg px-4 py-2 shadow-xl">
                  <div className="flex items-center gap-2 text-sm text-white">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="font-medium">Memuat batas administratif...</span>
                  </div>
                </div>
              )}
              {Object.entries(dynamicLoading).some(([k, v]) => overlays.dynamic?.[k] && v) && (
                <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700 rounded-lg px-4 py-2 shadow-xl">
                  <div className="flex items-center gap-2 text-sm text-white">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="font-medium">Memuat layer geospasial...</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MapView;
