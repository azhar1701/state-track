/**
 * Geospatial Export Module
 * Export data to GeoJSON, KML, Shapefile formats
 */

import type { FeatureCollection, Feature, Point } from 'geojson';
import { toast } from 'sonner';

export interface ExportReport {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  severity?: string;
  latitude: number;
  longitude: number;
  created_at: string;
  [key: string]: unknown;
}

/**
 * Export to GeoJSON
 */
export function exportToGeoJSON(reports: ExportReport[], filename?: string): void {
  const features: Feature<Point>[] = reports.map(report => ({
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [report.longitude, report.latitude],
    },
    properties: {
      id: report.id,
      title: report.title,
      description: report.description,
      category: report.category,
      status: report.status,
      severity: report.severity || null,
      created_at: report.created_at,
    },
  }));

  const geojson: FeatureCollection<Point> = {
    type: 'FeatureCollection',
    features,
  };

  downloadJSON(geojson, filename || `reports-${new Date().toISOString().split('T')[0]}.geojson`);
  toast.success('GeoJSON berhasil diekspor');
}

/**
 * Export to KML
 */
export function exportToKML(reports: ExportReport[], filename?: string): void {
  const kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Laporan Infrastruktur SDA</name>
    <description>Ekspor data laporan dari SIPASDA</description>
    
    <!-- Styles -->
    <Style id="baru">
      <IconStyle>
        <color>ff1678f9</color>
        <scale>1.0</scale>
        <Icon>
          <href>http://maps.google.com/mapfiles/kml/paddle/orange-circle.png</href>
        </Icon>
      </IconStyle>
    </Style>
    <Style id="diproses">
      <IconStyle>
        <color>fff68216</color>
        <scale>1.0</scale>
        <Icon>
          <href>http://maps.google.com/mapfiles/kml/paddle/blu-circle.png</href>
        </Icon>
      </IconStyle>
    </Style>
    <Style id="selesai">
      <IconStyle>
        <color>ff81b910</color>
        <scale>1.0</scale>
        <Icon>
          <href>http://maps.google.com/mapfiles/kml/paddle/grn-circle.png</href>
        </Icon>
      </IconStyle>
    </Style>
    
    ${reports.map(report => `
    <Placemark>
      <name>${escapeXML(report.title)}</name>
      <description><![CDATA[
        <b>Kategori:</b> ${escapeXML(report.category)}<br/>
        <b>Status:</b> ${escapeXML(report.status)}<br/>
        ${report.severity ? `<b>Tingkat Keparahan:</b> ${escapeXML(report.severity)}<br/>` : ''}
        <b>Deskripsi:</b> ${escapeXML(report.description)}<br/>
        <b>Tanggal:</b> ${new Date(report.created_at).toLocaleDateString('id-ID')}
      ]]></description>
      <styleUrl>#${report.status}</styleUrl>
      <Point>
        <coordinates>${report.longitude},${report.latitude},0</coordinates>
      </Point>
    </Placemark>
    `).join('\n')}
  </Document>
</kml>`;

  downloadText(kml, filename || `reports-${new Date().toISOString().split('T')[0]}.kml`, 'application/vnd.google-earth.kml+xml');
  toast.success('KML berhasil diekspor');
}

/**
 * Export to CSV (for Shapefile conversion)
 */
export function exportToCSV(reports: ExportReport[], filename?: string): void {
  const headers = ['id', 'title', 'description', 'category', 'status', 'severity', 'latitude', 'longitude', 'created_at'];
  
  const rows = reports.map(report => [
    report.id,
    `"${report.title.replace(/"/g, '""')}"`,
    `"${report.description.replace(/"/g, '""')}"`,
    report.category,
    report.status,
    report.severity || '',
    report.latitude,
    report.longitude,
    report.created_at,
  ]);

  const csv = [
    headers.join(','),
    ...rows.map(row => row.join(',')),
  ].join('\n');

  downloadText(csv, filename || `reports-${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
  toast.success('CSV berhasil diekspor', {
    description: 'Gunakan QGIS atau ArcGIS untuk konversi ke Shapefile',
  });
}

/**
 * Export layer to GeoJSON
 */
export function exportLayerToGeoJSON(featureCollection: FeatureCollection, layerName: string): void {
  downloadJSON(featureCollection, `${layerName}-${new Date().toISOString().split('T')[0]}.geojson`);
  toast.success(`Layer ${layerName} berhasil diekspor`);
}

/**
 * Helper: Download JSON
 */
function downloadJSON(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Helper: Download text
 */
function downloadText(text: string, filename: string, mimeType: string): void {
  const blob = new Blob([text], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Helper: Escape XML special characters
 */
function escapeXML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
