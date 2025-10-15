import { useEffect, useState, useMemo } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { MapContainer, Marker, Popup, useMap, GeoJSON as RLGeoJSON, Pane } from 'react-leaflet';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader as Loader2, FileText, Clock, CheckCircle } from 'lucide-react';
import L from 'leaflet';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.markercluster';
import 'leaflet.heat';
import 'leaflet/dist/leaflet.css';
import { BasemapSwitcher } from '@/components/map/BasemapSwitcher';
import type { BasemapType } from '@/components/map/basemap-config';
import { Legend, type LegendOverlayItem } from '@/components/map/Legend';
import { reverseGeocode } from '@/lib/geocoding';
import { MapToolbar } from '@/components/map/MapToolbar';
import type { MapFilters } from '@/components/map/FilterPanel';
import { MapSearch } from '@/components/map/MapSearch';
import { FilterPanel } from '@/components/map/FilterPanel';
import { OverlayToggle, type MapOverlays } from '@/components/map/OverlayToggle';
import { TimeSlider } from '@/components/map/TimeSlider';
// Overlays via sidebar are currently disabled
import { ReportDetailDrawer } from '@/components/map/ReportDetailDrawer';
import { exportMapToPNG, generateShareableURL, parseURLParams } from '@/lib/mapExport';
import { toast } from 'sonner';
import * as turf from '@turf/turf';
import { format, isAfter, isBefore, startOfDay, subDays } from 'date-fns';
import type { FeatureCollection, Geometry, Feature, Polygon, MultiPolygon, LineString, MultiLineString } from 'geojson';
import proj4 from 'proj4';

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

