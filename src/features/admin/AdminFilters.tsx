import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { 
  StatusFilter, 
  SeverityFilter, 
  CategoryFilter, 
  KecamatanFilter, 
  DesaFilter, 
  SortOption, 
  ReportCategory 
} from "./types";

interface AdminFiltersProps {
  statusFilter: StatusFilter;
  setStatusFilter: (v: StatusFilter) => void;
  severityFilter: SeverityFilter;
  setSeverityFilter: (v: SeverityFilter) => void;
  categoryFilter: CategoryFilter;
  setCategoryFilter: (v: CategoryFilter) => void;
  kecamatanFilter: KecamatanFilter;
  setKecamatanFilter: (v: KecamatanFilter) => void;
  desaFilter: DesaFilter;
  setDesaFilter: (v: DesaFilter) => void;
  sortBy: SortOption;
  setSortBy: (v: SortOption) => void;
  search: string;
  setSearch: (v: string) => void;
  categories: ReportCategory[];
  kecamatanList?: Array<{ id: string; name: string }>;
  desaList?: Array<{ id: string; name: string; kecamatan_id: string }>;
}

export const AdminFilters = ({
  statusFilter,
  setStatusFilter,
  severityFilter,
  setSeverityFilter,
  categoryFilter,
  setCategoryFilter,
  kecamatanFilter,
  setKecamatanFilter,
  desaFilter,
  setDesaFilter,
  sortBy,
  setSortBy,
  search,
  setSearch,
  categories,
  kecamatanList = [],
  desaList = [],
}: AdminFiltersProps) => {
  const selectedKecamatanObj = useMemo(() => {
    if (kecamatanFilter === "semua") return null;
    return kecamatanList.find(k => k.name.toUpperCase() === kecamatanFilter.toUpperCase()) || null;
  }, [kecamatanFilter, kecamatanList]);

  const availableDesaList = useMemo(() => {
    if (!selectedKecamatanObj) return [];
    return desaList.filter(d => d.kecamatan_id === selectedKecamatanObj.id);
  }, [selectedKecamatanObj, desaList]);

  const hasActiveFilters = 
    statusFilter !== 'semua' || 
    severityFilter !== 'semua' || 
    categoryFilter !== 'semua' || 
    kecamatanFilter !== 'semua' || 
    desaFilter !== 'semua' || 
    search.length > 0;

  const resetFilters = () => {
    setStatusFilter('semua');
    setSeverityFilter('semua');
    setCategoryFilter('semua');
    setKecamatanFilter('semua');
    setDesaFilter('semua');
    setSearch('');
  };

  const handleKecamatanChange = (value: string) => {
    setKecamatanFilter(value as KecamatanFilter);
    setDesaFilter('semua');
  };

  return (
    <>
      <Card variant="glass-surface" className="mb-4 overflow-hidden">
        <CardContent className="pt-3 md:pt-4 pb-3 md:pb-4 px-3 md:px-4">
          <div className="space-y-3 md:space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">Status Laporan</label>
              <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                <TabsList className="grid grid-cols-4 w-full bg-card border-border shadow-sm p-1">
                  <TabsTrigger value="semua" className="text-2xs md:text-xs">Semua</TabsTrigger>
                  <TabsTrigger value="baru" className="text-2xs md:text-xs">Baru</TabsTrigger>
                  <TabsTrigger value="diproses" className="text-2xs md:text-xs">Diproses</TabsTrigger>
                  <TabsTrigger value="selesai" className="text-2xs md:text-xs">Selesai</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 md:gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Severity</label>
                <Select value={severityFilter} onValueChange={(v) => setSeverityFilter(v as SeverityFilter)}>
                  <SelectTrigger className="h-8 md:h-9 text-xs md:text-sm">
                    <SelectValue placeholder="Semua Severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="semua">Semua Severity</SelectItem>
                    <SelectItem value="berat">Berat</SelectItem>
                    <SelectItem value="sedang">Sedang</SelectItem>
                    <SelectItem value="ringan">Ringan</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Kategori</label>
                <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as CategoryFilter)}>
                  <SelectTrigger className="h-8 md:h-9 text-xs md:text-sm">
                    <SelectValue placeholder="Semua Kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="semua">Semua Kategori</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Kecamatan</label>
                <Select value={kecamatanFilter} onValueChange={handleKecamatanChange}>
                  <SelectTrigger className="h-8 md:h-9 text-xs md:text-sm">
                    <SelectValue placeholder="Semua Kecamatan" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    <SelectItem value="semua">Semua Kecamatan</SelectItem>
                    {kecamatanList.map((kec) => (
                      <SelectItem key={kec.id} value={kec.name}>
                        {kec.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Desa / Kelurahan</label>
                <Select 
                  value={desaFilter} 
                  onValueChange={(v) => setDesaFilter(v as DesaFilter)}
                  disabled={kecamatanFilter === "semua" || availableDesaList.length === 0}
                >
                  <SelectTrigger className="h-8 md:h-9 text-xs md:text-sm">
                    <SelectValue 
                      placeholder={kecamatanFilter === "semua" ? "Pilih Kec. Dahulu" : "Semua Desa"} 
                    />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    <SelectItem value="semua">Semua Desa</SelectItem>
                    {availableDesaList.map((d) => (
                      <SelectItem key={d.id} value={d.name}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Urutkan</label>
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                  <SelectTrigger className="h-8 md:h-9 text-xs md:text-sm">
                    <SelectValue placeholder="Urutkan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="created_at_desc">Terbaru</SelectItem>
                    <SelectItem value="severity_desc">Severity Tinggi</SelectItem>
                    <SelectItem value="category_asc">Kategori A-Z</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Pencarian</label>
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari judul, lokasi..."
                  className="h-8 md:h-9 text-xs md:text-sm"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {hasActiveFilters && (
        <div className="mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-muted-foreground">Filter aktif:</span>
            {statusFilter !== 'semua' && (
              <Badge variant="secondary" className="gap-1.5 text-[10px] font-bold uppercase tracking-wider py-1 pl-2.5 pr-1 bg-background text-primary border-primary/20 shadow-sm">
                Status: {statusFilter}
                <button
                  onClick={() => setStatusFilter('semua')}
                  aria-label="Hapus filter status"
                  className="p-0.5 hover:bg-primary/5 rounded-full transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            {severityFilter !== 'semua' && (
              <Badge variant="secondary" className="gap-1.5 text-[10px] font-bold uppercase tracking-wider py-1 pl-2.5 pr-1 bg-background text-amber-500 border-amber-500/20 shadow-sm">
                Severity: {severityFilter}
                <button
                  onClick={() => setSeverityFilter('semua')}
                  aria-label="Hapus filter severity"
                  className="p-0.5 hover:bg-amber-500/5 rounded-full transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            {categoryFilter !== 'semua' && (
              <Badge variant="secondary" className="gap-1.5 text-[10px] font-bold uppercase tracking-wider py-1 pl-2.5 pr-1 bg-background text-muted-foreground border-border/50 shadow-sm">
                Kategori: {categoryFilter}
                <button
                  onClick={() => setCategoryFilter('semua')}
                  aria-label="Hapus filter kategori"
                  className="p-0.5 hover:bg-muted-foreground/5 rounded-full transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            {kecamatanFilter !== 'semua' && (
              <Badge variant="secondary" className="gap-1.5 text-[10px] font-bold uppercase tracking-wider py-1 pl-2.5 pr-1 bg-background text-sky-500 border-sky-500/20 shadow-sm">
                Kecamatan: {kecamatanFilter}
                <button
                  onClick={() => { setKecamatanFilter('semua'); setDesaFilter('semua'); }}
                  aria-label="Hapus filter kecamatan"
                  className="p-0.5 hover:bg-sky-500/10 rounded-full transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            {desaFilter !== 'semua' && (
              <Badge variant="secondary" className="gap-1.5 text-[10px] font-bold uppercase tracking-wider py-1 pl-2.5 pr-1 bg-background text-indigo-500 border-indigo-500/20 shadow-sm">
                Desa: {desaFilter}
                <button
                  onClick={() => setDesaFilter('semua')}
                  aria-label="Hapus filter desa"
                  className="p-0.5 hover:bg-indigo-500/10 rounded-full transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            {search.length > 0 && (
              <Badge variant="secondary" className="gap-1.5 text-[10px] font-bold uppercase tracking-wider py-1 pl-2.5 pr-1 bg-background text-muted-foreground border-border/50 shadow-sm">
                "{search}"
                <button
                  onClick={() => setSearch('')}
                  aria-label="Hapus filter pencarian"
                  className="p-0.5 hover:bg-muted-foreground/5 rounded-full transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            <Button size="sm" variant="ghost" onClick={resetFilters} className="h-7 text-xs ml-auto">
              Reset Filter
            </Button>
          </div>
        </div>
      )}
    </>
  );
};
