import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, Calendar } from "lucide-react";
import { 
  StatusFilter, 
  SeverityFilter, 
  CategoryFilter, 
  KecamatanFilter, 
  DesaFilter, 
  DateRangeFilter,
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
  dateRangeFilter: DateRangeFilter;
  setDateRangeFilter: (v: DateRangeFilter) => void;
  sortBy: SortOption;
  setSortBy: (v: SortOption) => void;
  search: string;
  setSearch: (v: string) => void;
  categories: ReportCategory[];
  kecamatanList?: Array<{ id: string; name: string }>;
  desaList?: Array<{ id: string; name: string; kecamatan_id: string }>;
}

const DATE_RANGE_LABELS: Record<DateRangeFilter, string> = {
  semua: "Semua Waktu",
  today: "Hari Ini",
  last_7_days: "7 Hari Terakhir",
  last_30_days: "30 Hari Terakhir",
  this_month: "Bulan Ini",
};

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
  dateRangeFilter,
  setDateRangeFilter,
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
    dateRangeFilter !== 'semua' ||
    search.length > 0;

  const resetFilters = () => {
    setStatusFilter('semua');
    setSeverityFilter('semua');
    setCategoryFilter('semua');
    setKecamatanFilter('semua');
    setDesaFilter('semua');
    setDateRangeFilter('semua');
    setSearch('');
    toast.success("Semua filter berhasil dibersihkan");
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
              <label className="text-xs font-semibold text-muted-foreground mb-2 block">Status Laporan</label>
              <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                <TabsList className="grid grid-cols-4 w-full bg-card border-border shadow-sm p-1">
                  <TabsTrigger value="semua" className="text-xs font-medium">Semua</TabsTrigger>
                  <TabsTrigger value="baru" className="text-xs font-medium">Baru</TabsTrigger>
                  <TabsTrigger value="diproses" className="text-xs font-medium">Diproses</TabsTrigger>
                  <TabsTrigger value="selesai" className="text-xs font-medium">Selesai</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-2 md:gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Severity</label>
                <Select value={severityFilter} onValueChange={(v) => setSeverityFilter(v as SeverityFilter)}>
                  <SelectTrigger className="h-9 text-xs md:text-sm">
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
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Kategori</label>
                <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as CategoryFilter)}>
                  <SelectTrigger className="h-9 text-xs md:text-sm">
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
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Kecamatan</label>
                <Select value={kecamatanFilter} onValueChange={handleKecamatanChange}>
                  <SelectTrigger className="h-9 text-xs md:text-sm">
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
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Desa / Kelurahan</label>
                <Select 
                  value={desaFilter} 
                  onValueChange={(v) => setDesaFilter(v as DesaFilter)}
                  disabled={kecamatanFilter === "semua" || availableDesaList.length === 0}
                >
                  <SelectTrigger className="h-9 text-xs md:text-sm">
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
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-muted-foreground" />
                  Rentang Waktu
                </label>
                <Select value={dateRangeFilter} onValueChange={(v) => setDateRangeFilter(v as DateRangeFilter)}>
                  <SelectTrigger className="h-9 text-xs md:text-sm">
                    <SelectValue placeholder="Semua Waktu" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="semua">Semua Waktu</SelectItem>
                    <SelectItem value="today">Hari Ini</SelectItem>
                    <SelectItem value="last_7_days">7 Hari Terakhir</SelectItem>
                    <SelectItem value="last_30_days">30 Hari Terakhir</SelectItem>
                    <SelectItem value="this_month">Bulan Ini</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Urutkan</label>
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                  <SelectTrigger className="h-9 text-xs md:text-sm">
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
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Pencarian</label>
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari judul, lokasi..."
                  className="h-9 text-xs md:text-sm"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <AnimatePresence>
        {hasActiveFilters && (
          <motion.div 
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="mb-4"
          >
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-muted-foreground">Filter aktif:</span>
              <AnimatePresence mode="popLayout">
                {statusFilter !== 'semua' && (
                  <motion.div
                    key="filter-status"
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Badge variant="secondary" className="gap-1.5 text-xs font-semibold uppercase tracking-wider py-1 pl-2.5 pr-1 bg-background text-primary border-primary/30 shadow-xs">
                      Status: {statusFilter}
                      <button
                        onClick={() => setStatusFilter('semua')}
                        aria-label="Hapus filter status"
                        className="p-0.5 hover:bg-primary/10 rounded-full transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </Badge>
                  </motion.div>
                )}
                {severityFilter !== 'semua' && (
                  <motion.div
                    key="filter-severity"
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Badge variant="secondary" className="gap-1.5 text-xs font-semibold uppercase tracking-wider py-1 pl-2.5 pr-1 bg-background text-amber-500 border-amber-500/30 shadow-xs">
                      Severity: {severityFilter}
                      <button
                        onClick={() => setSeverityFilter('semua')}
                        aria-label="Hapus filter severity"
                        className="p-0.5 hover:bg-amber-500/10 rounded-full transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </Badge>
                  </motion.div>
                )}
                {categoryFilter !== 'semua' && (
                  <motion.div
                    key="filter-category"
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Badge variant="secondary" className="gap-1.5 text-xs font-semibold uppercase tracking-wider py-1 pl-2.5 pr-1 bg-background text-foreground border-border/80 shadow-xs">
                      Kategori: {categoryFilter}
                      <button
                        onClick={() => setCategoryFilter('semua')}
                        aria-label="Hapus filter kategori"
                        className="p-0.5 hover:bg-muted/30 rounded-full transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </Badge>
                  </motion.div>
                )}
                {kecamatanFilter !== 'semua' && (
                  <motion.div
                    key="filter-kecamatan"
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Badge variant="secondary" className="gap-1.5 text-xs font-semibold uppercase tracking-wider py-1 pl-2.5 pr-1 bg-background text-sky-500 border-sky-500/30 shadow-xs">
                      Kecamatan: {kecamatanFilter}
                      <button
                        onClick={() => { setKecamatanFilter('semua'); setDesaFilter('semua'); }}
                        aria-label="Hapus filter kecamatan"
                        className="p-0.5 hover:bg-sky-500/10 rounded-full transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </Badge>
                  </motion.div>
                )}
                {desaFilter !== 'semua' && (
                  <motion.div
                    key="filter-desa"
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Badge variant="secondary" className="gap-1.5 text-xs font-semibold uppercase tracking-wider py-1 pl-2.5 pr-1 bg-background text-indigo-500 border-indigo-500/30 shadow-xs">
                      Desa: {desaFilter}
                      <button
                        onClick={() => setDesaFilter('semua')}
                        aria-label="Hapus filter desa"
                        className="p-0.5 hover:bg-indigo-500/10 rounded-full transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </Badge>
                  </motion.div>
                )}
                {dateRangeFilter !== 'semua' && (
                  <motion.div
                    key="filter-date"
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Badge variant="secondary" className="gap-1.5 text-xs font-semibold uppercase tracking-wider py-1 pl-2.5 pr-1 bg-background text-emerald-500 border-emerald-500/30 shadow-xs">
                      {DATE_RANGE_LABELS[dateRangeFilter]}
                      <button
                        onClick={() => setDateRangeFilter('semua')}
                        aria-label="Hapus filter rentang waktu"
                        className="p-0.5 hover:bg-emerald-500/10 rounded-full transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </Badge>
                  </motion.div>
                )}
                {search.length > 0 && (
                  <motion.div
                    key="filter-search"
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Badge variant="secondary" className="gap-1.5 text-xs font-semibold uppercase tracking-wider py-1 pl-2.5 pr-1 bg-background text-foreground border-border/80 shadow-xs">
                      "{search}"
                      <button
                        onClick={() => setSearch('')}
                        aria-label="Hapus filter pencarian"
                        className="p-0.5 hover:bg-muted/30 rounded-full transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </Badge>
                  </motion.div>
                )}
              </AnimatePresence>
              <Button size="sm" variant="ghost" onClick={resetFilters} className="h-7 text-xs font-medium ml-auto">
                Reset Filter
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
