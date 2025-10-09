import html2canvas from 'html2canvas';
import { Map } from 'leaflet';

export type ExportOptions = {
  filename?: string;
  backgroundColor?: string;
  includeControls?: boolean; // if false, temporarily hide Leaflet controls/our toolbar/legend
  scale?: number; // 1 (default) to 2/3 for hi-DPI
};

const toggleControls = (map: Map, show: boolean) => {
  const container = map.getContainer();
  const selectors = [
    '.leaflet-control-container',
    '.legend-container',
    '.map-toolbar-container',
  ];
  selectors.forEach((sel) => {
    const el = container.querySelector(sel) as HTMLElement | null;
    if (el) el.style.visibility = show ? '' : 'hidden';
  });
};

export const exportMapToPNG = async (map: Map, options: ExportOptions = {}): Promise<void> => {
  try {
    const container = map.getContainer();

    if (options.includeControls === false) toggleControls(map, false);

    const canvas = await html2canvas(container, {
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: options.backgroundColor ?? '#ffffff',
      scale: options.scale && options.scale > 0 ? options.scale : 1,
    });

    if (options.includeControls === false) toggleControls(map, true);

    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = options.filename || 'map-export.png';
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
      }
    });
  } catch (error) {
    console.error('Error exporting map:', error);
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