const createCustomIcon = (category: string, status: string, severity?: Report['severity']) => {
  const colors = {
    baru: '#f59e0b',
    diproses: '#3b82f6',
    selesai: '#10b981',
  } as const;

  const color = colors[status as keyof typeof colors] || '#6b7280';
  const sevColors: Record<NonNullable<Report['severity']>, string> = {
    ringan: '#22c55e',
    sedang: '#f97316',
    berat: '#ef4444',
  };
  const sevBorder = severity ? sevColors[severity] : '#9ca3af';
  const statusLabel = (() => {
    if (status === 'baru') return 'B';
    if (status === 'diproses') return 'P';
    if (status === 'selesai') return 'S';
    return category?.charAt(0)?.toUpperCase() ?? 'L';
  })();

  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        background-color: ${color};
        width: 28px;
        height: 28px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 2px solid ${sevBorder};
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;">
        <span style="transform: rotate(45deg); font-size: 12px; font-weight:600; color: white;">${statusLabel}</span>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -24],
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

  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
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

        if (!adminChanged && !dynamicChanged) {
          return prev;
        }

        return {
          ...prev,
          adminBoundaries: nextAdminBoundaries,
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
    } catch (error) {
      console.warn('Failed to apply stored map preferences', error);
    }
  }, [hasUrlBasemap, hasUrlCenter, hasUrlZoom]);

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
      console.warn('Failed to restore overlay toggles', error);
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
      console.warn('Failed to persist overlay toggles', error);
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
  type LayerStyle = {
    point?: { color?: string; fillColor?: string; fillOpacity?: number; radius?: number; weight?: number };
    line?: { color?: string; weight?: number; opacity?: number; dashArray?: string };
    polygon?: { color?: string; weight?: number; opacity?: number; fillColor?: string; fillOpacity?: number };
  };
  const [dynamicStyle, setDynamicStyle] = useState<Record<string, LayerStyle>>({});
  const [dynamicLoading, setDynamicLoading] = useState<Record<string, boolean>>({});

  const [drawnPolygon, setDrawnPolygon] = useState<L.Polygon | null>(null);
  const [timeFilterDate, setTimeFilterDate] = useState<Date>(new Date());
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const [clusterLayer, setClusterLayer] = useState<L.MarkerClusterGroup | null>(null);
  const [heatLayer, setHeatLayer] = useState<L.Layer | null>(null);
  const [cursorLatLng, setCursorLatLng] = useState<[number, number] | null>(null);
  const [coordBottomOffset, setCoordBottomOffset] = useState<number>(72);
  const [timelineRightOffset, setTimelineRightOffset] = useState<number>(96);
  const [ctxOpen, setCtxOpen] = useState(false);
  const [ctxPoint, setCtxPoint] = useState<{ x: number; y: number } | null>(null);
  const [ctxLatLng, setCtxLatLng] = useState<[number, number] | null>(null);
  const [ctxAddress, setCtxAddress] = useState<string | null>(null);
  const [ctxLoading, setCtxLoading] = useState(false);
  // Fix: minDate for TimeSlider (scope global in component)
  const minDate = startOfDay(new Date('2025-10-01'));

  // Build dynamic legend items based on active overlays and layer types
  const legendOverlays = useMemo<LegendOverlayItem[]>(() => {
    const items: LegendOverlayItem[] = [];
    if (overlays.adminBoundaries) {
      items.push({ type: 'line', label: 'Batas Administratif', color: '#6b7280', dashArray: '4 3' });
    }
    const dyn = overlays.dynamic || {};
    const activeDyn = Object.entries(dyn).filter(([, on]) => on).map(([k]) => k);
    const getName = (key: string) => availableLayers.find((l) => l.key === key)?.name || key;
    for (const key of activeDyn) {
      const lower = key.toLowerCase();
      if (lower === 'assets') continue;
      const style = dynamicStyle[key];
      const pointColor = style?.point?.fillColor ?? style?.point?.color;
      const lineColor = style?.line?.color;
      const lineDash = style?.line?.dashArray;
      const polygonStroke = style?.polygon?.color ?? lineColor;
      const polygonFill = style?.polygon?.fillColor;
      // Heuristic based on key
      if (lower.includes('sungai') || lower.includes('river')) {
        const defaultColor = '#38bdf8';
        items.push({ type: 'line', label: 'Sungai', color: lineColor ?? defaultColor, dashArray: lineDash });
        continue;
      }
      if (lower.includes('irigasi') || lower.includes('irrigation')) {
        const defaultColor = '#0ea5e9';
        items.push({ type: 'line', label: 'Jaringan Irigasi', color: lineColor ?? defaultColor, dashArray: lineDash });
        continue;
      }
      if (lower.includes('banjir') || lower.includes('flood')) {
        const defaultStroke = '#ef4444';
        const defaultFill = '#f87171';
        items.push({
          type: 'fill',
          label: 'Zona Rawan Banjir',
          color: polygonStroke ?? defaultStroke,
          fillColor: polygonFill ?? defaultFill,
        });
        continue;
      }
      if (lower.includes('sawah') || lower.includes('paddy')) {
        const defaultStroke = '#16a34a';
        const defaultFill = '#86efac';
        items.push({
          type: 'fill',
          label: 'Sawah',
          color: polygonStroke ?? defaultStroke,
          fillColor: polygonFill ?? defaultFill,
        });
        continue;
      }
      // ...existing code...
      // Fall back to geometry type from DB or data sample
      const gt = availableLayers.find((l) => l.key === key)?.geometry_type
        || dynamicData[key]?.features?.find((f) => !!f?.geometry)?.geometry?.type
        || '';
      if (/LineString/i.test(String(gt))) {
        const defaultColor = '#334155';
        items.push({ type: 'line', label: getName(key), color: lineColor ?? defaultColor, dashArray: lineDash });
      } else if (/Point/i.test(String(gt))) {
        // Jangan tampilkan label 'Aset' untuk geometry point dari key assets
        if (getName(key).toLowerCase() === 'aset' || lower === 'assets') continue;
        const defaultColor = '#16a34a';
        items.push({ type: 'point', label: getName(key), color: pointColor ?? defaultColor });
      } else {
        const defaultStroke = '#475569';
        const defaultFill = '#cbd5e1';
        items.push({
          type: 'fill',
          label: getName(key),
          color: polygonStroke ?? defaultStroke,
          fillColor: polygonFill ?? defaultFill,
        });
      }
    }
  return items;
  }, [overlays.adminBoundaries, overlays.dynamic, availableLayers, dynamicData, dynamicStyle]);

  const maxDate = useMemo(() => {
    if (reports.length === 0) return new Date();
    const dates = reports.map((r) => new Date(r.created_at));
    return startOfDay(new Date(Math.max(...dates.map((d) => d.getTime()))));
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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return peek((g as any).coordinates);
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
          result = {
            type: 'FeatureCollection',
            features: data.features.map((f) => ({
              type: 'Feature',
              properties: f.properties || {},
              geometry: reprojectGeometry(f.geometry),
            })),
          } as FeatureCollection<Geometry>;
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
              console.warn('Failed to build kecamatan boundary for', name, e);
            }
          });
          const kecLinesFC: FeatureCollection<Geometry> = {
            type: 'FeatureCollection',
            features: lineFeatures as unknown as Feature<Geometry>[],
          } as FeatureCollection<Geometry>;
          setKecamatanLines(kecLinesFC);
        } catch (e) {
          console.warn('Failed generating kecamatan lines', e);
          setKecamatanLines(null);
        }

        setAdminGeoJson(result);
      } catch (err) {
        console.error('Failed to load admin boundaries', err);
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
      // ignore
    }
    // run only on first availability of adminGeoJson while overlay is on
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapInstance, overlays.adminBoundaries, !!adminGeoJson]);

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
        console.warn('Failed to load layers list', e);
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
        if (dynamicData[key] || dynamicLoading[key]) continue;
        setDynamicLoading((s) => ({ ...s, [key]: true }));
        try {
          const { data: gl, error } = await supabase
            .from('geo_layers')
            .select('data')
            .eq('key', key)
            .limit(1)
            .maybeSingle();

          let fc: FeatureCollection<Geometry> | null = null;
          let srcCrs: string | undefined = undefined;
          let raw: Record<string, unknown> | null = null;

          if (!error && gl?.data) {
            raw = gl.data as unknown as Record<string, unknown>;
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

            if (raw) {
              try {
                const maybeStyle = (raw as { style?: unknown })?.style;
                if (maybeStyle && typeof maybeStyle === 'object') {
                  setDynamicStyle((s) => ({ ...s, [key]: maybeStyle as Record<string, unknown> as LayerStyle }));
                }
              } catch { /* ignore */ }
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
                console.warn('Failed to fetch assets fallback layer', assetError);
              }
            } catch (assetFallbackError) {
              console.warn('Failed to build assets feature collection', assetFallbackError);
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
              toast.error(`Gagal memuat layer: ${key}`, {
                description: key === 'assets'
                  ? (!error && !gl?.data
                    ? 'Tidak ditemukan data aset. Tambahkan aset dari GeoData Manager terlebih dahulu.'
                    : 'Data aset belum tersedia atau koordinat aset belum lengkap.')
                  : 'Format data tidak dikenali. Harap unggah GeoJSON FeatureCollection atau ZIP Shapefile.',
            });
          }
        } catch (e) {
          console.warn('Failed to load layer', key, e);
          toast.error(`Gagal memuat layer: ${key}`, {
            description: key === 'assets'
              ? 'Terjadi kesalahan saat mengambil data aset.'
              : undefined,
          });
        } finally {
          setDynamicLoading((s) => ({ ...s, [key]: false }));
        }
      }
    };
    void loadToggled();
  }, [overlays.dynamic, dynamicData, dynamicLoading]);

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

  // Position scale and coordinates stacked above legend at bottom-right
  useEffect(() => {
    const updateBottomStack = () => {
      const legendEl = document.querySelector('.legend-container') as HTMLElement | null;
      const scaleEl = document.querySelector('.leaflet-control-scale') as HTMLElement | null;
      const brCorner = document.querySelector(
        '.leaflet-control-container .leaflet-bottom.leaflet-right'
      ) as HTMLElement | null;
      const mapEl = document.querySelector('.leaflet-container') as HTMLElement | null;
      const legendH = legendEl?.offsetHeight ?? 0;
      const bottomPadding = 16; // tailwind bottom-4 on legend container
      const gapScaleLegend = 8;
      const gapCoordScale = 8;

      // Reset any previously forced inline positioning on the scale (from older revisions)
      if (scaleEl) {
        scaleEl.style.position = '';
        scaleEl.style.right = '';
        scaleEl.style.bottom = '';
      }

      // Nudge the entire bottom-right Leaflet controls corner upward so the scale sits above the legend
      if (brCorner) {
        brCorner.style.bottom = `${bottomPadding + legendH + gapScaleLegend}px`;
        // Ensure controls render above the legend stack
        brCorner.style.zIndex = '1250';
      }

      // If we can measure, position the coordinate badge right above the scale's top edge
      if (mapEl && scaleEl) {
        const mapRect = mapEl.getBoundingClientRect();
        const scaleRect = scaleEl.getBoundingClientRect();
        const bottomOffset = Math.max(0, Math.round(mapRect.bottom - scaleRect.top)) + gapCoordScale;
        setCoordBottomOffset(bottomOffset);
      } else {
        // Fallback to using heights if rects are not available yet
        const scaleH = scaleEl?.offsetHeight ?? 24;
        setCoordBottomOffset(bottomPadding + legendH + gapScaleLegend + scaleH + gapCoordScale);
      }
    };

    updateBottomStack();
    const t = setTimeout(updateBottomStack, 300);
    window.addEventListener('resize', updateBottomStack);

    let ro: ResizeObserver | null = null;
    const legendEl = document.querySelector('.legend-container') as HTMLElement | null;
    if (legendEl && 'ResizeObserver' in window) {
      ro = new ResizeObserver(() => updateBottomStack());
      ro.observe(legendEl);
    }

    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', updateBottomStack);
      if (ro) ro.disconnect();
    };
  }, [mapInstance]);

  // Dynamically reserve space for legend so TimeSlider won't overlap it
  useEffect(() => {
    const updateTimelineOffset = () => {
      const el = document.querySelector('.legend-container') as HTMLElement | null;
      if (el) {
        const gap = 12; // spacing between timeline and legend
        setTimelineRightOffset(el.offsetWidth + gap + 16); // include right-4 padding
      }
    };
    updateTimelineOffset();
    const t = setTimeout(updateTimelineOffset, 300);
    window.addEventListener('resize', updateTimelineOffset);
    let ro: ResizeObserver | null = null;
    const el = document.querySelector('.legend-container') as HTMLElement | null;
    if (el && 'ResizeObserver' in window) {
      ro = new ResizeObserver(() => updateTimelineOffset());
      ro.observe(el);
    }
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', updateTimelineOffset);
      if (ro) ro.disconnect();
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

      // 7-day lookback window: [currentDate - 6, currentDate]
      const timeStart = startOfDay(subDays(timeFilterDate, 6));
      const timeEnd = startOfDay(timeFilterDate);
      if (isBefore(reportDate, timeStart)) return false;
      if (isAfter(reportDate, timeEnd)) return false;

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

  // Build or rebuild cluster layer when toggled or data changes
  useEffect(() => {
    if (!mapInstance) return;
    if (clusterLayer) {
      mapInstance.removeLayer(clusterLayer);
      setClusterLayer(null);
    }
    if (!overlays.clustering) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mcg = new (L as any).MarkerClusterGroup({
      chunkedLoading: true,
      maxClusterRadius: 48,
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: true,
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
    const pts: Array<[number, number, number]> = filteredReports.map((r) => [r.latitude, r.longitude, 0.6]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const hl = (L as any).heatLayer(pts, { radius: 22, blur: 15, maxZoom: 17, minOpacity: 0.25 }) as L.Layer;
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
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Peta Laporan Infrastruktur</h1>
          <p className="text-muted-foreground">
            Lihat semua laporan infrastruktur di peta interaktif
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 mb-6">
          {statusSummary.map(({ key, label, value, icon: Icon, tone }) => (
            <Card key={key} className="border border-border/60 bg-background/80 backdrop-blur-sm shadow-sm">
              <CardContent className="py-3 px-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
                    <p className="text-xl font-semibold mt-1">{loading ? '...' : value}</p>
                  </div>
                  <Icon className={`h-5 w-5 ${tone}`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className={`relative rounded-lg overflow-hidden shadow-lg border ${isMobile ? 'h-[calc(100dvh-180px)]' : 'h-[calc(100vh-220px)]'}`}>
          <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            className="h-full w-full"
            zoomControl={false}
            ref={setMapInstance}
          >
            <FlyToLocation center={mapCenter} zoom={mapZoom} />
            {/* Top-right basemap switcher */}
            <BasemapSwitcher onBasemapChange={setBasemap} initialBasemap={basemap} />
            {/* Legend tagged for measurement to stack scale/coords above */}
            <div className="legend-container absolute bottom-4 right-4 z-[1200]">
              <Legend overlays={legendOverlays} />
            </div>
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
                    const desa = (p?.DESA_1 as string) || (p?.DESA as string) || (p?.name as string);
                    const kec = (p?.KECAMATAN as string) || (p?.Kecamatan as string);
                    layer.bindPopup(
                      `<div style="min-width:200px">
                        <div style="font-weight:600;margin-bottom:4px">Detail Wilayah</div>
                        <div><strong>Desa:</strong> ${desa ?? '-'}</div>
                        <div><strong>Kecamatan:</strong> ${kec ?? '-'}</div>
                      </div>`
                    );
                    layer.on('mouseover', () => {
                      const anyLayer = layer as unknown as { setStyle?: (opts: L.PathOptions) => void };
                      if (typeof anyLayer.setStyle === 'function') anyLayer.setStyle({ weight: 2, color: '#111827' });
                    });
                    layer.on('mouseout', () => {
                      const anyLayer = layer as unknown as { setStyle?: (opts: L.PathOptions) => void };
                      if (typeof anyLayer.setStyle === 'function') anyLayer.setStyle({ weight: 1, color: '#6b7280' });
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
            {Object.entries(overlays.dynamic || {}).map(([key, on]) => (
              on && dynamicData[key] ? (
                <Pane key={`pane-${key}`} name={`dyn-${key}`} style={{ zIndex: 365 }}>
                  <RLGeoJSON
                    key={`geojson-${key}`}
                    data={dynamicData[key]!}
                    style={(feat) => {
                      const t = feat?.geometry?.type;
                      const styLine = dynamicStyle[key]?.line;
                      const styPoly = dynamicStyle[key]?.polygon;
                      // If key hints irrigation
                      if (key.toLowerCase().includes('irigasi') || key.toLowerCase().includes('irrigation')) {
                        if (t === 'LineString' || t === 'MultiLineString') return { color: styLine?.color ?? '#0ea5e9', weight: styLine?.weight ?? 3, opacity: styLine?.opacity ?? 0.9, dashArray: styLine?.dashArray };
                        return { color: styPoly?.color ?? '#0ea5e9', weight: styPoly?.weight ?? 1.5, opacity: styPoly?.opacity ?? 0.8, fillColor: styPoly?.fillColor ?? '#38bdf8', fillOpacity: styPoly?.fillOpacity ?? 0.15 };
                      }
                      // If key hints flood zones / hazard
                      if (key.toLowerCase().includes('banjir') || key.toLowerCase().includes('flood')) {
                        return { color: styPoly?.color ?? '#ef4444', weight: styPoly?.weight ?? 1, opacity: styPoly?.opacity ?? 0.7, fillColor: styPoly?.fillColor ?? '#f87171', fillOpacity: styPoly?.fillOpacity ?? 0.2 };
                      }
                      // If key hints rivers
                      if (key.toLowerCase().includes('sungai') || key.toLowerCase().includes('river')) {
                        if (t === 'LineString' || t === 'MultiLineString') return { color: styLine?.color ?? '#38bdf8', weight: styLine?.weight ?? 2.5, opacity: styLine?.opacity ?? 0.95, dashArray: styLine?.dashArray };
                        return { color: styPoly?.color ?? '#38bdf8', weight: styPoly?.weight ?? 1.5, opacity: styPoly?.opacity ?? 0.85, fillColor: styPoly?.fillColor ?? '#7dd3fc', fillOpacity: styPoly?.fillOpacity ?? 0.18 };
                      }
                      // If key hints paddy fields (sawah)
                      if (key.toLowerCase().includes('sawah') || key.toLowerCase().includes('paddy')) {
                        if (t === 'LineString' || t === 'MultiLineString') return { color: styLine?.color ?? '#16a34a', weight: styLine?.weight ?? 2, opacity: styLine?.opacity ?? 0.9, dashArray: styLine?.dashArray };
                        return { color: styPoly?.color ?? '#16a34a', weight: styPoly?.weight ?? 1, opacity: styPoly?.opacity ?? 0.9, fillColor: styPoly?.fillColor ?? '#86efac', fillOpacity: styPoly?.fillOpacity ?? 0.25 };
                      }
                      // Defaults by geometry
                      if (t === 'LineString' || t === 'MultiLineString') return { color: styLine?.color ?? '#334155', weight: styLine?.weight ?? 2, opacity: styLine?.opacity ?? 0.9, dashArray: styLine?.dashArray };
                      if (t === 'Point' || t === 'MultiPoint') return { color: (dynamicStyle[key]?.point?.color) ?? '#16a34a', weight: (dynamicStyle[key]?.point?.weight) ?? 2, opacity: 0.9 };
                      return { color: styPoly?.color ?? '#475569', weight: styPoly?.weight ?? 1, opacity: styPoly?.opacity ?? 0.8, fillColor: styPoly?.fillColor ?? '#cbd5e1', fillOpacity: styPoly?.fillOpacity ?? 0.2 };
                    }}
                    pointToLayer={(feature, latlng) => {
                      if (key === 'assets') {
                        const p = feature.properties as Record<string, unknown> | undefined;
                        const status = (p?.status as string) || 'aktif';
                        const cat = (p?.category as string) || '';
                        return L.marker(latlng, { icon: createAssetIcon((['aktif', 'nonaktif', 'rusak'].includes(status) ? (status as 'aktif' | 'nonaktif' | 'rusak') : 'aktif'), cat) });
                      }
                      const sty = dynamicStyle[key]?.point;
                      return L.circleMarker(latlng, {
                        radius: sty?.radius ?? 5,
                        color: sty?.color ?? '#16a34a',
                        weight: sty?.weight ?? 1,
                        fillColor: sty?.fillColor ?? '#16a34a',
                        fillOpacity: sty?.fillOpacity ?? 0.7,
                      });
                    }}
                    onEachFeature={(feature, layer) => {
                      const p = feature.properties as Record<string, unknown> | undefined;
                      const title = (p?.name as string) || (p?.title as string) || (p?.NAMOBJ as string) || key;
                      if (title) {
                        layer.bindTooltip(String(title), { sticky: true });
                      }
                      if (key === 'assets') {
                        const code = p?.code as string | undefined;
                        const cat = p?.category as string | undefined;
                        const status = p?.status as string | undefined;
                        const ket = p?.keterangan as string | undefined;
                        layer.bindPopup(`
                          <div style="min-width:200px">
                            <div style="font-weight:600;margin-bottom:4px">${title}</div>
                            <div><strong>Kode:</strong> ${code ?? '-'}</div>
                            <div><strong>Kategori:</strong> ${cat ?? '-'}</div>
                            <div><strong>Status:</strong> ${status ?? '-'}</div>
                            <div><strong>Keterangan:</strong> ${ket ?? '-'}</div>
                          </div>
                        `);
                      } else if (p) {
                        // Generic popup showing first few properties
                        const entries = Object.entries(p).slice(0, 8);
                        const rows = entries.map(([k, v]) => `<div><strong>${k}:</strong> ${v as string ?? '-'}</div>`).join('');
                        const html = `
                          <div style="min-width:220px">
                            <div style="font-weight:600;margin-bottom:4px">${title}</div>
                            ${rows}
                          </div>
                        `;
                        layer.bindPopup(html);
                      }
                    }}
                  />
                </Pane>
              ) : null
            ))}

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
          </MapContainer>

          <MapToolbar
            compact={isMobile}
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
            onShare={handleShare}
            onExport={handleExport}
          />

          {/* Floating mini panels under the toolbar (top-left) */}
          {showSearchPanel && (
            <div className={`absolute z-[1200] ${isMobile ? 'top-20 left-2 right-2' : 'top-24 left-4'}`}>
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
          {showFilterPanel && (
            <div className={`absolute z-[1200] ${isMobile ? 'top-20 left-2 right-2' : 'top-24 left-4'}`}>
              <FilterPanel
                filters={filters}
                onFilterChange={(newFilters) => {
                  setFilters(newFilters);
                  // Update URL parameters for share-ability
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
            </div>
          )}
          {showOverlayPanel && (
            <div className={`absolute z-[1200] ${isMobile ? 'top-20 left-2 right-2' : 'top-24 left-4'}`}>
              <OverlayToggle
                overlays={overlays}
                onOverlayChange={setOverlays}
                availableLayers={availableLayers.map(({ key, name }) => ({ key, name }))}
                onClose={() => setShowOverlayPanel(false)}
              />
            </div>
          )}

          {/* Floating detail card (left-aligned on desktop) */}
          {selectedReport && (
            <div
              className={`absolute z-[1300] ${
                isMobile
                  ? 'bottom-20 left-2 right-2'
                  : 'top-28 left-4'
              }`}
            >
              <div className="max-w-[42rem]">
                <ReportDetailDrawer report={selectedReport} onClose={() => setSelectedReport(null)} />
              </div>
            </div>
          )}

          {/* SidePanel consolidates Search, Filter, and Overlay */}

          {reports.length > 0 && (
            <div className="absolute bottom-4 left-0 right-0 z-[1000] px-2 md:px-4 pointer-events-none">
              {/* Add right padding on larger screens to avoid overlapping legend; center the slider */}
              <div className="w-full" style={{ paddingRight: isMobile ? 0 : timelineRightOffset }}>
                <div className="mx-auto max-w-xl pointer-events-auto">
                  <TimeSlider
                    minDate={minDate}
                    maxDate={maxDate}
                    currentDate={timeFilterDate}
                    onDateChange={setTimeFilterDate}
                    compact
                    loop={false}
                  />
                  <div className="mt-1 text-center text-[11px] text-muted-foreground">
                    Rentang: {format(startOfDay(subDays(timeFilterDate, 6)), 'dd MMM yy')} - {format(startOfDay(timeFilterDate), 'dd MMM yy')}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Coordinates readout above scale and legend (bottom-right stack) */}
          {cursorLatLng && (
            <div
              className="absolute right-4 z-[1300] bg-background/90 border rounded px-2 py-1 text-[11px] font-mono shadow pointer-events-none"
              style={{ bottom: coordBottomOffset }}
            >
              {cursorLatLng[0].toFixed(5)}, {cursorLatLng[1].toFixed(5)}
            </div>
          )}

          {/* Scale bar via native Leaflet control */}
          {mapInstance && (
            <ScaleBar map={mapInstance} />
          )}

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
          {/* Admin layer loader indicator */}
          {adminLoading && overlays.adminBoundaries && (
            <div className="absolute left-4 top-24 z-[1300]">
              <Card className="px-3 py-2 text-sm">Memuat batas administratif.</Card>
            </div>
          )}
          {/* Other layer loaders */}
          {Object.entries(dynamicLoading).some(([k, v]) => (overlays.dynamic?.[k] && v)) && (
            <div className="absolute left-4 top-36 z-[1300]">
              <Card className="px-3 py-2 text-sm">Memuat layer geospasial.</Card>
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

// Small helper component to add Leaflet scale control
const ScaleBar = ({ map }: { map: L.Map }) => {
  useEffect(() => {
    const control = L.control.scale({ metric: true, imperial: false, position: 'bottomright' });
    control.addTo(map);
    return () => {
      // Leaflet Map has removeControl in runtime; TS types may not expose it on our import.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const m = map as any;
      if (typeof m.removeControl === 'function') {
        m.removeControl(control);
      }
    };
  }, [map]);
  return null;
};












