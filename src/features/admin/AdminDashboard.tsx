import { useMemo, useState, useEffect, Suspense, lazy } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/services/client";
import { useAuth } from "@/features/auth/useAuth";
import { useAdminReports, getDateRangeThreshold } from "./useAdminReports";
import { AdminStatsCards } from "./AdminStatsCards";
import { AdminFilters } from "./AdminFilters";
import { AdminReportsTable } from "./AdminReportsTable";
import {
  AdminTab,
  ADMIN_TABS,
  ReportListItem,
  StatusFilter,
  SeverityFilter,
  CategoryFilter,
  KecamatanFilter,
  DesaFilter,
  DateRangeFilter,
  SortOption,
  ReportStatus
} from "./types";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  DropdownMenu, 
  DropdownMenuTrigger, 
  DropdownMenuContent, 
  DropdownMenuItem 
} from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Loader2, Download, ChevronDown, FileSpreadsheet, Globe } from "lucide-react";
import { logger } from "@/lib/logger";
import { useDebounce } from "@/hooks/useDebounce";
import { exportReportsToCsv, exportReportsToGeoJson } from "./exportReports";
import { formatDateTime } from "@/lib/formatters";
import { Skeleton } from "@/components/ui/skeleton";
import { StatSkeleton, TableSkeleton, DetailSkeleton } from "@/components/common/Skeletons";

// Lazy components
const GeoDataManagerLazy = lazy(() => import("@/features/geodata/GeoDataManager"));
const HelpCenterLazy = lazy(() => import("@/views/HelpCenter"));
const AdminSettingsLazy = lazy(() => import("@/features/admin/AdminSettings"));
const AdminDetail = lazy(() => import("./AdminDetail"));

