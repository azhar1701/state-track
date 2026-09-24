import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Trash2, FileText, BarChart3, ChevronLeft, ChevronRight, MapPin, Clock } from "lucide-react";
import { ReportListItem, ReportStatus } from "./types";
import { formatDateTime, formatReportLocation } from "@/lib/formatters";
import { SeverityBadge, StatusBadge } from "@/components/common/ReportBadges";

interface AdminReportsTableProps {
  reports: ReportListItem[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string, checked: boolean) => void;
  onToggleSelectAll: () => void;
  allVisibleSelected: boolean;
  onOpenDetail: (report: ReportListItem) => void;
  onUpdateStatus: (id: string, status: ReportStatus) => void;
  onDeleteReport: (id: string) => void;
  updatingId: string | null;
  page: number;
  setPage: (page: number) => void;
  pageSize: number;
  setPageSize: (size: number) => void;
  totalFiltered: number;
}

export const AdminReportsTable = ({
  reports,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  allVisibleSelected,
  onOpenDetail,
  onUpdateStatus,
  onDeleteReport,
  updatingId,
  page,
  setPage,
  pageSize,
  setPageSize,
  totalFiltered,
}: AdminReportsTableProps) => {

  const shortLocation = (r: ReportListItem) =>
    formatReportLocation(r.location_name, r.desa, r.kecamatan);

  if (reports.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
        <p className="text-sm text-muted-foreground">Tidak ada laporan ditemukan</p>
        <p className="text-xs text-muted-foreground mt-1">Coba ubah filter atau pencarian Anda</p>
      </div>
    );
  }

  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));

  return (
    <div className="w-full space-y-4">
      {/* Mobile Card Feed (< 768px) */}
      <div className="block md:hidden space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-border/60 px-1">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={allVisibleSelected}
              onCheckedChange={onToggleSelectAll}
              aria-label="Pilih semua laporan"
            />
            <span className="text-xs text-muted-foreground font-medium">Pilih Semua</span>
          </div>
          <span className="text-xs text-muted-foreground">{reports.length} item</span>
        </div>

        {reports.map((report) => {
          const score = Math.max(
            0,
            Math.min(
              100,
              report.priority_score ??
                (report.severity === "berat"
                  ? 85
                  : report.severity === "sedang"
                  ? 50
                  : 25)
            )
          );
          const priorityColor =
            score >= 70
              ? "bg-red-500"
              : score >= 40
              ? "bg-amber-500"
              : "bg-emerald-500";

          return (
            <div
              key={report.id}
              className="bg-card/90 border border-border/80 rounded-xl p-3.5 shadow-xs space-y-2.5 transition-all"
            >
              {/* Header: Checkbox + Title + Status */}
              <div className="flex items-start gap-2.5">
                <Checkbox
                  checked={selectedIds.has(report.id)}
                  onCheckedChange={(c) => onToggleSelect(report.id, Boolean(c))}
                  aria-label={`Pilih laporan ${report.title || ""}`}
                  className="mt-1"
                />
                <div className="flex-1 min-w-0">
                  <button
                    type="button"
                    onClick={() => onOpenDetail(report)}
                    className="text-left font-semibold text-sm text-foreground hover:text-primary line-clamp-1 block w-full transition-colors"
                    title={report.title || "(tanpa judul)"}
                  >
                    {report.title || "(tanpa judul)"}
                  </button>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1">
                    <Badge
                      variant="secondary"
                      className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-muted/60"
                    >
                      {report.category}
                    </Badge>
                    <SeverityBadge severity={report.severity} />
                  </div>
                </div>
                <StatusBadge status={report.status} />
              </div>

              {/* Location & Date */}
              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground pt-1 border-t border-border/40">
                <div className="flex items-center gap-1.5 truncate">
                  <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="truncate" title={shortLocation(report)}>
                    {shortLocation(report) || "—"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 justify-end">
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-[11px] truncate">
                    {formatDateTime(report.created_at, false)}
                  </span>
                </div>
              </div>

              {/* Priority bar & Quick Action bar */}
              <div className="flex items-center justify-between pt-2 border-t border-border/40 gap-2">
                <div
                  className="flex items-center gap-1.5"
                  title={`Skor Prioritas: ${score}`}
                >
                  <BarChart3 className="w-3.5 h-3.5 text-muted-foreground" />
                  <div className="w-14 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full ${priorityColor}`}
                      style={{ width: `${score}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-mono font-bold text-muted-foreground">
                    {score}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <Select
                    value={report.status}
                    onValueChange={(value) =>
                      onUpdateStatus(report.id, value as ReportStatus)
                    }
                    disabled={updatingId === report.id}
                  >
                    <SelectTrigger className="h-8 text-xs px-2 rounded-lg border-border bg-background/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="baru">Baru</SelectItem>
                      <SelectItem value="diproses">Diproses</SelectItem>
                      <SelectItem value="selesai">Selesai</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-lg"
                    onClick={() => onDeleteReport(report.id)}
                    aria-label="Hapus laporan"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop Tabular View (>= 768px) */}
      <div className="hidden md:block w-full overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-10">
                <Checkbox
                  checked={allVisibleSelected}
                  onCheckedChange={onToggleSelectAll}
                  aria-label="Pilih semua"
                />
              </TableHead>
              <TableHead className="font-semibold">Judul</TableHead>
              <TableHead className="font-semibold">Kategori</TableHead>
              <TableHead className="font-semibold">Severity</TableHead>
              <TableHead className="font-semibold">Lokasi</TableHead>
              <TableHead className="font-semibold">Respon</TableHead>
              <TableHead className="font-semibold">Tanggal</TableHead>
              <TableHead className="font-semibold text-foreground">
                <div className="flex items-center gap-1.5">
                  <BarChart3 className="w-3.5 h-3.5 text-primary" />
                  <span>Skor Prioritas</span>
                </div>
              </TableHead>
              <TableHead className="text-right font-semibold">Status</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reports.map((report) => (
              <TableRow key={report.id} className="hover:bg-muted/50 transition-colors">
                <TableCell>
                  <Checkbox
                    checked={selectedIds.has(report.id)}
                    onCheckedChange={(c) => onToggleSelect(report.id, Boolean(c))}
                    aria-label={`Pilih laporan ${report.title || ''}`}
                  />
                </TableCell>
                <TableCell className="font-medium max-w-[200px]">
                  <button
                    type="button"
                    className="text-left hover:text-primary hover:underline transition-colors truncate block w-full"
                    onClick={() => onOpenDetail(report)}
                    title={report.title || '(tanpa judul)'}
                  >
                    {report.title || '(tanpa judul)'}
                  </button>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-muted/50 border-border/50">
                    {report.category}
                  </Badge>
                </TableCell>
                <TableCell><SeverityBadge severity={report.severity} /></TableCell>
                <TableCell className="max-w-[150px] truncate" title={shortLocation(report)}>
                  {shortLocation(report) || <span className="text-muted-foreground text-xs">-</span>}
                </TableCell>
                <TableCell className="max-w-[180px]">
                  {report.resolution?.trim()
                    ? <span className="text-xs truncate block" title={report.resolution}>{report.resolution}</span>
                    : <span className="text-muted-foreground text-xs">-</span>}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{formatDateTime(report.created_at, false)}</TableCell>
                <TableCell>
                  {(() => {
                    const score = Math.max(0, Math.min(100, report.priority_score ?? (report.severity === 'berat' ? 85 : report.severity === 'sedang' ? 50 : 25)));
                    const color = score >= 70 ? 'bg-red-500' : score >= 40 ? 'bg-amber-500' : 'bg-emerald-500';
                    return (
                      <div className="flex items-center gap-2 group/score" title={`Skor Prioritas: ${score}`}>
                        <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className={`h-full ${color} transition-all duration-300`} style={{ width: `${score}%` }} />
                        </div>
                        <span className="text-[10px] font-mono font-bold text-muted-foreground group-hover/score:text-foreground transition-colors">
                          {score}
                        </span>
                      </div>
                    );
                  })()}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end">
                    <Select
                      value={report.status}
                      onValueChange={(value) => onUpdateStatus(report.id, value as ReportStatus)}
                      disabled={updatingId === report.id}
                    >
                      <SelectTrigger className="w-[120px] h-8 bg-transparent border-none p-0 hover:bg-transparent shadow-none focus:ring-0">
                        <StatusBadge status={report.status} className="w-full justify-between" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="baru">Baru</SelectItem>
                        <SelectItem value="diproses">Diproses</SelectItem>
                        <SelectItem value="selesai">Selesai</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10 transition-colors"
                    onClick={() => onDeleteReport(report.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Fluid & Accessible Pagination */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-x-4 gap-y-3 pt-3 border-t">
        <p className="text-xs text-muted-foreground shrink-0 text-center sm:text-left">
          Menampilkan{" "}
          <span className="font-medium text-foreground">
            {Math.min((page - 1) * pageSize + 1, totalFiltered)}–{Math.min(page * pageSize, totalFiltered)}
          </span>{" "}
          dari{" "}
          <span className="font-medium text-foreground">{totalFiltered}</span>
        </p>

        <div className="flex items-center flex-wrap justify-center gap-2">
          <span className="text-xs text-muted-foreground shrink-0">Per halaman:</span>
          <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
            <SelectTrigger className="w-[68px] h-8 text-xs rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-1 ml-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-lg"
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              aria-label="Halaman sebelumnya"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
              const pageNum = i + 1;
              return (
                <Button
                  key={pageNum}
                  variant={page === pageNum ? "default" : "outline"}
                  size="icon"
                  className="h-8 w-8 text-xs rounded-lg font-medium"
                  onClick={() => setPage(pageNum)}
                >
                  {pageNum}
                </Button>
              );
            })}
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-lg"
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              aria-label="Halaman berikutnya"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
