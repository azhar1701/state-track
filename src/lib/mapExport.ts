import domtoimage from 'dom-to-image-more';
import { Map } from 'leaflet';
import { sanitizeText } from './security';

export type ExportOptions = {
  filename?: string;
  backgroundColor?: string;
  includeControls?: boolean; // if false, temporarily hide Leaflet controls/our toolbar/legend
  scale?: number; // 1 (default) to 2/3 for hi-DPI
};

const toggleControls = (map: Map, show: boolean) => {
  const container = map.getContainer();
  const selectors = [
    '.modern-map-overlay',
    '.leaflet-top',
    '.leaflet-bottom',
    '.leaflet-control-zoom',
    '.leaflet-control-attribution',
    '.basemap-switcher',
    '.legend-container',
    '.custom-scale-control',
  ];
  selectors.forEach((sel) => {
    const elements = container.querySelectorAll(sel);
    elements.forEach((el) => {
      if (el instanceof HTMLElement) {
        el.style.display = show ? '' : 'none';
      }
    });
  });
  
  // Hide tile borders
  const tiles = container.querySelectorAll('.leaflet-tile');
  tiles.forEach((tile) => {
    if (tile instanceof HTMLElement) {
      tile.style.border = show ? '' : 'none';
    }
  });
};

export const exportMapToPNG = async (map: Map, options: ExportOptions = {}): Promise<void> => {
  const container = map.getContainer();
  
  try {
    // Hide all controls including legend and scale
    toggleControls(map, false);
    
    // Wait for render
    await new Promise(resolve => setTimeout(resolve, 300));

    const dataUrl = await domtoimage.toPng(container, {
      quality: 0.95,
      bgcolor: options.backgroundColor || '#ffffff',
    });

    // Restore controls
    toggleControls(map, true);

    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = options.filename || 'map-export.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch (error) {
    toggleControls(map, true);
    console.error('Export failed:', error);
    alert('Gagal mengekspor peta. Error: ' + (error instanceof Error ? error.message : String(error)));
    throw error;
  }
};

export const generateShareableURL = (params: {
  center: [number, number];
  zoom: number;
  category?: string;
  status?: string;
  severity?: string;
  dateFrom?: string;
  dateTo?: string;
  selectedReportId?: string;
  basemap?: string;
}): string => {
  const url = new URL(window.location.href);

  url.searchParams.set('lat', params.center[0].toFixed(6));
  url.searchParams.set('lng', params.center[1].toFixed(6));
  url.searchParams.set('zoom', params.zoom.toString());

  if (params.category) url.searchParams.set('category', params.category);
  if (params.status) url.searchParams.set('status', params.status);
  if (params.severity) url.searchParams.set('severity', params.severity);
  if (params.dateFrom) url.searchParams.set('dateFrom', params.dateFrom);
  if (params.dateTo) url.searchParams.set('dateTo', params.dateTo);
  if (params.selectedReportId) url.searchParams.set('report', params.selectedReportId);
  if (params.basemap) url.searchParams.set('basemap', params.basemap);

  return url.toString();
};

export const parseURLParams = (): {
  center?: [number, number];
  zoom?: number;
  category?: string;
  status?: string;
  severity?: string;
  dateFrom?: string;
  dateTo?: string;
  selectedReportId?: string;
  basemap?: string;
} => {
  const params = new URLSearchParams(window.location.search);

  const result: ReturnType<typeof parseURLParams> = {};

  const lat = params.get('lat');
  const lng = params.get('lng');
  if (lat && lng) {
    result.center = [parseFloat(lat), parseFloat(lng)];
  }

  const zoom = params.get('zoom');
  if (zoom) {
    result.zoom = parseInt(zoom, 10);
  }

  const category = params.get('category');
  if (category) result.category = category;

  const status = params.get('status');
  if (status) result.status = status;

  const severity = params.get('severity');
  if (severity) result.severity = severity;

  const dateFrom = params.get('dateFrom');
  if (dateFrom) result.dateFrom = dateFrom;

  const dateTo = params.get('dateTo');
  if (dateTo) result.dateTo = dateTo;

  const report = params.get('report');
  if (report) result.selectedReportId = report;

  const basemap = params.get('basemap');
  if (basemap) result.basemap = basemap;

  return result;
};
