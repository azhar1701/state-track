import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { StatusFilter, SeverityFilter, CategoryFilter, SortOption, ReportCategory } from "./types";

interface AdminFiltersProps {
  statusFilter: StatusFilter;
  setStatusFilter: (v: StatusFilter) => void;
  severityFilter: SeverityFilter;
  setSeverityFilter: (v: SeverityFilter) => void;
  categoryFilter: CategoryFilter;
  setCategoryFilter: (v: CategoryFilter) => void;
  sortBy: SortOption;
  setSortBy: (v: SortOption) => void;
  search: string;
  setSearch: (v: string) => void;
  categories: ReportCategory[];
}

export const AdminFilters = ({
  statusFilter,
  setStatusFilter,
  severityFilter,
  setSeverityFilter,
  categoryFilter,
  setCategoryFilter,
  sortBy,
  setSortBy,
  search,
  setSearch,
  categories,
}: AdminFiltersProps) => {
  const hasActiveFilters = statusFilter !== 'semua' || severityFilter !== 'semua' || categoryFilter !== 'semua' || search.length > 0;

  const resetFilters = () => {
    setStatusFilter('semua');
    setSeverityFilter('semua');
    setCategoryFilter('semua');
    setSearch('');
  };

  return (
    <>
      <Card variant="glass-surface" className="mb-4 overflow-hidden">
        <CardContent className="pt-3 md:pt-4 pb-3 md:pb-4 px-3 md:px-4">
          <div className="space-y-3 md:space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">Status</label>
              <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                <TabsList className="grid grid-cols-4 w-full bg-card border-border shadow-sm p-1">
                  <TabsTrigger value="semua" className="text-2xs md:text-xs">Semua</TabsTrigger>
                  <TabsTrigger value="baru" className="text-2xs md:text-xs">Baru</TabsTrigger>
                  <TabsTrigger value="diproses" className="text-2xs md:text-xs">Diproses</TabsTrigger>
                  <TabsTrigger value="selesai" className="text-2xs md:text-xs">Selesai</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3">
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
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Urutkan</label>
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                  <SelectTrigger className="h-9">
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
                  placeholder="Cari judul..."
                  className="h-9"
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
              <Badge variant="secondary" className="gap-1.5 text-[10px] font-bold uppercase tracking-wider py-1 pl-2.5 pr-1 bg-primary/10 text-primary border-primary/20">
                {statusFilter}
                <button 
                  onClick={() => setStatusFilter('semua')} 
                  aria-label="Hapus filter status"
                  className="p-0.5 hover:bg-primary/20 rounded-full transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            {severityFilter !== 'semua' && (
              <Badge variant="secondary" className="gap-1.5 text-[10px] font-bold uppercase tracking-wider py-1 pl-2.5 pr-1 bg-amber-500/10 text-amber-500 border-amber-500/20">
                {severityFilter}
                <button 
                  onClick={() => setSeverityFilter('semua')} 
                  aria-label="Hapus filter severity"
                  className="p-0.5 hover:bg-amber-500/20 rounded-full transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            {categoryFilter !== 'semua' && (
              <Badge variant="secondary" className="gap-1.5 text-[10px] font-bold uppercase tracking-wider py-1 pl-2.5 pr-1 bg-muted/50 border-border/50">
                {categoryFilter}
                <button 
                  onClick={() => setCategoryFilter('semua')} 
                  aria-label="Hapus filter kategori"
                  className="p-0.5 hover:bg-muted-foreground/20 rounded-full transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            {search.length > 0 && (
              <Badge variant="secondary" className="gap-1.5 text-[10px] font-bold uppercase tracking-wider py-1 pl-2.5 pr-1 bg-muted/50 border-border/50">
                "{search}"
                <button 
                  onClick={() => setSearch('')} 
                  aria-label="Hapus filter pencarian"
                  className="p-0.5 hover:bg-muted-foreground/20 rounded-full transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            <Button size="sm" variant="ghost" onClick={resetFilters} className="h-7 text-xs ml-auto">Reset Filter</Button>
          </div>
        </div>
      )}
    </>
  );
};
