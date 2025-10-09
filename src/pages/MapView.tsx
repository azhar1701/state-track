import { useEffect, useState, useMemo } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { MapContainer, Marker, Popup, useMap, GeoJSON as RLGeoJSON, Pane } from 'react-leaflet';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Navigation, Loader as Loader2 } from 'lucide-react';
import L from 'leaflet';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.markercluster';
import 'leaflet.heat';
import 'leaflet/dist/leaflet.css';
import { BasemapSwitcher } from '@/components/map/BasemapSwitcher';
import type { BasemapType } from '@/components/map/basemap-config';
import { Legend } from '@/components/map/Legend';
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

const createCustomIcon = (category: string, status: string, severity?: Report['severity']) => {
  const colors = {
    baru: '#f59e0b',
    diproses: '#3b82f6',
    selesai: '#10b981',
  };

  const color = colors[status as keyof typeof colors] || '#6b7280';
  const sevColors: Record<NonNullable<Report['severity']>, string> = {
    ringan: '#22c55e',
    sedang: '#f97316',
    berat: '#ef4444',
  };
  const sevBorder = severity ? sevColors[severity] : '#9ca3af';

  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        background-color: ${color};
        width: 32px;
        height: 32px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 3px solid ${sevBorder};
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
    adminBoundaries: false,
    clustering: true,
    heatmap: false,
    dynamic: {},
  });

  // Administrative boundaries geojson cache
  const [adminGeoJson, setAdminGeoJson] = useState<FeatureCollection<Geometry> | null>(null);
  const [kecamatanLines, setKecamatanLines] = useState<FeatureCollection<Geometry> | null>(null);
  const [adminLoading, setAdminLoading] = useState(false);
  // Additional overlays
  // Dynamic overlays from geo_layers
  const [availableLayers, setAvailableLayers] = useState<Array<{ key: string; name: string; geometry_type: string | null }>>([]);
  const [dynamicData, setDynamicData] = useState<Record<string, FeatureCollection<Geometry> | null>>({});
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

  const minDate = useMemo(() => {
    // Fix the earliest selectable date to Oct 1, 2025
    return startOfDay(new Date('2025-10-01'));
  }, []);

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

  // Lazy-load admin boundaries when toggled on
  useEffect(() => {
    const loadAdminBoundaries = async () => {
      if (!overlays.adminBoundaries) return;
      if (adminGeoJson || adminLoading) return;
      setAdminLoading(true);
      try {
        // 1) Try admin-managed layer from Supabase first
        let data: FeatureCollection<Geometry> | null = null;
        try {
          const { data: gl, error } = await supabase
            .from('geo_layers')
            .select('data')
            .eq('key', 'admin_boundaries')
            .limit(1)
            .maybeSingle();
          if (!error && gl?.data && (gl.data as { type?: string }).type === 'FeatureCollection') {
            data = gl.data as FeatureCollection<Geometry>;
          }
        } catch { /* ignore */ }

        // 2) Fallback to public files
        if (!data) {
          const candidates = [
            '/data/ciamis_kecamatan.geojson',
            '/data/adm_ciamis.geojson',
          ];
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

        // Detect CRS from GeoJSON or infer by coordinate magnitude
        const crsName = (data as unknown as { crs?: { properties?: { name?: string } } })?.crs?.properties?.name;

        const needsUTM49S = !!crsName?.includes('EPSG::32749');
        const sample = (() => {
          const f = data!.features?.find((f) => f.geometry && 'coordinates' in f.geometry);
          if (!f) return null;
          const g = f.geometry;
          // Try to peek first coordinate
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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return peek((g as any).coordinates);
        })();

        const looksProjected = sample ? Math.abs(sample[0]) > 1000 || Math.abs(sample[1]) > 1000 : false;

        let result = data;
        if (needsUTM49S || looksProjected) {
          // Define UTM zone 49S
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
            const mapCoords = (arr: unknown, depth = 0): unknown => {
              if (!Array.isArray(arr)) return arr;
              if (arr.length > 0 && typeof arr[0] === 'number') {
                return transformCoord(arr as number[]);
              }
              return (arr as unknown[]).map((a) => mapCoords(a, depth + 1));
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

        // Prepare kecamatan boundary lines (Indonesia style: kecamatan dashed thicker)
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
              // Fallback: skip problematic kecamatan
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
          description: 'Pastikan file data tersedia di /public/data/ciamis_kecamatan.geojson',
        });
      } finally {
        setAdminLoading(false);
      }
    };
    loadAdminBoundaries();
  }, [overlays.adminBoundaries, adminGeoJson, adminLoading]);

  // Load list of available geo_layers to display as toggles
  useEffect(() => {
    const loadList = async () => {
      try {
        const { data, error } = await supabase
          .from('geo_layers')
          .select('key,name,geometry_type')
          .order('created_at', { ascending: false });
        if (!error && data) {
          // Exclude admin_boundaries as it has a dedicated toggle
          const layers = (data as Array<{ key: string; name: string; geometry_type: string | null }>).
            filter((l) => l.key !== 'admin_boundaries');
          setAvailableLayers(layers);
        }
      } catch (e) {
        console.warn('Failed to load layers list', e);
      }
    };
    void loadList();
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
          if (!error && gl?.data) {
            // Accept FeatureCollection or attempt to find one inside nested objects
            let fc: FeatureCollection<Geometry> | null = null;
            let srcCrs: string | undefined = undefined;
            const raw = gl.data as unknown as Record<string, unknown>;
            // Preferred shape from GeoDataManager: { featureCollection, crs }
            if (raw && typeof raw === 'object' && 'featureCollection' in raw) {
              const wrapper = raw as { featureCollection?: unknown; crs?: string };
              if (wrapper.featureCollection && (wrapper.featureCollection as { type?: string }).type === 'FeatureCollection') {
                fc = wrapper.featureCollection as FeatureCollection<Geometry>;
                srcCrs = typeof wrapper.crs === 'string' ? wrapper.crs : undefined;
              }
            }
            // Back-compat: accept direct FC or nested object values
            if (!fc) {
              if ((raw as { type?: string }).type === 'FeatureCollection') {
                fc = raw as unknown as FeatureCollection<Geometry>;
              } else if (raw && typeof raw === 'object') {
                const vals = Object.values(raw);
                const found = vals.find((v) => !!v && typeof v === 'object' && (v as { type?: string }).type === 'FeatureCollection');
                if (found) fc = found as FeatureCollection<Geometry>;
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
              const isEPSG32749 = src.includes('EPSG:32749');
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
              toast.error(`Gagal memuat layer: ${key}`, { description: 'Format data tidak dikenali. Harap unggah GeoJSON FeatureCollection atau ZIP Shapefile.' });
            }
          } else {
            toast.error(`Gagal memuat layer: ${key}`);
          }
        } catch (e) {
          console.warn('Failed to load layer', key, e);
          toast.error(`Gagal memuat layer: ${key}`);
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
              <Legend overlays={[
                ...(overlays.adminBoundaries ? [{ type: 'line', label: 'Batas Administratif', color: '#6b7280', dashArray: '4 3' } as const] : []),
                // Common Indonesian symbology suggestions
                ...(
                  Object.entries(overlays.dynamic || {}).some(([k, on]) => k === 'irrigation' && on)
                    ? [{ type: 'line', label: 'Jaringan Irigasi', color: '#0ea5e9' } as const]
                    : []
                ),
                ...(
                  Object.entries(overlays.dynamic || {}).some(([k, on]) => k === 'flood_zones' && on)
                    ? [{ type: 'fill', label: 'Zona Rawan Banjir', color: '#ef4444', fillColor: '#f87171' } as const]
                    : []
                ),
                ...(
                  Object.entries(overlays.dynamic || {}).some(([k, on]) => on && (k.toLowerCase().includes('sungai') || k.toLowerCase().includes('river')))
                    ? [{ type: 'line', label: 'Sungai', color: '#38bdf8' } as const]
                    : []
                ),
              ]} />
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
                      // If key hints irrigation
                      if (key.toLowerCase().includes('irigasi') || key.toLowerCase().includes('irrigation')) {
                        if (t === 'LineString' || t === 'MultiLineString') return { color: '#0ea5e9', weight: 3, opacity: 0.9 };
                        return { color: '#0ea5e9', weight: 1.5, opacity: 0.8, fillColor: '#38bdf8', fillOpacity: 0.15 };
                      }
                      // If key hints flood zones / hazard
                      if (key.toLowerCase().includes('banjir') || key.toLowerCase().includes('flood')) {
                        return { color: '#ef4444', weight: 1, opacity: 0.7, fillColor: '#f87171', fillOpacity: 0.2 };
                      }
                      // If key hints rivers
                      if (key.toLowerCase().includes('sungai') || key.toLowerCase().includes('river')) {
                        if (t === 'LineString' || t === 'MultiLineString') return { color: '#38bdf8', weight: 2.5, opacity: 0.95 };
                        return { color: '#38bdf8', weight: 1.5, opacity: 0.85, fillColor: '#7dd3fc', fillOpacity: 0.18 };
                      }
                      // Defaults by geometry
                      if (t === 'LineString' || t === 'MultiLineString') return { color: '#334155', weight: 2, opacity: 0.9 };
                      if (t === 'Point' || t === 'MultiPoint') return { color: '#16a34a', weight: 2, opacity: 0.9 };
                      return { color: '#475569', weight: 1, opacity: 0.8, fillColor: '#cbd5e1', fillOpacity: 0.2 };
                    }}
                    onEachFeature={(feature, layer) => {
                      const p = feature.properties as Record<string, unknown> | undefined;
                      const title = (p?.name as string) || (p?.title as string) || (p?.NAMOBJ as string) || key;
                      layer.bindTooltip(String(title), { sticky: true });
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
                    Rentang: {format(startOfDay(subDays(timeFilterDate, 6)), 'dd MMM yy')} – {format(startOfDay(timeFilterDate), 'dd MMM yy')}
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
                  {ctxLoading ? 'Mencari…' : 'Lihat alamat'}
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
              <Card className="px-3 py-2 text-sm">Memuat batas administratif…</Card>
            </div>
          )}
          {/* Other layer loaders */}
          {Object.entries(dynamicLoading).some(([k, v]) => (overlays.dynamic?.[k] && v)) && (
            <div className="absolute left-4 top-36 z-[1300]">
              <Card className="px-3 py-2 text-sm">Memuat layer geospasial…</Card>
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
