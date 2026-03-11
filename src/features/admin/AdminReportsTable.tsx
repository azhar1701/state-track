import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Trash2, FileText } from "lucide-react";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { ReportListItem, ReportStatus, ReportSeverity } from "./types";
import { formatDateTime, formatReportLocation } from "@/lib/formatters";

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
  const renderSeverityBadge = (sev?: ReportSeverity | null) => {
    if (!sev) return <span className="text-muted-foreground">-</span>;
    const variant = sev === 'berat' ? 'destructive' : sev === 'sedang' ? 'secondary' : 'outline';
    return <Badge variant={variant}>{sev}</Badge>;
  };

  const renderStatusBadge = (status: ReportStatus) => {
    const variants = {
      selesai: 'success',
      diproses: 'info',
      baru: 'warning'
    } as const;
    return <Badge variant={variants[status]}>{status}</Badge>;
  };

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
    <div className="w-full overflow-x-auto">
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
                <Badge variant="outline" className="text-xs">{report.category}</Badge>
              </TableCell>
              <TableCell>{renderSeverityBadge(report.severity)}</TableCell>
              <TableCell className="max-w-[150px] truncate" title={shortLocation(report)}>
                {shortLocation(report) || <span className="text-muted-foreground text-xs">-</span>}
              </TableCell>
              <TableCell className="max-w-[180px]">
                {report.resolution?.trim() 
                  ? <span className="text-xs truncate block" title={report.resolution}>{report.resolution}</span>
                  : <span className="text-muted-foreground text-xs">-</span>}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">{formatDateTime(report.created_at, false)}</TableCell>
              <TableCell className="text-right">
                <Select
                  value={report.status}
                  onValueChange={(value) => onUpdateStatus(report.id, value as ReportStatus)}
                  disabled={updatingId === report.id}
                >
                  <SelectTrigger className="w-[120px] h-8 ml-auto text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baru">Baru</SelectItem>
                    <SelectItem value="diproses">Diproses</SelectItem>
                    <SelectItem value="selesai">Selesai</SelectItem>
                  </SelectContent>
                </Select>
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

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 pt-4 border-t">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>
            Menampilkan <span className="font-medium text-foreground">{Math.min((page - 1) * pageSize + 1, totalFiltered)}-{Math.min(page * pageSize, totalFiltered)}</span> dari <span className="font-medium text-foreground">{totalFiltered}</span>
          </span>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline">Per halaman:</span>
            <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
              <SelectTrigger className="w-[70px] h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => setPage(Math.max(1, page - 1))}
                aria-disabled={page === 1}
                className="h-8 text-xs"
              />
            </PaginationItem>
            {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
              const pageNum = i + 1;
              return (
                <PaginationItem key={pageNum}>
                  <PaginationLink
                    isActive={page === pageNum}
                    onClick={() => setPage(pageNum)}
                    className="h-8 w-8 text-xs"
                  >
                    {pageNum}
                  </PaginationLink>
                </PaginationItem>
              );
            })}
            <PaginationItem>
              <PaginationNext
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                aria-disabled={page >= totalPages}
                className="h-8 text-xs"
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  );
};
