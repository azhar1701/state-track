/**
 * Export Panel Component
 * Comprehensive export options for geospatial data
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, FileJson, Map, Table, X, Image } from 'lucide-react';
import { toast } from 'sonner';
import { exportToGeoJSON, exportToKML, exportToCSV, type ExportReport } from '@/lib/geoExport';
import { exportMapToPNG } from '@/lib/mapExport';
import type L from 'leaflet';

interface ExportPanelProps {
  reports: ExportReport[];
  mapInstance?: L.Map | null;
  onClose: () => void;
}

export function ExportPanel({ reports, mapInstance, onClose }: ExportPanelProps) {
  const [filename, setFilename] = useState(`sipasda-export-${new Date().toISOString().split('T')[0]}`);
  const [includeAllFields, setIncludeAllFields] = useState(true);
  const [filterByStatus, setFilterByStatus] = useState<string | null>(null);
  const [filterByCategory, setFilterByCategory] = useState<string | null>(null);
  
  // Map export options
  const [mapScale, setMapScale] = useState(2);
  const [includeControls, setIncludeControls] = useState(true);

  const getFilteredReports = () => {
    let filtered = [...reports];
    
    if (filterByStatus) {
      filtered = filtered.filter(r => r.status === filterByStatus);
    }
    
    if (filterByCategory) {
      filtered = filtered.filter(r => r.category === filterByCategory);
    }
    
    return filtered;
  };

  const handleExportGeoJSON = () => {
    const filtered = getFilteredReports();
    if (filtered.length === 0) {
      toast.error('Tidak ada data untuk diekspor');
      return;
    }
    
    exportToGeoJSON(filtered, `${filename}.geojson`);
  };

  const handleExportKML = () => {
    const filtered = getFilteredReports();
    if (filtered.length === 0) {
      toast.error('Tidak ada data untuk diekspor');
      return;
    }
    
    exportToKML(filtered, `${filename}.kml`);
  };

  const handleExportCSV = () => {
    const filtered = getFilteredReports();
    if (filtered.length === 0) {
      toast.error('Tidak ada data untuk diekspor');
      return;
    }
    
    exportToCSV(filtered, `${filename}.csv`);
  };

  const handleExportMap = async () => {
    if (!mapInstance) {
      toast.error('Peta belum siap');
      return;
    }

    try {
      toast.loading('Mengekspor peta...');
      await exportMapToPNG(mapInstance, {
        filename: `${filename}.png`,
        includeControls,
        scale: mapScale,
      });
      toast.dismiss();
      toast.success('Peta berhasil diekspor');
    } catch (error) {
      toast.dismiss();
      toast.error('Gagal mengekspor peta');
    }
  };

  const categories = Array.from(new Set(reports.map(r => r.category)));
  const statuses = Array.from(new Set(reports.map(r => r.status)));
  const filteredCount = getFilteredReports().length;

  return (
    <div className="absolute top-20 right-4 z-[1200] w-96 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border rounded-lg shadow-xl max-h-[calc(100vh-120px)] overflow-hidden flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Download className="w-5 h-5" />
          <h3 className="font-semibold">Ekspor Data</h3>
        </div>
        <Button size="sm" variant="ghost" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <Tabs defaultValue="vector" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="vector">
              <Map className="w-3 h-3 mr-1" />
              Vector
            </TabsTrigger>
            <TabsTrigger value="raster">
              <Image className="w-3 h-3 mr-1" />
              Raster
            </TabsTrigger>
          </TabsList>

          <TabsContent value="vector" className="space-y-4 mt-4">
            <div>
              <Label className="text-xs">Nama File</Label>
              <Input
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                placeholder="nama-file"
                className="mt-1"
              />
            </div>

            <div className="border-t pt-4 space-y-3">
              <Label className="text-xs font-semibold">Filter Data</Label>
              
              <div>
                <Label className="text-xs">Kategori</Label>
                <select
                  className="w-full mt-1 px-3 py-2 border rounded-md text-sm"
                  value={filterByCategory || 'all'}
                  onChange={(e) => setFilterByCategory(e.target.value === 'all' ? null : e.target.value)}
                >
                  <option value="all">Semua Kategori</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="text-xs">Status</Label>
                <select
                  className="w-full mt-1 px-3 py-2 border rounded-md text-sm"
                  value={filterByStatus || 'all'}
                  onChange={(e) => setFilterByStatus(e.target.value === 'all' ? null : e.target.value)}
                >
                  <option value="all">Semua Status</option>
                  {statuses.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded p-2 text-xs">
                <div className="font-semibold text-blue-900 dark:text-blue-100">
                  {filteredCount} dari {reports.length} laporan akan diekspor
                </div>
              </div>
            </div>

            <div className="border-t pt-4 space-y-2">
              <Label className="text-xs font-semibold">Format Ekspor</Label>
              
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={handleExportGeoJSON}
              >
                <FileJson className="w-4 h-4 mr-2" />
                GeoJSON
                <span className="ml-auto text-xs text-muted-foreground">.geojson</span>
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={handleExportKML}
              >
                <Map className="w-4 h-4 mr-2" />
                KML (Google Earth)
                <span className="ml-auto text-xs text-muted-foreground">.kml</span>
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={handleExportCSV}
              >
                <Table className="w-4 h-4 mr-2" />
                CSV (Spreadsheet)
                <span className="ml-auto text-xs text-muted-foreground">.csv</span>
              </Button>
            </div>

            <div className="text-xs text-muted-foreground bg-gray-50 dark:bg-gray-800 rounded p-2">
              <div className="font-semibold mb-1">Catatan:</div>
              <ul className="list-disc list-inside space-y-1">
                <li>GeoJSON: Format standar untuk GIS web</li>
                <li>KML: Untuk Google Earth/Maps</li>
                <li>CSV: Konversi ke Shapefile via QGIS</li>
              </ul>
            </div>
          </TabsContent>

          <TabsContent value="raster" className="space-y-4 mt-4">
            <div>
              <Label className="text-xs">Nama File</Label>
              <Input
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                placeholder="nama-file"
                className="mt-1"
              />
            </div>

            <div className="space-y-3">
              <div>
                <Label className="text-xs">Kualitas Ekspor</Label>
                <select
                  className="w-full mt-1 px-3 py-2 border rounded-md text-sm"
                  value={mapScale}
                  onChange={(e) => setMapScale(Number(e.target.value))}
                >
                  <option value={1}>Normal (1x)</option>
                  <option value={2}>Tinggi (2x)</option>
                  <option value={3}>Sangat Tinggi (3x)</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-xs">Sertakan Kontrol Peta</Label>
                <Switch checked={includeControls} onCheckedChange={setIncludeControls} />
              </div>
            </div>

            <Button className="w-full" onClick={handleExportMap}>
              <Image className="w-4 h-4 mr-2" />
              Ekspor Peta sebagai PNG
            </Button>

            <div className="text-xs text-muted-foreground bg-gray-50 dark:bg-gray-800 rounded p-2">
              <div className="font-semibold mb-1">Tips:</div>
              <ul className="list-disc list-inside space-y-1">
                <li>Atur zoom dan posisi peta sebelum ekspor</li>
                <li>Kualitas tinggi menghasilkan file lebih besar</li>
                <li>Nonaktifkan kontrol untuk tampilan bersih</li>
              </ul>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
