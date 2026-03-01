import { useEffect, useMemo, useState } from 'react';
import type { FeatureCollection, Geometry } from 'geojson';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type LayerAttributeTableProps = {
  featureCollection: FeatureCollection<Geometry> | null;
  maxFeatures?: number;
};

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const LayerAttributeTable = ({ featureCollection, maxFeatures = 1000 }: LayerAttributeTableProps) => {
  const features = useMemo(() => featureCollection?.features ?? [], [featureCollection]);
  const limitedFeatures = useMemo(() => features.slice(0, maxFeatures), [features, maxFeatures]);
  const truncated = features.length > limitedFeatures.length;

  const columns = useMemo(() => {
    const names = new Set<string>();
    for (const feat of limitedFeatures) {
      const props = feat.properties as Record<string, unknown> | undefined;
      if (!props) continue;
      Object.keys(props).forEach((key) => names.add(key));
      if (names.size >= 50) break;
    }
    return Array.from(names);
  }, [limitedFeatures]);

  const rows = useMemo(() => limitedFeatures.map((feature, index) => ({
    index,
    geometryType: feature.geometry?.type ?? null,
    properties: (feature.properties as Record<string, unknown> | undefined) || {},
  })), [limitedFeatures]);

  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState<number>(25);
  const [page, setPage] = useState(1);

  useEffect(() => { setPage(1); }, [search, pageSize, limitedFeatures]);

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((row) => (
      (row.geometryType && row.geometryType.toLowerCase().includes(term)) ||
      columns.some((col) => {
        const value = row.properties[col];
        return value !== undefined && String(value).toLowerCase().includes(term);
      })
    ));
  }, [rows, columns, search]);

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const start = (currentPage - 1) * pageSize;
  const pageRows = filteredRows.slice(start, start + pageSize);

  if (rows.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 text-sm text-muted-foreground border rounded-lg">
        Tidak ada data atribut yang tersedia
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <Input className="w-full sm:w-64" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari nilai atribut..." />
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground whitespace-nowrap">Baris/halaman</span>
            <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
              <SelectTrigger className="h-9 w-20"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((opt) => <SelectItem key={opt} value={String(opt)}>{opt}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {filteredRows.length} dari {rows.length}{truncated ? ` (max ${maxFeatures})` : ''}
          </span>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-auto max-h-[50vh]">
          <Table>
            <TableHeader className="sticky top-0 bg-muted/50 backdrop-blur">
              <TableRow>
                <TableHead className="w-12 text-center">#</TableHead>
                <TableHead className="w-32">Geometri</TableHead>
                {columns.map((col) => <TableHead key={col} className="min-w-[120px]">{col}</TableHead>)}
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map((row) => (
                <TableRow key={row.index}>
                  <TableCell className="text-center text-xs text-muted-foreground">{row.index + 1}</TableCell>
                  <TableCell className="text-xs font-mono">{row.geometryType ?? '-'}</TableCell>
                  {columns.map((col) => {
                    const value = row.properties[col];
                    return (
                      <TableCell key={col} className="text-xs">
                        <div className="max-w-[200px] truncate" title={value === undefined || value === null ? '-' : String(value)}>
                          {value === undefined || value === null ? '-' : String(value)}
                        </div>
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
              {pageRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={2 + columns.length} className="text-center py-8 text-sm text-muted-foreground">
                    Tidak ada hasil yang cocok dengan pencarian
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Halaman {currentPage} dari {pageCount}</span>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={currentPage <= 1}>Sebelumnya</Button>
          <Button size="sm" variant="outline" onClick={() => setPage((p) => Math.min(pageCount, p + 1))} disabled={currentPage >= pageCount}>Berikutnya</Button>
        </div>
      </div>
    </div>
  );
};

export default LayerAttributeTable;
