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

export const LayerAttributeTable = ({ featureCollection, maxFeatures = 1000 }: LayerAttributeTableProps) => {
  const features = useMemo(() => {
    const data = featureCollection?.features;
    if (!data) return [];
    return data;
  }, [featureCollection]);
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

  useEffect(() => {
    setPage(1);
  }, [search, pageSize, limitedFeatures]);

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

  const handlePrev = () => setPage((p) => Math.max(1, p - 1));
  const handleNext = () => setPage((p) => Math.min(pageCount, p + 1));

  return (
    <div className="space-y-3">
      <div className="flex flex-col md:flex-row md:items-end gap-2">
        <div className="w-full md:w-64">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari nilai atribut..."
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="text-xs text-muted-foreground">
            Baris per halaman
          </div>
          <Select
            value={String(pageSize)}
            onValueChange={(value) => setPageSize(Number(value))}
          >
            <SelectTrigger className="h-8 w-[88px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((option) => (
                <SelectItem key={option} value={String(option)}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="text-xs text-muted-foreground md:ml-auto">
          {filteredRows.length} dari {rows.length} fitur{truncated ? ` (dibatasi ${limitedFeatures.length} baris)` : ''}
        </div>
      </div>

      <div className="overflow-auto rounded border max-h-[60vh]">
        <Table className="min-w-full table-auto text-xs">
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 whitespace-nowrap px-2 py-2 text-xs font-medium text-muted-foreground">#</TableHead>
              <TableHead className="w-32 whitespace-nowrap px-2 py-2 text-xs font-medium text-muted-foreground">Geometri</TableHead>
              {columns.map((col) => (
                <TableHead key={col} className="px-2 py-2 text-xs font-medium text-muted-foreground">
                  <span className="block max-w-[220px] break-words">{col}</span>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.map((row) => (
              <TableRow key={row.index} className="align-top">
                <TableCell className="px-2 py-1 text-xs text-muted-foreground align-top">{row.index + 1}</TableCell>
                <TableCell className="px-2 py-1 text-xs align-top">
                  <span className="block max-w-[200px] break-words">{row.geometryType ?? '-'}</span>
                </TableCell>
                {columns.map((col) => {
                  const value = row.properties[col];
                  return (
                    <TableCell key={col} className="px-2 py-1 text-xs align-top">
                      <span className="block max-w-[260px] whitespace-pre-wrap break-words">
                        {value === undefined || value === null ? '-' : String(value)}
                      </span>
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
            {pageRows.length === 0 && (
              <TableRow>
                <TableCell colSpan={2 + columns.length} className="px-3 py-3 text-sm text-muted-foreground">
                  {rows.length === 0 ? 'Tidak ada data atribut yang tersedia' : 'Tidak ada baris yang cocok dengan pencarian'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          Halaman {currentPage} dari {pageCount}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handlePrev} disabled={currentPage <= 1}>
            Sebelumnya
          </Button>
          <Button size="sm" variant="outline" onClick={handleNext} disabled={currentPage >= pageCount}>
            Berikutnya
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LayerAttributeTable;
