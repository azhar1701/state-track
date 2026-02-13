/**
 * Spatial Query Builder Component
 * Advanced filtering with geometric queries
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Filter, X, Plus, Trash2 } from 'lucide-react';
import type { SpatialQuery } from '@/lib/spatialQueries';

interface SpatialQueryBuilderProps {
  onQueryChange: (queries: SpatialQuery[]) => void;
  onClose: () => void;
}

export function SpatialQueryBuilder({ onQueryChange, onClose }: SpatialQueryBuilderProps) {
  const [queries, setQueries] = useState<SpatialQuery[]>([]);
  const [currentQuery, setCurrentQuery] = useState<Partial<SpatialQuery>>({
    type: 'buffer',
    radius: 1,
  });

  const addQuery = () => {
    if (!currentQuery.type) return;

    const newQuery: SpatialQuery = {
      id: `query-${Date.now()}`,
      type: currentQuery.type,
      geometry: currentQuery.geometry,
      radius: currentQuery.radius || 1,
      point: currentQuery.point,
      category: currentQuery.category,
      status: currentQuery.status,
      severity: currentQuery.severity,
    };

    const updated = [...queries, newQuery];
    setQueries(updated);
    onQueryChange(updated);

    // Reset current query
    setCurrentQuery({
      type: 'buffer',
      radius: 1,
    });
  };

  const removeQuery = (id: string) => {
    const updated = queries.filter(q => q.id !== id);
    setQueries(updated);
    onQueryChange(updated);
  };

  const clearAll = () => {
    setQueries([]);
    onQueryChange([]);
  };

  return (
    <div className="absolute top-20 right-4 z-[1200] w-96 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border rounded-lg shadow-xl p-4 max-h-[calc(100vh-120px)] overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5" />
          <h3 className="font-semibold">Query Spasial</h3>
        </div>
        <Button size="sm" variant="ghost" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="space-y-4">
        {/* Query Type */}
        <div>
          <Label className="text-xs">Tipe Query</Label>
          <Select
            value={currentQuery.type}
            onValueChange={(value) => setCurrentQuery({ ...currentQuery, type: value as SpatialQuery['type'] })}
          >
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="buffer">Buffer Zone (Radius)</SelectItem>
              <SelectItem value="within">Dalam Polygon</SelectItem>
              <SelectItem value="intersects">Berpotongan Dengan</SelectItem>
              <SelectItem value="near">Dekat Dengan Titik</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Radius for buffer/near */}
        {(currentQuery.type === 'buffer' || currentQuery.type === 'near') && (
          <div>
            <Label className="text-xs">Radius (km): {currentQuery.radius || 1}</Label>
            <Slider
              value={[currentQuery.radius || 1]}
              onValueChange={([v]) => setCurrentQuery({ ...currentQuery, radius: v })}
              min={0.1}
              max={10}
              step={0.1}
              className="mt-2"
            />
          </div>
        )}

        {/* Point input for near */}
        {currentQuery.type === 'near' && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Latitude</Label>
              <Input
                type="number"
                step="0.000001"
                placeholder="-7.325"
                onChange={(e) => {
                  const lat = parseFloat(e.target.value);
                  const lng = currentQuery.point?.[1] || 0;
                  setCurrentQuery({ ...currentQuery, point: [lat, lng] });
                }}
              />
            </div>
            <div>
              <Label className="text-xs">Longitude</Label>
              <Input
                type="number"
                step="0.000001"
                placeholder="108.353"
                onChange={(e) => {
                  const lng = parseFloat(e.target.value);
                  const lat = currentQuery.point?.[0] || 0;
                  setCurrentQuery({ ...currentQuery, point: [lat, lng] });
                }}
              />
            </div>
          </div>
        )}

        {/* Attribute filters */}
        <div className="border-t pt-3 space-y-3">
          <Label className="text-xs font-semibold">Filter Atribut (Opsional)</Label>
          
          <div>
            <Label className="text-xs">Kategori</Label>
            <Select
              value={currentQuery.category || 'all'}
              onValueChange={(value) => setCurrentQuery({ ...currentQuery, category: value === 'all' ? undefined : value })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua</SelectItem>
                <SelectItem value="jalan">Jalan</SelectItem>
                <SelectItem value="jembatan">Jembatan</SelectItem>
                <SelectItem value="irigasi">Irigasi</SelectItem>
                <SelectItem value="drainase">Drainase</SelectItem>
                <SelectItem value="sungai">Sungai</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Status</Label>
            <Select
              value={currentQuery.status || 'all'}
              onValueChange={(value) => setCurrentQuery({ ...currentQuery, status: value === 'all' ? undefined : value })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua</SelectItem>
                <SelectItem value="baru">Baru</SelectItem>
                <SelectItem value="diproses">Diproses</SelectItem>
                <SelectItem value="selesai">Selesai</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Tingkat Keparahan</Label>
            <Select
              value={currentQuery.severity || 'all'}
              onValueChange={(value) => setCurrentQuery({ ...currentQuery, severity: value === 'all' ? undefined : value })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua</SelectItem>
                <SelectItem value="ringan">Ringan</SelectItem>
                <SelectItem value="sedang">Sedang</SelectItem>
                <SelectItem value="berat">Berat</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button className="w-full" onClick={addQuery}>
          <Plus className="w-4 h-4 mr-2" />
          Tambah Query
        </Button>
      </div>

      {/* Active queries */}
      {queries.length > 0 && (
        <div className="mt-4 border-t pt-4">
          <div className="flex items-center justify-between mb-2">
            <Label className="text-xs font-semibold">Query Aktif ({queries.length})</Label>
            <Button size="sm" variant="ghost" onClick={clearAll}>
              <Trash2 className="w-3 h-3 mr-1" />
              Hapus Semua
            </Button>
          </div>
          
          <div className="space-y-2">
            {queries.map(query => (
              <div key={query.id} className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded p-2 text-xs">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-semibold text-blue-900 dark:text-blue-100">
                      {query.type === 'buffer' && `Buffer ${query.radius}km`}
                      {query.type === 'within' && 'Dalam Polygon'}
                      {query.type === 'intersects' && 'Berpotongan'}
                      {query.type === 'near' && `Dekat ${query.radius}km`}
                    </div>
                    {query.category && <div className="text-blue-700 dark:text-blue-300">Kategori: {query.category}</div>}
                    {query.status && <div className="text-blue-700 dark:text-blue-300">Status: {query.status}</div>}
                    {query.severity && <div className="text-blue-700 dark:text-blue-300">Keparahan: {query.severity}</div>}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0"
                    onClick={() => removeQuery(query.id)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 text-xs text-muted-foreground">
        <div className="font-semibold mb-1">Tips:</div>
        <ul className="list-disc list-inside space-y-1">
          <li>Gunakan Draw Tools untuk membuat polygon query</li>
          <li>Query dapat dikombinasikan (AND logic)</li>
          <li>Klik pada peta untuk mendapatkan koordinat</li>
        </ul>
      </div>
    </div>
  );
}