const AdminDashboard = () => {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // State management
  const initialTab = (searchParams.get('tab') as AdminTab) || 'reports';
  const [activeTab, setActiveTab] = useState<AdminTab>(ADMIN_TABS.includes(initialTab) ? initialTab : 'reports');

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('semua');
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('semua');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('semua');
  const [kecamatanFilter, setKecamatanFilter] = useState<KecamatanFilter>('semua');
  const [desaFilter, setDesaFilter] = useState<DesaFilter>('semua');
  const [dateRangeFilter, setDateRangeFilter] = useState<DateRangeFilter>('semua');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 350);
  const [sortBy, setSortBy] = useState<SortOption>('created_at_desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isExporting, setIsExporting] = useState(false);

  // Reset to first page whenever search or filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, severityFilter, categoryFilter, kecamatanFilter, desaFilter, dateRangeFilter, sortBy]);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<ReportStatus | ''>('');
  const [confirmBulkOpen, setConfirmBulkOpen] = useState(false);

  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ReportListItem | null>(null);
  const [selectedReportIndex, setSelectedReportIndex] = useState<number>(-1);
  const [reportToDelete, setReportToDelete] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Use our hook with debounced search
  const {
    reports,
    totalFiltered,
    isLoadingReports,
    stats,
    categories,
    kecamatanList,
    desaList,
    lastSyncedAt,
    updateStatus,
    bulkUpdate,
    deleteReport
  } = useAdminReports({
    statusFilter,
    severityFilter,
    categoryFilter,
    kecamatanFilter,
    desaFilter,
    dateRangeFilter,
    search: debouncedSearch,
    sortBy,
    page,
    pageSize
  });

  const openDetail = (r: ReportListItem, idx: number) => {
    setSelectedReport(r);
    setSelectedReportIndex(idx);
    setDetailOpen(true);
  };

  const handlePrev = () => {
    const prevIdx = selectedReportIndex - 1;
    if (prevIdx >= 0) {
      setSelectedReport(reports[prevIdx]);
      setSelectedReportIndex(prevIdx);
    } else if (page > 1) {
      setPage(p => p - 1);
      // Index will be reconciled when new page loads
      setSelectedReportIndex(pageSize - 1);
    }
  };

  const handleNext = () => {
    const nextIdx = selectedReportIndex + 1;
    if (nextIdx < reports.length) {
      setSelectedReport(reports[nextIdx]);
      setSelectedReportIndex(nextIdx);
    } else if (page * pageSize < totalFiltered) {
      setPage(p => p + 1);
      setSelectedReportIndex(0);
    }
  };

  const hasPrev = selectedReportIndex > 0 || page > 1;
  const hasNext = selectedReportIndex < reports.length - 1 || page * pageSize < totalFiltered;

  const handleDetailUpdateStatus = async (id: string, status: ReportStatus) => {
    await updateStatus({ id, status });
    setSelectedReport(prev => (prev && prev.id === id ? { ...prev, status } : prev));
  };

  const handleDetailUpdateReport = (updatedFields: Partial<ReportListItem>) => {
    setSelectedReport(prev => (prev ? { ...prev, ...updatedFields } : prev));
  };

  // Reconcile selectedReport if reports list updates from server/real-time
  useEffect(() => {
    if (selectedReport && reports.length > 0) {
      const match = reports.find(r => r.id === selectedReport.id);
      if (match && (
        match.title !== selectedReport.title ||
        match.status !== selectedReport.status ||
        match.severity !== selectedReport.severity ||
        match.resolution !== selectedReport.resolution ||
        match.updated_at !== selectedReport.updated_at
      )) {
        setSelectedReport(match);
      }
    }
  }, [reports, selectedReport]);


  const allVisibleSelected = useMemo(() => {
    if (reports.length === 0) return false;
    return reports.every((r) => selectedIds.has(r.id));
  }, [reports, selectedIds]);

  const [isSelectingAllFiltered, setIsSelectingAllFiltered] = useState(false);

  const handleSelectAllFiltered = async () => {
    try {
      setIsSelectingAllFiltered(true);
      let query = supabase.from("reports").select("id");
      if (statusFilter !== "semua") query = query.eq("status", statusFilter);
      if (severityFilter !== "semua") query = query.eq("severity", severityFilter);
      if (categoryFilter !== "semua") query = query.eq("category", categoryFilter);
      if (kecamatanFilter !== "semua") query = query.eq("kecamatan", kecamatanFilter);
      if (desaFilter !== "semua") query = query.eq("desa", desaFilter);
      const threshold = getDateRangeThreshold(dateRangeFilter);
      if (threshold) query = query.gte("created_at", threshold.toISOString());
      if (debouncedSearch.trim()) {
        const term = debouncedSearch.trim();
        query = query.or(`title.ilike.%${term}%,location_name.ilike.%${term}%,desa.ilike.%${term}%,kecamatan.ilike.%${term}%`);
      }
      const { data, error } = await query;
      if (error) throw error;
      if (data) {
        setSelectedIds(new Set(data.map((d: { id: string }) => d.id)));
        toast.info(`Berhasil memilih seluruh ${data.length} laporan`);
      }
    } catch (err) {
      logger.error("Failed to select all filtered reports", err);
      toast.error("Gagal memilih seluruh laporan");
    } finally {
      setIsSelectingAllFiltered(false);
    }
  };

  const handleToggleSelectAll = () => {
    if (allVisibleSelected) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        reports.forEach(r => next.delete(r.id));
        return next;
      });
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev);
        reports.forEach(r => next.add(r.id));
        return next;
      });
    }
  };

  const handleToggleSelect = (id: string, checked: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (checked) next.add(id); else next.delete(id);
      return next;
    });
  };

  const handleBulkUpdate = async () => {
    if (!bulkStatus || selectedIds.size === 0) return;
    try {
      await bulkUpdate({
        ids: Array.from(selectedIds),
        status: bulkStatus as ReportStatus,
        userId: user?.id,
        userEmail: user?.email
      });
      setSelectedIds(new Set());
      setBulkStatus('');
      setConfirmBulkOpen(false);
    } catch (err) {
      logger.error("Bulk update failed", err);
    }
  };

  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      await exportReportsToCsv({
        statusFilter,
        severityFilter,
        categoryFilter,
        kecamatanFilter,
        desaFilter,
        dateRangeFilter,
        search: debouncedSearch,
        sortBy
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportGeoJson = async () => {
    setIsExporting(true);
    try {
      await exportReportsToGeoJson({
        statusFilter,
        severityFilter,
        categoryFilter,
        kecamatanFilter,
        desaFilter,
        dateRangeFilter,
        search: debouncedSearch,
        sortBy
      });
    } finally {
      setIsExporting(false);
    }
  };

  const onChangeTab = (tab: AdminTab) => {
    setActiveTab(tab);
    setSearchParams(prev => {
      const sp = new URLSearchParams(prev);
      if (tab === 'reports') sp.delete('tab'); else sp.set('tab', tab);
      return sp;
    });
  };


  if (authLoading) return (
    <div className="container px-4 py-8 space-y-8">
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>
      <StatSkeleton />
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <TableSkeleton rows={8} />
      </div>
    </div>
  );
  if (!isAdmin) { navigate("/"); return null; }

  return (
    <div className="min-h-screen bg-gradient-to-br from-accent/5 via-background to-primary/5 py-4 md:py-6">
      <div className="container px-3 md:px-4">
        <div className="mb-4 md:mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold mb-1">Dashboard Admin</h1>
            <p className="text-sm md:text-base text-muted-foreground">Kelola laporan dan pengaturan sistem secara terpusat</p>
          </div>
          <div className="flex items-center gap-2.5 self-start sm:self-auto bg-card/70 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-border/70 shadow-xs">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>Real-time Aktif</span>
            </div>
            <span className="text-muted-foreground/40 text-xs">•</span>
            <span className="text-[11px] font-medium text-muted-foreground">
              Sinkron: {formatDateTime(lastSyncedAt.toISOString(), false)}
            </span>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => onChangeTab(v as AdminTab)}>
          <div className="relative w-full mb-4 md:mb-6">
            <TabsList className="w-full flex overflow-x-auto no-scrollbar flex-nowrap sm:flex-wrap gap-2 bg-card border-border shadow-sm rounded-xl p-1.5 md:p-2 h-auto justify-start sm:justify-center">
              <TabsTrigger value="reports" className="flex-shrink-0 sm:flex-1 min-w-[110px] sm:min-w-[140px]">Laporan</TabsTrigger>
              <TabsTrigger value="geo" className="flex-shrink-0 sm:flex-1 min-w-[110px] sm:min-w-[140px]">Geo Data</TabsTrigger>
              <TabsTrigger value="help" className="flex-shrink-0 sm:flex-1 min-w-[110px] sm:min-w-[140px]">Help Center</TabsTrigger>
              <TabsTrigger value="settings" className="flex-shrink-0 sm:flex-1 min-w-[110px] sm:min-w-[140px]">Pengaturan</TabsTrigger>
            </TabsList>
            {/* Indikator visual overflow scroll horizontal pada layar kecil */}
            <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background/90 via-background/40 to-transparent sm:hidden rounded-r-xl" />
          </div>

          <TabsContent value="reports" className="mt-0">
            <AdminStatsCards stats={stats} />

            <AdminFilters
              statusFilter={statusFilter} setStatusFilter={setStatusFilter}
              severityFilter={severityFilter} setSeverityFilter={setSeverityFilter}
              categoryFilter={categoryFilter} setCategoryFilter={setCategoryFilter}
              kecamatanFilter={kecamatanFilter} setKecamatanFilter={setKecamatanFilter}
              desaFilter={desaFilter} setDesaFilter={setDesaFilter}
              dateRangeFilter={dateRangeFilter} setDateRangeFilter={setDateRangeFilter}
              sortBy={sortBy} setSortBy={setSortBy}
              search={search} setSearch={setSearch}
              categories={categories}
              kecamatanList={kecamatanList}
              desaList={desaList}
            />

            <Card className="bg-card border-border shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <CardTitle className="text-lg">Daftar Laporan ({totalFiltered})</CardTitle>
                  <div className="flex items-center gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs gap-1.5 rounded-lg border-border/80 hover:bg-accent shadow-sm"
                          disabled={isExporting || totalFiltered === 0}
                        >
                          {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" /> : <Download className="w-3.5 h-3.5 text-primary" />}
                          <span>Ekspor Laporan</span>
                          <ChevronDown className="w-3 h-3 opacity-60 ml-0.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuItem onClick={handleExportCsv} className="gap-2 text-xs cursor-pointer">
                          <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <div className="flex flex-col text-left">
                            <span className="font-semibold">Ekspor CSV (Excel)</span>
                            <span className="text-[10px] text-muted-foreground">Kompatibel spreadsheet dinas</span>
                          </div>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleExportGeoJson} className="gap-2 text-xs cursor-pointer">
                          <Globe className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
                          <div className="flex flex-col text-left">
                            <span className="font-semibold">Ekspor GeoJSON (GIS)</span>
                            <span className="text-[10px] text-muted-foreground">Format spasial QGIS / ArcGIS</span>
                          </div>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-4 pb-4 border-b">
                  <div className="text-xs text-muted-foreground">{selectedIds.size} item dipilih</div>
                  <div className="flex items-center gap-2">
                    <Select value={bulkStatus} onValueChange={(v) => setBulkStatus(v as ReportStatus)}>
                      <SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue placeholder="Ubah status..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="baru">Baru</SelectItem>
                        <SelectItem value="diproses">Diproses</SelectItem>
                        <SelectItem value="selesai">Selesai</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button size="sm" disabled={!bulkStatus || selectedIds.size === 0} onClick={() => bulkStatus === 'selesai' ? setConfirmBulkOpen(true) : handleBulkUpdate()}>
                      Terapkan
                    </Button>
                  </div>
                </div>

                {allVisibleSelected && totalFiltered > reports.length && (
                  <div className="mb-4 px-3 py-2.5 rounded-lg bg-primary/10 border border-primary/20 flex flex-wrap items-center justify-between gap-2 text-xs text-primary animate-in fade-in duration-150">
                    <span>
                      {selectedIds.size >= totalFiltered ? (
                        <>Seluruh <strong>{totalFiltered}</strong> laporan yang sesuai filter telah dipilih.</>
                      ) : (
                        <>Semua <strong>{reports.length}</strong> laporan di halaman ini telah dipilih.</>
                      )}
                    </span>
                    {selectedIds.size < totalFiltered ? (
                      <Button
                        size="sm"
                        variant="link"
                        className="h-auto p-0 text-xs font-semibold text-primary underline hover:text-primary/80"
                        onClick={handleSelectAllFiltered}
                        disabled={isSelectingAllFiltered}
                      >
                        {isSelectingAllFiltered ? (
                          <span className="flex items-center gap-1">
                            <Loader2 className="w-3 h-3 animate-spin" /> Memilih...
                          </span>
                        ) : (
                          `Pilih seluruh ${totalFiltered} laporan yang sesuai filter`
                        )}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="link"
                        className="h-auto p-0 text-xs font-semibold text-muted-foreground underline hover:text-foreground"
                        onClick={() => setSelectedIds(new Set())}
                      >
                        Batalkan semua pilihan
                      </Button>
                    )}
                  </div>
                )}

                {isLoadingReports ? (
                  <TableSkeleton rows={pageSize} />
                ) : (
                  <AdminReportsTable
                    reports={reports}
                    selectedIds={selectedIds}
                    onToggleSelect={handleToggleSelect}
                    onToggleSelectAll={handleToggleSelectAll}
                    allVisibleSelected={allVisibleSelected}
                    onOpenDetail={(r) => {
                      const idx = reports.findIndex(rep => rep.id === r.id);
                      openDetail(r, idx);
                    }}
                    onUpdateStatus={(id, status) => updateStatus({ id, status, userId: user?.id, userEmail: user?.email })}
                    onDeleteReport={(id) => { setReportToDelete(id); setDeleteDialogOpen(true); }}
                    updatingId={null}
                    page={page} setPage={setPage}
                    pageSize={pageSize} setPageSize={setPageSize}
                    totalFiltered={totalFiltered}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="geo">
            <Suspense fallback={<TableSkeleton rows={10} />}>
              <GeoDataManagerLazy />
            </Suspense>
          </TabsContent>
          <TabsContent value="help">
            <Suspense fallback={<DetailSkeleton />}>
              <HelpCenterLazy embedded={true} />
            </Suspense>
          </TabsContent>
          <TabsContent value="settings">
            <Suspense fallback={<DetailSkeleton />}>
              <AdminSettingsLazy />
            </Suspense>
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialogs */}
      <AlertDialog open={confirmBulkOpen} onOpenChange={setConfirmBulkOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Selesai</AlertDialogTitle>
            <AlertDialogDescription>Tandai {selectedIds.size} laporan sebagai selesai?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkUpdate}>Ya, Simpan</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Laporan?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Laporan akan dihapus secara permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={async () => { if (reportToDelete) { await deleteReport(reportToDelete); setDeleteDialogOpen(false); } }}>Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {detailOpen && (
        <Suspense fallback={null}>
          <AdminDetail
            open={detailOpen}
            selectedReport={selectedReport}
            onClose={() => setDetailOpen(false)}
            onPrev={handlePrev}
            onNext={handleNext}
            hasPrev={hasPrev}
            hasNext={hasNext}
            currentIndex={selectedReportIndex >= 0 ? (page - 1) * pageSize + selectedReportIndex : undefined}
            totalCount={totalFiltered}
            onUpdateStatus={handleDetailUpdateStatus}
            onUpdateReport={handleDetailUpdateReport}
          />
        </Suspense>
      )}
    </div>
  );
};

export default AdminDashboard;
