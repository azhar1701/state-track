import { handleApiError } from "@/lib/api-errors";
import { formatDateTime, formatReportLocation } from "@/lib/formatters";
import { logger } from "@/lib/logger";
import LoadingOverlay from '@/components/common/LoadingOverlay';
import { useCallback, useEffect, useMemo, useState, Component, ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/services/client";
import type { Database } from "@/services/types";
import { useAuth } from "@/features/auth/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious, PaginationLink } from "@/components/ui/pagination";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Suspense, lazy } from "react";
import { toast } from "sonner";
import { FileText, Clock, CheckCircle, Loader2, X, Trash2, AlertCircle } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, BarChart, Bar } from 'recharts';
import { motion } from 'framer-motion';

type ReportRow = Database["public"]["Tables"]["reports"]["Row"];
type ReportStatus = Database["public"]["Enums"]["report_status"];
type ReportSeverity = Database["public"]["Enums"]["report_severity"];
type ReportCategory = Database["public"]["Enums"]["report_category"];

type ReportListItem = Pick<
  ReportRow,
  "id" | "title" | "category" | "status" | "created_at" | "location_name" | "severity" | "kecamatan" | "desa" | "resolution"
>;

type ReportDetail = Pick<
  ReportRow,
  "description" | "reporter_name" | "phone" | "latitude" | "longitude" | "photo_url" | "photo_urls"
>;

type ReportLogEntry = Database["public"]["Tables"]["report_logs"]["Row"];

type StatusFilter = "semua" | ReportStatus;
type SeverityFilter = "semua" | ReportSeverity;
type CategoryFilter = "semua" | ReportCategory;
type SortOption = "created_at_desc" | "severity_desc" | "category_asc";

const REPORT_LIST_COLUMNS =
  "id,title,category,status,created_at,severity,kecamatan,desa,resolution";
const REPORT_DETAIL_COLUMNS =
  "description,reporter_name,phone,latitude,longitude,photo_url,photo_urls";
const SEVERITY_WEIGHT: Record<ReportSeverity, number> = {
  ringan: 1,
  sedang: 2,
  berat: 3,
};
const REPORT_FALLBACK_COLUMNS =
  "id,title,category,status,created_at,severity,resolution,kecamatan,desa";
const REPORT_MINIMAL_COLUMNS =
  "id,title,status,created_at,severity,resolution";
const REPORT_STATUSES: readonly ReportStatus[] = ['baru', 'diproses', 'selesai'];
const REPORT_SEVERITIES: readonly ReportSeverity[] = ['ringan', 'sedang', 'berat'];
const SORT_OPTIONS: readonly SortOption[] = ['created_at_desc', 'severity_desc', 'category_asc'];
const ADMIN_TABS = ['reports', 'insights', 'geo', 'help', 'settings'] as const;
type AdminTab = (typeof ADMIN_TABS)[number];

const isReportStatus = (value: string): value is ReportStatus =>
  REPORT_STATUSES.includes(value as ReportStatus);

const isStatusFilter = (value: string): value is StatusFilter =>
  value === 'semua' || isReportStatus(value);

const isSeverityFilter = (value: string): value is SeverityFilter =>
  value === 'semua' || REPORT_SEVERITIES.includes(value as ReportSeverity);

const isSortOption = (value: string): value is SortOption =>
  SORT_OPTIONS.includes(value as SortOption);

const isAdminTab = (value: string): value is (typeof ADMIN_TABS)[number] =>
  ADMIN_TABS.includes(value as (typeof ADMIN_TABS)[number]);

const GeoDataManagerLazy = lazy(() => import("@/features/geodata/GeoDataManager"));
const HelpCenterLazy = lazy(() => import("@/views/HelpCenter"));
const AdminSettingsLazy = lazy(() => import("@/features/admin/AdminSettings"));

  const sendWhatsAppNotification = async (reportId: string, newStatus: string) => {
    try {
      // Mocking WhatsApp Edge Function call
      // In production, this would be: await supabase.functions.invoke('whatsapp-notify', { body: { reportId, newStatus } });
      console.info(`[WhatsApp] Notifikasi dikirim untuk laporan ${reportId}: status baru -> ${newStatus}`);
    } catch (err) {
      logger.error('WhatsApp notification error:', err);
    }
  };
const AdminDashboard = () => {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTabParam = (searchParams.get('tab') || 'reports').toLowerCase();
  const normalizedInitialTab = initialTabParam === 'insights' ? 'reports' : initialTabParam;
  const initialTab: AdminTab = isAdminTab(normalizedInitialTab) ? normalizedInitialTab : 'reports';
  const [activeTab, setActiveTab] = useState<AdminTab>(initialTab);
  const [reports, setReports] = useState<ReportListItem[]>([]);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('semua');
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('semua');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('semua');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('created_at_desc');
  const [stats, setStats] = useState({ total: 0, baru: 0, diproses: 0, selesai: 0 });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalFiltered, setTotalFiltered] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<ReportStatus | ''>('');
  const [bulkLoading, setBulkLoading] = useState(false);
  const [confirmBulkOpen, setConfirmBulkOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ReportListItem | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editSeverity, setEditSeverity] = useState<ReportSeverity | ''>('');
  const [editResolution, setEditResolution] = useState('');
  const [saving, setSaving] = useState(false);
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false);
  const [conflictData, setConflictData] = useState<ReportRow | null>(null);
  const maxResolutionLen = 5000;
  const [chartDays, setChartDays] = useState<7 | 30>(30);
  const [chartDaily, setChartDaily] = useState<Array<{ date: string; count: number }>>([]);
  const [chartByCategory, setChartByCategory] = useState<Array<{ name: string; count: number }>>([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [chartInitialized, setChartInitialized] = useState(false);
  const [statsInitialized, setStatsInitialized] = useState(false);
  const [logs, setLogs] = useState<ReportLogEntry[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [fullReport, setFullReport] = useState<ReportDetail | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reportToDelete, setReportToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  const shortLocation = (r: ReportListItem | null | undefined) => 
    formatReportLocation(r?.location_name, r?.desa, r?.kecamatan);

  // Small helper to preview long text with ellipsis
  const previewText = (text?: string | null, max = 80) => {
    if (!text) return '';
    const s = text.trim();
    if (s.length <= max) return s;
    return `${s.slice(0, Math.max(0, max - 3))}...`;
  };

  const formatDate = (iso?: string | null) => formatDateTime(iso, false);

  const fetchReports = useCallback(async () => {
    const normalizeReport = (raw: Partial<ReportListItem>): ReportListItem => ({
      id: raw.id ?? '',
      title: raw.title ?? '',
      category: (raw.category as ReportCategory | undefined) ?? 'lainnya',
      status: (raw.status as ReportStatus | undefined) ?? 'baru',
      created_at: raw.created_at ?? '',
      location_name: raw.location_name ?? null,
      severity: (raw.severity as ReportSeverity | null | undefined) ?? null,
      kecamatan: raw.kecamatan ?? null,
      desa: raw.desa ?? null,
      resolution: raw.resolution ?? null,
    });

    const buildQuery = (
      columns: string,
      options?: { includeSeverity?: boolean; withCount?: boolean }
    ) => {
      const { includeSeverity = true, withCount = true } = options ?? {};
      let query = supabase
        .from('reports')
        .select(columns, withCount ? { count: 'exact' } : undefined);
      if (statusFilter !== 'semua') query = query.eq('status', statusFilter);
      if (includeSeverity && severityFilter !== 'semua') query = query.eq('severity', severityFilter);
      if (categoryFilter !== 'semua') query = query.eq('category', categoryFilter);
      if (debouncedSearch) query = query.ilike('title', `%${debouncedSearch}%`);

      if (sortBy === 'created_at_desc') {
        query = query.order('created_at', { ascending: false });
      } else if (sortBy === 'category_asc') {
        query = query.order('category', { ascending: true }).order('created_at', { ascending: false });
      } else {
        query = query.order('created_at', { ascending: false });
      }
      return query;
    };

    const runPagedQuery = async (
      query: ReturnType<typeof buildQuery>,
      allowSeveritySort: boolean
    ) => {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      const response = await query.range(from, to);

      const { data, error, count } = response;
      if (error) {
        const err = error as { message?: string };
        throw new Error(err?.message || String(error));
      }

      let result = Array.isArray(data) ? data.map((item) => normalizeReport(item as Partial<ReportListItem>)) : [];

      if (allowSeveritySort && sortBy === 'severity_desc') {
        result = [...result].sort((a, b) => {
          const weightB = b.severity ? SEVERITY_WEIGHT[b.severity] : 0;
          const weightA = a.severity ? SEVERITY_WEIGHT[a.severity] : 0;
          if (weightB !== weightA) return weightB - weightA;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
      }

      return {
        items: result,
        total: typeof count === 'number' ? count : result.length,
      };
    };

    const applyResult = (items: ReportListItem[], total: number) => {
      setReports(items);
      setTotalFiltered(total);
      setSelectedIds((prev) => {
        const next = new Set<string>();
        const visible = new Set(items.map((r) => r.id));
        prev.forEach((id) => {
          if (visible.has(id)) next.add(id);
        });
        return next;
      });
      if (selectedReport) {
        const updated = items.find((item) => item.id === selectedReport.id);
        if (updated && detailOpen) {
          setSelectedReport((prev) => (prev ? { ...prev, ...updated } : updated));
        }
      }
    };

    try {
      const primaryQuery = buildQuery(REPORT_LIST_COLUMNS, { includeSeverity: true, withCount: true });
      const { items, total } = await runPagedQuery(primaryQuery, true);
      applyResult(items, total);
    } catch (primaryError) {
      console.warn('[AdminDashboard] Extended reports query failed, trying fallback', primaryError);
      try {
        const fallbackQuery = buildQuery(REPORT_FALLBACK_COLUMNS, { includeSeverity: false, withCount: true });
        const { items, total } = await runPagedQuery(fallbackQuery, false);
        applyResult(items, total);
      } catch (fallbackError) {
        console.warn('[AdminDashboard] Fallback reports query failed, trying minimal', fallbackError);
        try {
          const minimalQuery = buildQuery(REPORT_MINIMAL_COLUMNS, { includeSeverity: false, withCount: false });
          const { items } = await runPagedQuery(minimalQuery, false);
          applyResult(items, items.length);
          toast.warning('Beberapa kolom laporan tidak tersedia. Tampilkan data dasar saja.');
        } catch (minimalError) {
          logger.error('[AdminDashboard] Minimal reports query failed:', minimalError);
          toast.error(handleApiError(minimalError as Error, 'Gagal memuat laporan'));
          setReports([]);
          setTotalFiltered(0);
          setSelectedIds(new Set());
        }
      }
    } finally {
      // End of paged query
    }
  }, [
    statusFilter,
    severityFilter,
    categoryFilter,
    debouncedSearch,
    sortBy,
    page,
    pageSize,
    detailOpen,
    selectedReport,
  ]);

  const allVisibleSelected = useMemo(() => {
    if (reports.length === 0) return false;
    return reports.every((r) => selectedIds.has(r.id));
  }, [reports, selectedIds]);

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      // unselect all visible
      setSelectedIds((prev) => {
        const next = new Set(prev);
        reports.forEach((r) => next.delete(r.id));
        return next;
      });
    } else {
      // select all visible
      setSelectedIds((prev) => {
        const next = new Set(prev);
        reports.forEach((r) => next.add(r.id));
        return next;
      });
    }
  };

  const openDetail = (r: ReportListItem) => {
    try {
      const reportId = r.id;
      setSelectedReport(r);
      setEditTitle(r?.title ?? '');
      setEditSeverity(r?.severity ?? '');
      setEditResolution(r?.resolution ?? '');
      setDetailOpen(true);
      fetchReportLogs(reportId);
      fetchReportDetail(reportId);
    } catch (e) {
      logger.error('Failed to open detail:', e);
      toast.error(handleApiError(e, 'Gagal membuka detail laporan'));
    }
  };

  const fetchReportDetail = async (reportId: string) => {
    try {
      setDetailLoading(true);
      setFullReport(null);
      let detail: ReportDetail | null = null;
      let primaryError: unknown;
      try {
        const { data, error } = await supabase
          .from('reports')
          .select(REPORT_DETAIL_COLUMNS)
          .eq('id', reportId)
          .maybeSingle();
        if (error) throw error;
        detail = (data ?? null) as ReportDetail | null;
      } catch (err) {
        primaryError = err;
        console.warn('[AdminDashboard] Detail select failed, using fallback columns', err);
        const { data: fallbackData, error: fallbackErr } = await supabase
          .from('reports')
          .select('description, reporter_name, phone, resolution')
          .eq('id', reportId)
          .maybeSingle();
        if (!fallbackErr && fallbackData) {
          const fallback = fallbackData as Partial<ReportDetail>;
          detail = {
            description: fallback.description ?? '',
            reporter_name: fallback.reporter_name ?? null,
            phone: fallback.phone ?? null,
            latitude: 0,
            longitude: 0,
            photo_url: null,
            photo_urls: null,
          };
        } else {
          // If fallback also fails, re-throw the original primary error
          throw primaryError;
        }
      }
      if (detail) {
        setFullReport(detail);
      } else if (primaryError) {
        throw primaryError;
      }
    } catch (err) {
      logger.error('Gagal memuat detail laporan:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const fetchReportLogs = async (reportId: string) => {
    try {
      setLogsLoading(true);
      const { data, error } = await supabase
        .from('report_logs')
        .select('id, report_id, action, before, after, actor_id, actor_email, created_at')
        .eq('report_id', reportId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const rows = (data ?? []) as ReportLogEntry[];
      setLogs(rows);
    } catch (err) {
      logger.error('Gagal memuat riwayat perubahan:', err);
      toast.error(handleApiError(err, 'Gagal memuat riwayat perubahan'));
    } finally {
      setLogsLoading(false);
    }
  };

  const summarizeLog = (log: ReportLogEntry) => {
    const changes: string[] = [];
    const before = (log.before ?? {}) as Record<string, unknown>;
    const after = (log.after ?? {}) as Record<string, unknown>;
    const add = (k: string, fromVal: unknown, toVal: unknown) => {
      const fromStr = fromVal == null || fromVal === '' ? '-' : String(fromVal);
      const toStr = toVal == null || toVal === '' ? '-' : String(toVal);
      changes.push(`${k}: ${fromStr} -> ${toStr}`);
    };
    const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
    keys.forEach((k) => add(k, before[k], after[k]));
    const actionLabel = log.action === 'status_update' ? 'Ubah status' : log.action === 'bulk_status_update' ? 'Bulk status' : 'Edit';
    return `${actionLabel} - ${changes.join('; ')}`;
  };

  type ExportRow = {
    id: string;
    title: string;
    category: string;
    severity: string;
    status: ReportStatus;
    created_at: string;
    resolution: string;
    location_name: string;
    kecamatan: string;
    desa: string;
  };

  const buildExportRows = (): ExportRow[] => {
    return reports.map((r) => ({
      id: r.id,
      title: r.title,
      category: String(r.category ?? ''),
      severity: r.severity ?? '',
      status: r.status,
      created_at: formatDateTime(r.created_at),
      resolution: r.resolution?.trim() ?? '',
      location_name: shortLocation(r),
      kecamatan: r.kecamatan ?? '',
      desa: r.desa ?? '',
    }));
  };

  const exportCSV = async () => {
    try {
      const rows = buildExportRows();
      if (rows.length === 0) {
        toast.info('Tidak ada data untuk diexport');
        return;
      }
      const columns: Array<{ header: string; key: keyof ExportRow }> = [
        { header: 'ID', key: 'id' },
        { header: 'Judul', key: 'title' },
        { header: 'Kategori', key: 'category' },
        { header: 'Severity', key: 'severity' },
        { header: 'Status', key: 'status' },
        { header: 'Tanggal', key: 'created_at' },
        { header: 'Respon', key: 'resolution' },
        { header: 'Lokasi', key: 'location_name' },
        { header: 'Kecamatan', key: 'kecamatan' },
        { header: 'Desa', key: 'desa' },
      ];

      const escape = (val: unknown) => {
        if (val == null) return '';
        const s = String(val);
        // Quote if contains comma, quote, newline; escape quotes by doubling
        if (/[",\n\r]/.test(s)) {
          return '"' + s.replace(/"/g, '""') + '"';
        }
        return s;
      };

      const headerLine = columns.map(({ header }) => escape(header)).join(',');
      const bodyLines = rows.map((row) =>
        columns.map(({ key }) => escape(row[key])).join(',')
      );
      const csv = [headerLine, ...bodyLines].join('\r\n');

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      const a = document.createElement('a');
      a.href = url;
      a.download = `reports-export-${ts}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('Export CSV berhasil');
    } catch (err) {
      logger.error('Error', err);
      toast.error(handleApiError(err, 'Gagal export ke CSV'));
    }
  };

  const exportPDF = async () => {
    try {
      const { jsPDF } = await import('jspdf');
      const autoTable = (await import('jspdf-autotable')).default as (
        doc: unknown,
        opts: {
          head: string[][];
          body: (string | number | null)[][];
          styles?: { fontSize?: number };
          headStyles?: { fillColor?: [number, number, number] };
          margin?: { top?: number; left?: number; right?: number };
        }
      ) => void;

      const rows = buildExportRows();
      if (rows.length === 0) {
        toast.info('Tidak ada data untuk diexport');
        return;
      }

      const columns: Array<{ header: string; dataKey: keyof ExportRow }> = [
        { header: 'ID', dataKey: 'id' },
        { header: 'Judul', dataKey: 'title' },
        { header: 'Kategori', dataKey: 'category' },
        { header: 'Severity', dataKey: 'severity' },
        { header: 'Status', dataKey: 'status' },
        { header: 'Tanggal', dataKey: 'created_at' },
        { header: 'Respon', dataKey: 'resolution' },
        { header: 'Lokasi', dataKey: 'location_name' },
        { header: 'Kecamatan', dataKey: 'kecamatan' },
        { header: 'Desa', dataKey: 'desa' },
      ];

      const head = [columns.map(({ header }) => header)];
      const body = rows.map((row) => columns.map(({ dataKey }) => row[dataKey] ?? ''));

      const doc = new jsPDF({ orientation: 'landscape' });
      // Judul sederhana
      doc.setFontSize(12);
      doc.text('Export Laporan', 14, 16);

      autoTable(doc as unknown, {
        head,
        body,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [25, 118, 210] },
        margin: { top: 22, left: 12, right: 12 },
      });

      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      doc.save(`reports-export-${ts}.pdf`);
      toast.success('Export PDF berhasil');
    } catch (err) {
      logger.error('Error', err);
      toast.error(handleApiError(err, 'Gagal export ke PDF'));
    }
  };

  const saveEdits = async (force = false) => {
    if (!selectedReport) return;
    if (!editTitle.trim()) {
      toast.error('Judul wajib diisi');
      return;
    }
    if (editResolution.length > maxResolutionLen) {
      toast.error(`Hasil/Respon terlalu panjang (maks ${maxResolutionLen} karakter)`);
      return;
    }
    const noChange =
      editTitle === (selectedReport.title || '') &&
      (editSeverity || '') === (selectedReport.severity || '') &&
      editResolution === (selectedReport.resolution || '');
    if (noChange && !force) {
      toast.info('Tidak ada perubahan untuk disimpan');
      return;
    }
    try {
      setSaving(true);
      // compute diff for logging
      const before: Record<string, unknown> = {};
      const after: Record<string, unknown> = {};
      if (editTitle !== (selectedReport.title || '')) {
        before.title = selectedReport.title || '';
        after.title = editTitle;
      }
      if ((editSeverity || '') !== (selectedReport.severity || '')) {
        before.severity = selectedReport.severity || '';
        after.severity = editSeverity || '';
      }
      if ((editResolution || '') !== (selectedReport.resolution || '')) {
        before.resolution = selectedReport.resolution || '';
        after.resolution = editResolution || '';
      }

      // Conflict check using timestamp comparison (simple version)
      if (!force) {
        const { data: latest } = await supabase.from('reports').select('*').eq('id', selectedReport.id).maybeSingle();
        if (latest?.updated_at && latest.updated_at !== (selectedReport as { updated_at?: string }).updated_at) {
          setConflictData(latest as ReportRow);
          setConflictDialogOpen(true);
          return;
        }
      }

      const payload: { title: string; severity: ReportSeverity | null; resolution: string | null } = {
        title: editTitle,
        severity: (editSeverity as ReportSeverity) || null,
        resolution: editResolution || null,
      };
      const { error } = await supabase.from('reports').update(payload).eq('id', selectedReport.id);
      if (error) throw error;
      // insert audit log (non-blocking)
      try {
        if (Object.keys(before).length > 0) {
          await supabase.from('report_logs').insert({
            report_id: selectedReport.id,
            action: 'edit',
            before,
            after,
            actor_id: user?.id ?? null,
            actor_email: user?.email ?? null,
          });
        }
      } catch (logErr) {
        console.warn('Gagal menulis audit log (edit):', logErr);
        toast.warning('Perubahan tersimpan, namun gagal mencatat audit log');
      }
      toast.success(force ? 'Perubahan dipaksa simpan' : 'Perubahan tersimpan');
      setDetailOpen(false);
      setConflictDialogOpen(false);
      await fetchReports();
      await fetchStats();
      if (selectedReport) fetchReportLogs(selectedReport.id);
    } catch (err) {
      logger.error('Error', err);
      toast.error(handleApiError(err, 'Gagal menyimpan perubahan'));
    } finally {
      setSaving(false);
    }
  };

  const toggleSelect = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const applyBulk = () => {
    if (!bulkStatus || selectedIds.size === 0) return;
    if (bulkStatus === 'selesai') {
      setConfirmBulkOpen(true);
    } else {
      performBulkUpdate(bulkStatus);
    }
  };

  const performBulkUpdate = async (status: ReportStatus) => {
    try {
      setBulkLoading(true);
      const ids = Array.from(selectedIds);
      // fetch previous statuses for logging
      const { data: beforeRows, error: beforeErr } = await supabase
        .from('reports')
        .select('id,status')
        .in('id', ids);
      if (beforeErr) throw beforeErr;
      const previous = (beforeRows ?? []) as Array<{ id: string; status: ReportStatus }>;
      const beforeMap = new Map<string, ReportStatus>();
      previous.forEach((r) => beforeMap.set(r.id, r.status));
      const { error } = await supabase
        .from('reports')
        .update({ status })
        .in('id', ids);
      if (error) throw error;
      // write logs in batch
      try {
        const rows = ids.map((rid) => ({
          report_id: rid,
          action: 'bulk_status_update' as const,
          before: { status: beforeMap.get(rid) ?? null },
          after: { status },
          actor_id: user?.id ?? null,
          actor_email: user?.email ?? null,
        }));
        if (rows.length > 0) {
          await supabase.from('report_logs').insert(rows);
        }
      } catch (logErr) {
        console.warn('Gagal menulis audit log (bulk):', logErr);
      }
      
      toast.success(`Berhasil mengupdate ${ids.length} laporan`);
      ids.forEach(id => sendWhatsAppNotification(id, status));
      setSelectedIds(new Set<string>());
      setBulkStatus('');
      await fetchReports();
      await fetchStats();
    } catch (err) {
      logger.error('Error', err);
      toast.error('Gagal melakukan bulk update');
    } finally {
      setBulkLoading(false);
      setConfirmBulkOpen(false);
    }
  };

  const fetchStats = useCallback(async () => {
    setStatsInitialized(false);
    try {
      const { data, error } = await supabase
        .from('reports')
        .select('id,status');
      if (error) throw error;
      const rows = (data ?? []) as Array<{ id: string; status: ReportStatus }>;
      const total = rows.length;
      const baru = rows.filter((r) => r.status === 'baru').length;
      const diproses = rows.filter((r) => r.status === 'diproses').length;
      const selesai = rows.filter((r) => r.status === 'selesai').length;
      setStats({ total, baru, diproses, selesai });
      setStatsInitialized(true);
    } catch (err) {
      logger.error('Error', err);
    }
  }, []);

  const fetchChartData = useCallback(async () => {
    // Minimum spinner time for smoothness
    const MIN_LOADING_MS = 400;
    const loadingStart = Date.now();
    setChartInitialized(false);
    if (!chartLoading) setChartLoading(true);
    try {
      const fromISO = new Date(Date.now() - chartDays * 24 * 60 * 60 * 1000).toISOString();
      let query = supabase
        .from('reports')
        .select('created_at, category')
        .gte('created_at', fromISO);

      if (statusFilter !== 'semua') {
        query = query.eq('status', statusFilter);
      }
      if (severityFilter !== 'semua') {
        query = query.eq('severity', severityFilter);
      }
      if (categoryFilter !== 'semua') {
        query = query.eq('category', categoryFilter);
      }
      if (debouncedSearch) {
        query = query.ilike('title', `%${debouncedSearch}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      const items = (data ?? []) as Array<{ created_at: string; category: ReportCategory | null }>;

      // Build daily buckets
      const days: Array<{ dateKey: string; label: string; count: number }> = [];
      for (let i = chartDays - 1; i >= 0; i--) {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() - i);
        const dateKey = d.toISOString().slice(0, 10); // YYYY-MM-DD
        const label = d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit' });
        days.push({ dateKey, label, count: 0 });
      }
      const dayMap = new Map(days.map((x) => [x.dateKey, x]));
      for (const it of items) {
        const d = new Date(it.created_at);
        if (isNaN(d.getTime())) continue;
        d.setHours(0, 0, 0, 0);
        const key = d.toISOString().slice(0, 10);
        const bucket = dayMap.get(key);
        if (bucket) bucket.count += 1;
      }
      setChartDaily(days.map((x) => ({ date: x.label, count: x.count })));

      // Build category counts
      const catCount = new Map<string, number>();
      for (const it of items) {
        const name = it.category ? String(it.category) : 'Lainnya';
        catCount.set(name, (catCount.get(name) || 0) + 1);
      }
      const catArr = Array.from(catCount.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);
      setChartByCategory(catArr);
      if (!chartInitialized) setChartInitialized(true);
    } catch (err) {
      logger.error('Error', err);
    } finally {
      const elapsed = Date.now() - loadingStart;
      if (elapsed < MIN_LOADING_MS) {
        setTimeout(() => setChartLoading(false), MIN_LOADING_MS - elapsed);
      } else {
        setChartLoading(false);
      }
    }
  }, [chartDays, categoryFilter, debouncedSearch, severityFilter, statusFilter, chartLoading, chartInitialized]);

  // sync tab to URL query param
  useEffect(() => {
    const tabParamRaw = (searchParams.get('tab') || '').toLowerCase();
    const tabParam = tabParamRaw === 'insights' ? 'reports' : tabParamRaw;
    const next: AdminTab = isAdminTab(tabParam) ? tabParam : 'reports';
    if (next !== activeTab) setActiveTab(next);
  }, [activeTab, searchParams]);

  const onChangeTab = (tab: AdminTab) => {
    const safeTab = tab === 'insights' ? 'reports' : tab;
    setActiveTab(safeTab);
    setSearchParams((prev) => {
      const sp = new URLSearchParams(prev);
      if (safeTab === 'reports') sp.delete('tab'); else sp.set('tab', safeTab);
      return sp;
    }, { replace: true });
  };

  useEffect(() => {
    if (!authLoading && !isAdmin && user) {
      toast.error("Akses ditolak");
      navigate("/");
    }
  }, [authLoading, isAdmin, user, navigate]);

  // Realtime updates for reports - only when tab is visible
  useEffect(() => {
    if (!user || !isAdmin || activeTab !== 'reports') return;

    let isVisible = !document.hidden;
    const handleVisibilityChange = () => {
      const wasHidden = !isVisible;
      isVisible = !document.hidden;
      // Refresh only when returning to visible tab
      if (wasHidden && isVisible) {
        void fetchReports();
        void fetchStats();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    const channel = supabase
      .channel('reports-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reports' }, () => {
        // Always refresh stats, refresh reports only if visible
        void fetchStats();
        if (activeTab === 'reports' && !document.hidden) {
          void fetchReports();
        }
      })
      .subscribe();

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      channel.unsubscribe();
    };
  }, [activeTab, fetchReports, fetchStats, isAdmin, user]);

  // debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (user && isAdmin && activeTab === 'reports') {
      setPage(1);
    }
  }, [activeTab, categoryFilter, debouncedSearch, isAdmin, sortBy, severityFilter, statusFilter, user]);

  useEffect(() => {
    if (user && isAdmin && activeTab === 'reports') {
      void fetchReports();
    }
  }, [activeTab, fetchReports, isAdmin, page, pageSize, user]);

  useEffect(() => {
    if (user && isAdmin && activeTab === 'insights') {
      void fetchChartData();
    }
  }, [activeTab, fetchChartData, isAdmin, user, chartDays]);

  useEffect(() => {
    if (user && isAdmin && (activeTab === 'reports' || activeTab === 'insights')) {
      void fetchStats();
    }
  }, [activeTab, fetchStats, isAdmin, user]);

  const categories = useMemo(() => {
    const set = new Set<ReportCategory>();
    reports.forEach((r) => set.add(r.category));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [reports]);

  const deleteReport = async (reportId: string) => {
    try {
      setDeleting(true);
      const { error } = await supabase.from('reports').delete().eq('id', reportId);
      if (error) throw error;

      toast.success('Laporan berhasil dihapus');
      setDeleteDialogOpen(false);
      setReportToDelete(null);
      await fetchReports();
      await fetchStats();
    } catch (err) {
      logger.error('Error', err);
      toast.error('Gagal menghapus laporan');
    } finally {
      setDeleting(false);
    }
  };

  const updateStatus = async (id: string, newStatus: ReportStatus) => {
    setUpdatingId(id);
    sendWhatsAppNotification(id, newStatus);
    const prevStatus = reports.find((r) => r.id === id)?.status;

    // Optimistic update
    setReports(prev =>
      prev.map(r =>
        r.id === id ? { ...r, status: newStatus } : r
      )
    );

    const { error } = await supabase
      .from("reports")
      .update({ status: newStatus })
      .eq("id", id);

    if (error) {
      // Rollback on error
      setReports(prev =>
        prev.map(r =>
          r.id === id ? { ...r, status: prevStatus ?? 'baru' } : r
        )
      );
      toast.error("Gagal update status");
    } else {
      // write audit log (non-blocking)
      try {
        await supabase.from('report_logs').insert({
          report_id: id,
          action: 'status_update',
          before: { status: prevStatus ?? null },
          after: { status: newStatus },
          actor_id: user?.id ?? null,
          actor_email: user?.email ?? null,
        });
      } catch (logErr) {
        console.warn('Gagal menulis audit log (status):', logErr);
      }
      toast.success("Status berhasil diupdate", {
        description: `Status diubah dari ${prevStatus} menjadi ${newStatus}`,
      });
      await fetchStats();
      if (selectedReport && selectedReport.id === id) fetchReportLogs(id);
    }
    setUpdatingId(null);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }



  return (
    <div className="min-h-screen bg-gradient-to-br from-accent/5 via-background to-primary/5 py-4 md:py-6">
      <div className="container px-3 md:px-4">
        <div className="mb-4 md:mb-6">
          <h1 className="text-2xl md:text-3xl font-bold mb-1">Dashboard Admin</h1>
          <p className="text-sm md:text-base text-muted-foreground">Kelola laporan dan pengaturan sistem secara terpusat</p>
        </div>

        {/* Admin Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            if (isAdminTab(value)) {
              onChangeTab(value);
            }
          }}
        >
          <TabsList className="w-full flex flex-wrap gap-2 mb-4 md:mb-6 glass-surface rounded-xl p-2 h-auto">
            <TabsTrigger value="reports" className="flex-1 min-w-[140px] text-xs md:text-sm">Laporan</TabsTrigger>
            <TabsTrigger value="geo" className="flex-1 min-w-[140px] text-xs md:text-sm">Geo Data</TabsTrigger>
            <TabsTrigger value="help" className="flex-1 min-w-[140px] text-xs md:text-sm">Help Center</TabsTrigger>
            <TabsTrigger value="settings" className="flex-1 min-w-[140px] text-xs md:text-sm">Pengaturan</TabsTrigger>
          </TabsList>

          <TabsContent value="reports" className="mt-0">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 mb-4 md:mb-5">
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
                <Card className="glass-floating hover:shadow-lg transition-shadow duration-200 border-l-4 border-l-primary">
                  <CardHeader className="pb-2 pt-3 md:pt-4 px-3 md:px-4">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-2xs font-medium text-muted-foreground uppercase tracking-wider">Total Laporan</CardTitle>
                      <FileText className="w-3 h-3 md:w-4 md:h-4 text-primary/60 flex-shrink-0" />
                    </div>
                    <div className="text-xl md:text-2xl font-bold mt-1">{stats.total}</div>
                  </CardHeader>
                </Card>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <Card className="glass-floating hover:shadow-lg transition-shadow duration-200 border-l-4 border-l-amber-500">
                  <CardHeader className="pb-2 pt-3 md:pt-4 px-3 md:px-4">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-2xs font-medium text-muted-foreground uppercase tracking-wider">Baru</CardTitle>
                      <Clock className="w-4 h-4 text-amber-500/60" />
                    </div>
                    <div className="text-2xl font-bold mt-1">{stats.baru}</div>
                  </CardHeader>
                </Card>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                <Card className="glass-floating hover:shadow-lg transition-shadow duration-200 border-l-4 border-l-blue-500">
                  <CardHeader className="pb-2 pt-3 md:pt-4 px-3 md:px-4">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-2xs font-medium text-muted-foreground uppercase tracking-wider">Diproses</CardTitle>
                      <Loader2 className="w-4 h-4 text-primary/60" />
                    </div>
                    <div className="text-2xl font-bold mt-1">{stats.diproses}</div>
                  </CardHeader>
                </Card>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <Card className="glass-floating hover:shadow-lg transition-shadow duration-200 border-l-4 border-l-green-500">
                  <CardHeader className="pb-2 pt-3 md:pt-4 px-3 md:px-4">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-2xs font-medium text-muted-foreground uppercase tracking-wider">Selesai</CardTitle>
                      <CheckCircle className="w-4 h-4 text-green-500/60" />
                    </div>
                    <div className="text-2xl font-bold mt-1">{stats.selesai}</div>
                  </CardHeader>
                </Card>
              </motion.div>
            </div>

            {/* Filters */}
            <Card className="mb-4 glass-surface">
              <CardContent className="pt-3 md:pt-4 pb-3 md:pb-4 px-3 md:px-4">
                <div className="space-y-3 md:space-y-4">
                  {/* Status Filter Tabs */}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-2 block">Status</label>
                    <Tabs
                      value={statusFilter}
                      onValueChange={(value) => {
                        if (isStatusFilter(value)) {
                          setStatusFilter(value);
                        }
                      }}
                    >
                      <TabsList className="grid grid-cols-4 w-full glass-surface p-1">
                        <TabsTrigger value="semua" className="text-2xs md:text-xs">Semua</TabsTrigger>
                        <TabsTrigger value="baru" className="text-2xs md:text-xs">Baru</TabsTrigger>
                        <TabsTrigger value="diproses" className="text-2xs md:text-xs">Diproses</TabsTrigger>
                        <TabsTrigger value="selesai" className="text-2xs md:text-xs">Selesai</TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>

                  {/* Other Filters */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Severity</label>
                      <Select
                        value={severityFilter}
                        onValueChange={(value) => {
                          if (isSeverityFilter(value)) {
                            setSeverityFilter(value);
                          }
                        }}
                      >
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
                      <Select
                        value={categoryFilter}
                        onValueChange={(value) => {
                          if (value === 'semua') {
                            setCategoryFilter('semua');
                          } else if (categories.includes(value as ReportCategory)) {
                            setCategoryFilter(value as ReportCategory);
                          }
                        }}
                      >
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
                      <Select
                        value={sortBy}
                        onValueChange={(value) => {
                          if (isSortOption(value)) {
                            setSortBy(value);
                          }
                        }}
                      >
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

            {/* Active Filters Display */}
            {(statusFilter !== 'semua' || severityFilter !== 'semua' || categoryFilter !== 'semua' || search.length > 0) && (
              <div className="mb-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-medium text-muted-foreground">Filter aktif:</span>
                  {statusFilter !== 'semua' && (
                    <Badge variant="secondary" className="gap-1.5 text-xs">
                      {statusFilter}
                      <button
                        onClick={() => setStatusFilter('semua')}
                        className="hover:opacity-70 transition-opacity"
                        aria-label="Hapus filter status"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  )}
                  {severityFilter !== 'semua' && (
                    <Badge variant="secondary" className="gap-1.5 text-xs">
                      {severityFilter}
                      <button
                        onClick={() => setSeverityFilter('semua')}
                        className="hover:opacity-70 transition-opacity"
                        aria-label="Hapus filter severity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  )}
                  {categoryFilter !== 'semua' && (
                    <Badge variant="secondary" className="gap-1.5 text-xs">
                      {categoryFilter}
                      <button
                        onClick={() => setCategoryFilter('semua')}
                        className="hover:opacity-70 transition-opacity"
                        aria-label="Hapus filter kategori"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  )}
                  {search.length > 0 && (
                    <Badge variant="secondary" className="gap-1.5 text-xs">
                      "{search}"
                      <button
                        onClick={() => setSearch('')}
                        className="hover:opacity-70 transition-opacity"
                        aria-label="Hapus filter pencarian"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setStatusFilter('semua');
                      setSeverityFilter('semua');
                      setCategoryFilter('semua');
                      setSearch('');
                    }}
                    className="h-7 text-xs ml-auto"
                  >
                    Reset Filter
                  </Button>
                </div>
              </div>
            )}

            {/* Reports Table */}
            <Card className="glass-surface">
              <CardHeader className="pb-3">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg">Daftar Laporan</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {totalFiltered} laporan ditemukan
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={exportCSV} className="h-8 text-xs">
                      Export CSV
                    </Button>
                    <Button variant="outline" size="sm" onClick={exportPDF} className="h-8 text-xs">
                      Export PDF
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {/* Bulk actions toolbar */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3 pb-3 border-b">
                  <div className="text-xs text-muted-foreground">
                    {selectedIds.size > 0 ? (
                      <span className="font-medium text-foreground">{selectedIds.size} item dipilih</span>
                    ) : (
                      'Pilih item untuk aksi bulk'
                    )}
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Select
                      value={bulkStatus}
                      onValueChange={(value) => {
                        if (value === '' || isReportStatus(value)) {
                          setBulkStatus(value as ReportStatus | '');
                        }
                      }}
                    >
                      <SelectTrigger className="w-[160px] h-8 text-xs">
                        <SelectValue placeholder="Ubah status..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="baru">Baru</SelectItem>
                        <SelectItem value="diproses">Diproses</SelectItem>
                        <SelectItem value="selesai">Selesai</SelectItem>
                      </SelectContent>
                    </Select>
                    <AlertDialog open={confirmBulkOpen} onOpenChange={setConfirmBulkOpen}>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          onClick={applyBulk}
                          disabled={!bulkStatus || selectedIds.size === 0 || bulkLoading}
                          className="h-8 text-xs"
                        >
                          Terapkan
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Konfirmasi Selesai</AlertDialogTitle>
                          <AlertDialogDescription>
                            Anda akan menandai {selectedIds.size} laporan sebagai selesai. Tindakan ini tidak dapat dibatalkan. Lanjutkan?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Batal</AlertDialogCancel>
                          <AlertDialogAction onClick={() => performBulkUpdate('selesai')} disabled={bulkLoading}>
                            Ya, tandai selesai
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
                {reports.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
                    <p className="text-sm text-muted-foreground">Tidak ada laporan ditemukan</p>
                    <p className="text-xs text-muted-foreground mt-1">Coba ubah filter atau pencarian Anda</p>
                  </div>
                ) : (
                  <div className="w-full overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="w-10">
                            <Checkbox
                              checked={allVisibleSelected}
                              onCheckedChange={() => toggleSelectAll()}
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
                                onCheckedChange={(c) => toggleSelect(report.id, Boolean(c))}
                                aria-label={`Pilih laporan ${report.title || ''}`}
                              />
                            </TableCell>
                            <TableCell className="font-medium max-w-[200px]">
                              <button
                                type="button"
                                className="text-left hover:text-primary hover:underline transition-colors truncate block w-full"
                                onClick={() => openDetail(report)}
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
                              {shortLocation(report)
                                ? shortLocation(report)
                                : <span className="text-muted-foreground text-xs">-</span>}
                            </TableCell>
                            <TableCell className="max-w-[180px]">
                              {report.resolution && report.resolution.trim().length > 0
                                ? <span className="text-xs truncate block" title={report.resolution}>{previewText(report.resolution, 80)}</span>
                                : <span className="text-muted-foreground text-xs">-</span>}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">{formatDate(report.created_at)}</TableCell>
                            <TableCell className="text-right">
                              <Select
                                value={report.status}
                                onValueChange={(value) => {
                                  if (isReportStatus(value)) {
                                    updateStatus(report.id, value);
                                  }
                                }}
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
                                onClick={() => {
                                  setReportToDelete(report.id);
                                  setDeleteDialogOpen(true);
                                }}
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
                              onClick={() => setPage((p) => Math.max(1, p - 1))}
                              aria-disabled={page === 1}
                              className="h-8 text-xs"
                            />
                          </PaginationItem>
                          {Array.from({ length: Math.max(1, Math.ceil(totalFiltered / pageSize)) }).slice(0, 5).map((_, i) => {
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
                              onClick={() => setPage((p) => (p * pageSize < totalFiltered ? p + 1 : p))}
                              aria-disabled={page * pageSize >= totalFiltered}
                              className="h-8 text-xs"
                            />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Delete Confirmation Dialog */}
            {/* Sync Conflict Resolution Dialog */}
            <Dialog open={conflictDialogOpen} onOpenChange={setConflictDialogOpen}>
              <DialogContent className="sm:max-w-[500px] glass-overlay border-amber-500/30">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-amber-600">
                    <AlertCircle className="h-5 w-5" />
                    Konflik Sinkronisasi Terdeteksi
                  </DialogTitle>
                  <DialogDescription>
                    Laporan ini baru saja diubah oleh orang lain. Apa yang ingin Anda lakukan?
                  </DialogDescription>
                </DialogHeader>
                
                {conflictData && (
                  <div className="p-4 rounded-lg glass-base text-sm space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <span className="text-muted-foreground text-xs uppercase">Status Remote:</span>
                      <span className="font-bold">{conflictData.status.toUpperCase()}</span>
                      <span className="text-muted-foreground text-xs uppercase">Waktu Update:</span>
                      <span className="font-mono">{formatDateTime(conflictData.updated_at)}</span>
                    </div>
                    <div className="pt-2 border-t border-white/10">
                      <p className="font-semibold text-xs uppercase text-muted-foreground mb-1">Respon Remote:</p>
                      <p className="italic text-xs">{conflictData.resolution || 'Tidak ada catatan'}</p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setConflictDialogOpen(false);
                      if (conflictData) openDetail({ ...selectedReport!, ...conflictData });
                    }}
                    className="glass-base"
                  >
                    Batal & Muat Ulang
                  </Button>
                  <Button 
                    onClick={() => saveEdits(true)}
                    className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
                  >
                    Paksa Simpan (Overwrite)
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Hapus Laporan</AlertDialogTitle>
                  <AlertDialogDescription>
                    Apakah Anda yakin ingin menghapus laporan ini? Tindakan ini tidak dapat dibatalkan.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={deleting}>Batal</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => reportToDelete && deleteReport(reportToDelete)}
                    disabled={deleting}
                    className="bg-destructive hover:bg-destructive/90"
                  >
                    {deleting ? 'Menghapus...' : 'Hapus'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* Detail Drawer */}
            <Drawer open={detailOpen} onOpenChange={setDetailOpen}>
              <DrawerContent className="flex flex-col h-[85vh] md:h-[80vh] overflow-hidden glass-overlay">
                <DrawerErrorBoundary>
                  <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Memuat detail...</div>}>
                    <div className="rounded-xl shadow-lg transition-all duration-300 glass-surface flex flex-col flex-1 overflow-hidden">
                      <AdminDetail
                        selectedReport={selectedReport}
                        fullReport={fullReport}
                        detailLoading={detailLoading}
                        editTitle={editTitle}
                        setEditTitle={setEditTitle}
                        editSeverity={editSeverity}
                        setEditSeverity={setEditSeverity}
                        renderStatusBadge={renderStatusBadge}
                        formatDateTime={formatDateTime}
                        editResolution={editResolution}
                        setEditResolution={setEditResolution}
                        logsLoading={logsLoading}
                        logs={logs}
                        summarizeLog={summarizeLog}
                        saveEdits={saveEdits}
                        saving={saving}
                      />
                    </div>
                  </Suspense>
                </DrawerErrorBoundary>
              </DrawerContent>
            </Drawer>
          </TabsContent>
          <TabsContent value="insights" className="mt-0">
            <div className="mb-4 flex items-center gap-3">
              <Select value={String(chartDays)} onValueChange={(v) => setChartDays(Number(v) as 7 | 30)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 hari</SelectItem>
                  <SelectItem value="30">30 hari</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {chartLoading || !chartInitialized || !statsInitialized ? (
              <div className="min-h-[240px] flex items-center justify-center text-sm text-muted-foreground">Memuat data insight...</div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-7 mb-8">
                {/* Chart Tren Laporan */}
                <Card className="glass-floating hover:shadow-lg transition-all duration-500 rounded-xl">
                  <CardHeader className="pb-2 fade-in">
                    <CardTitle className="text-sm text-muted-foreground">Tren Laporan ({chartDays} hari)</CardTitle>
                  </CardHeader>
                  <CardContent className="fade-in">
                    <div className="relative">
                      <ChartContainer
                        config={{ reports: { label: 'Laporan', color: 'hsl(var(--primary))' } }}
                        className="h-56 sm:h-64 md:h-72"
                        withAspect={false}
                      >
                        <LineChart data={chartDaily} margin={{ top: 8, left: 12, right: 12, bottom: 12 }}>
                          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.4} />
                          <XAxis dataKey="date" tickLine={false} axisLine={false} interval={Math.max(0, Math.floor(chartDaily.length / 8) - 1)} height={52} tickMargin={6} />
                          <YAxis allowDecimals={false} width={32} tickMargin={6} domain={[0, 'dataMax + 1']} tickCount={5} />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Line type="monotone" dataKey="count" stroke="var(--color-reports)" strokeWidth={2} dot={false} />
                        </LineChart>
                      </ChartContainer>
                      <LoadingOverlay show={chartLoading} text="Memuat data..." />
                      {chartDaily.length === 0 && !chartLoading && (
                        <div className="h-48 flex items-center justify-center text-muted-foreground text-sm absolute inset-0">Tidak ada data</div>
                      )}
                    </div>
                  </CardContent>
                </Card>
                {/* Chart Kategori Terbanyak */}
                <Card className="glass-floating hover:shadow-lg transition-all duration-500 rounded-xl">
                  <CardHeader className="pb-2 fade-in">
                    <CardTitle className="text-sm text-muted-foreground">Kategori Terbanyak ({chartDays} hari)</CardTitle>
                  </CardHeader>
                  <CardContent className="fade-in">
                    <div className="relative">
                      <ChartContainer
                        config={{ count: { label: 'Jumlah', color: 'hsl(var(--primary))' } }}
                        className="h-56 sm:h-64 md:h-72"
                        withAspect={false}
                      >
                        <BarChart data={chartByCategory} margin={{ top: 8, left: 12, right: 12, bottom: 12 }}>
                          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.4} />
                          <XAxis
                            dataKey="name"
                            tickLine={false}
                            axisLine={false}
                            angle={-30}
                            textAnchor="end"
                            interval={0}
                            height={52}
                            tickMargin={6}
                            tick={({ x, y, payload }) => (
                              <text
                                x={x}
                                y={y}
                                fontSize={12}
                                textAnchor="end"
                                transform={`rotate(-30,${x},${y})`}
                                fill="#64748b"
                              >
                                {payload.value.length > 12 ? payload.value.slice(0, 11) + '…' : payload.value}
                              </text>
                            )}
                          />
                          <YAxis allowDecimals={false} width={32} tickMargin={6} domain={[0, 'dataMax + 1']} tickCount={5} />
                          <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                          <Bar dataKey="count" fill="var(--color-count)" radius={4} />
                        </BarChart>
                      </ChartContainer>
                      <LoadingOverlay show={chartLoading} text="Memuat data..." />
                      {chartByCategory.length === 0 && !chartLoading && (
                        <div className="h-48 flex items-center justify-center text-muted-foreground text-sm absolute inset-0">Tidak ada data</div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="geo" className="mt-0">
            <Suspense fallback={<div className="min-h-[240px] flex items-center justify-center text-sm text-muted-foreground">Memuat Geo Data Manager...</div>}>
              <GeoDataManagerLazy />
            </Suspense>
          </TabsContent>

          <TabsContent value="help" className="mt-0">
            <Suspense fallback={<div className="min-h-[240px] flex items-center justify-center text-sm text-muted-foreground">Memuat Help Center...</div>}>
              <HelpCenterLazy />
            </Suspense>
          </TabsContent>

          <TabsContent value="settings" className="mt-0">
            <Suspense fallback={<div className="min-h-[240px] flex items-center justify-center text-sm text-muted-foreground">Memuat Pengaturan...</div>}>
              <AdminSettingsLazy />
            </Suspense>
          </TabsContent>

        </Tabs>
      </div>
    </div>
  );
};

class DrawerErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: unknown) {
    logger.error('Drawer render error:', error);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 text-sm text-red-600">
          Terjadi kesalahan saat membuka detail laporan. Coba tutup dan buka lagi.
        </div>
      );
    }
    return this.props.children;
  }
}

export default AdminDashboard;

// Lazy component for Drawer detail to keep Dashboard initial render light
const AdminDetail = lazy(async () => {
  await import("react");
  return {
    default: function AdminDetailView({
      selectedReport,
      fullReport,
      detailLoading,
      editTitle,
      setEditTitle,
      editSeverity,
      setEditSeverity,
      renderStatusBadge,
      formatDateTime,
      editResolution,
      setEditResolution,
      logsLoading,
      logs,
      summarizeLog,
      saveEdits,
      saving,
    }: {
      selectedReport: ReportListItem | null;
      fullReport: ReportDetail | null;
      detailLoading: boolean;
      editTitle: string;
      setEditTitle: (v: string) => void;
      editSeverity: ReportSeverity | '';
      setEditSeverity: (v: ReportSeverity | '') => void;
      renderStatusBadge: (s: ReportStatus) => ReactNode;
      formatDateTime: (s?: string | null) => string;
      editResolution: string;
      setEditResolution: (v: string) => void;
      logsLoading: boolean;
      logs: ReportLogEntry[];
      summarizeLog: (l: ReportLogEntry) => string;
      saveEdits: () => Promise<void> | void;
      saving: boolean;
    }) {
      const [lightboxOpen, setLightboxOpen] = useState(false);
      const [activePhotoIndex, setActivePhotoIndex] = useState(0);
      return (
        <div className="flex flex-col h-full overflow-hidden">
          <DrawerHeader className="text-left pb-3 border-b flex-shrink-0">
            <DrawerTitle className="text-lg font-semibold">Detail Laporan</DrawerTitle>
            <DrawerDescription className="text-xs text-muted-foreground mt-1">Kelola dan tinjau informasi laporan</DrawerDescription>
          </DrawerHeader>
          {/* Scrollable detail area for Windows compatibility */}
          <div
            className="flex-1 overflow-y-auto px-6 py-4"
            style={{
              overscrollBehavior: 'contain',
              scrollbarColor: '#cbd5e1 #f1f5f9',
              scrollbarWidth: 'thin',
            }}
          >
            {!selectedReport ? (
              <div className="text-sm text-muted-foreground py-8 text-center">Data laporan tidak tersedia.</div>
            ) : (
              <div className="space-y-5">
                {/* Judul Section */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Judul Laporan</label>
                  <Input className="h-9 text-sm" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Masukkan judul laporan" />
                </div>

                {/* Metadata Badges */}
                <div className="flex flex-wrap gap-2 items-center pb-4 border-b">
                  <Badge variant="outline" className="text-xs px-2.5 py-1">{selectedReport.category || '-'}</Badge>
                  <select
                    className="h-8 px-3 rounded-md border bg-background text-xs font-medium transition-colors hover:bg-muted"
                    value={editSeverity}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '' || REPORT_SEVERITIES.includes(value as ReportSeverity)) {
                        setEditSeverity(value as ReportSeverity | '');
                      }
                    }}
                  >
                    <option value="">Pilih Severity</option>
                    <option value="berat">🔴 Berat</option>
                    <option value="sedang">🟡 Sedang</option>
                    <option value="ringan">🟢 Ringan</option>
                  </select>
                  {renderStatusBadge(selectedReport.status)}
                </div>
                {/* Info Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Lokasi</label>
                    <div className="text-sm font-medium">{(() => {
                      if (!selectedReport) return '-';
                      const byName = (selectedReport.location_name || '').trim();
                      if (byName) return byName;
                      const parts = [selectedReport.desa, selectedReport.kecamatan].filter(Boolean) as string[];
                      return parts.length > 0 ? parts.join(', ') : '-';
                    })()}</div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Wilayah</label>
                    <div className="text-sm font-medium">{(selectedReport.desa || selectedReport.kecamatan) ? [selectedReport.desa ?? '', selectedReport.kecamatan ?? ''].filter(Boolean).join(', ') : '-'}</div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Tanggal Dibuat</label>
                    <div className="text-sm font-medium">{formatDateTime(selectedReport.created_at)}</div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Nama Pelapor</label>
                    <div className="text-sm font-medium">{fullReport?.reporter_name || '-'}</div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Kontak</label>
                    <div className="text-sm font-medium">{fullReport?.phone || '-'}</div>
                  </div>
                </div>
                {/* Deskripsi */}
                <div className="space-y-2 pb-4 border-b">
                  <label className="text-xs font-medium text-muted-foreground">Deskripsi Laporan</label>
                  <div className="text-sm leading-relaxed bg-muted/30 p-3 rounded-md">{fullReport?.description || '-'}</div>
                </div>

                {/* Koordinat */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Koordinat Lokasi</label>
                  <div className="flex items-center gap-2 flex-wrap">
                    <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                      {(() => {
                        const lat = typeof fullReport?.latitude === 'number' ? fullReport?.latitude : undefined;
                        const lon = typeof fullReport?.longitude === 'number' ? fullReport?.longitude : undefined;
                        return lat != null && lon != null ? `${lat.toFixed(6)}, ${lon.toFixed(6)}` : '-';
                      })()}
                    </code>
                    {typeof fullReport?.latitude === 'number' && typeof fullReport?.longitude === 'number' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={async () => {
                            const lat = fullReport?.latitude;
                            const lon = fullReport?.longitude;
                            if (typeof lat !== 'number' || typeof lon !== 'number') return;
                            await navigator.clipboard.writeText(`${lat}, ${lon}`);
                            toast.success('Koordinat disalin');
                          }}
                        >
                          Salin
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => {
                            const lat = fullReport?.latitude;
                            const lon = fullReport?.longitude;
                            if (typeof lat !== 'number' || typeof lon !== 'number') return;
                            window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lon}`, '_blank', 'noopener,noreferrer');
                          }}
                        >
                          Buka Maps
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                {/* Dokumentasi */}
                <div className="space-y-2 pb-4 border-b">
                  <label className="text-xs font-medium text-muted-foreground">Dokumentasi Foto</label>
                  <div>
                    {(() => {
                      const photos: string[] = (fullReport?.photo_urls && fullReport.photo_urls.length > 0)
                        ? fullReport.photo_urls
                        : (fullReport?.photo_url ? [fullReport.photo_url] : []);
                      return photos.length > 0 ? (
                        <div className="grid grid-cols-3 gap-2">
                          {photos.slice(0, 6).map((src, i) => (
                            <div key={src + i} className="relative group">
                              <img
                                src={src}
                                alt={`Dokumentasi ${i + 1}`}
                                loading="lazy"
                                decoding="async"
                                className="h-24 w-full object-cover rounded-lg border cursor-zoom-in transition-all hover:scale-105 hover:shadow-md"
                                onClick={() => { setActivePhotoIndex(i); setLightboxOpen(true); }}
                                onError={(e) => {
                                  e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23f0f0f0" width="100" height="100"/%3E%3Ctext x="50" y="50" font-size="14" text-anchor="middle" dy=".3em" fill="%23999"%3EError%3C/text%3E%3C/svg%3E';
                                }}
                              />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-lg pointer-events-none" />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground bg-muted/30 p-4 rounded-md text-center">Tidak ada dokumentasi</div>
                      );
                    })()}
                  </div>
                </div>

                {/* Respon Admin */}
                <div className="space-y-2 pb-4 border-b">
                  <label className="text-xs font-medium text-muted-foreground">Hasil/Respon Admin</label>
                  <textarea
                    className="w-full min-h-[100px] rounded-md border bg-background p-3 text-sm focus-visible:ring-2 focus:ring-primary/20 transition-shadow"
                    value={editResolution}
                    onChange={(e) => setEditResolution(e.target.value)}
                    placeholder="Tulis hasil penanganan atau respon admin di sini..."
                  />
                </div>

                {/* Riwayat */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Riwayat Perubahan</label>
                  {logsLoading ? (
                    <div className="text-sm text-muted-foreground py-4 text-center">Memuat riwayat...</div>
                  ) : logs.length === 0 ? (
                    <div className="text-sm text-muted-foreground bg-muted/30 p-4 rounded-md text-center">Belum ada perubahan</div>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-auto pr-2">
                      {logs.map((log) => (
                        <div key={log.id} className="text-xs bg-muted/30 p-3 rounded-md">
                          <div className="text-muted-foreground mb-1">{formatDateTime(log.created_at)} • {log.actor_email || '-'}</div>
                          <div className="text-foreground">{summarizeLog(log)}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Lightbox for Dokumentasi */}
          {(() => {
            const photos: string[] = (fullReport?.photo_urls && fullReport.photo_urls.length > 0)
              ? fullReport.photo_urls
              : (fullReport?.photo_url ? [fullReport.photo_url] : []);
            return photos.length > 0 ? (
              <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
                <DialogContent className="sm:max-w-[90vw] p-0 rounded-xl shadow-lg transition-all duration-300 border border-border bg-background" aria-describedby="lightbox-description">
                  <DialogHeader className="px-4 pt-4 pb-2">
                    <DialogTitle>Dokumentasi Foto</DialogTitle>
                    <DialogDescription id="lightbox-description">
                      Foto {activePhotoIndex + 1} dari {photos.length}. Klik di luar gambar untuk menutup.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="w-full flex items-center justify-center p-2">
                    <img
                      src={photos[activePhotoIndex]}
                      alt={`Dokumentasi ${activePhotoIndex + 1}`}
                      className="max-h-[80vh] w-auto object-contain rounded"
                    />
                  </div>
                  {photos.length > 1 && (
                    <div className="flex items-center justify-between px-4 pb-4 text-sm text-muted-foreground">
                      <Button size="sm" variant="outline" onClick={() => setActivePhotoIndex((i) => (i - 1 + photos.length) % photos.length)}>Sebelumnya</Button>
                      <span>{activePhotoIndex + 1} / {photos.length}</span>
                      <Button size="sm" variant="outline" onClick={() => setActivePhotoIndex((i) => (i + 1) % photos.length)}>Berikutnya</Button>
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            ) : null;
          })()}

          <DrawerFooter className="py-3 px-6 border-t flex-shrink-0 gap-3">
            <div className="flex items-center justify-between gap-2 flex-wrap w-full">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  if (typeof fullReport?.latitude === 'number' && typeof fullReport?.longitude === 'number') {
                    const lat = fullReport.latitude;
                    const lon = fullReport.longitude;
                    const params = new URLSearchParams({ center: `${lat},${lon}`, zoom: '16' });
                    window.open(`/map?${params.toString()}`, '_blank', 'noopener,noreferrer');
                  }
                }}
                disabled={typeof fullReport?.latitude !== 'number' || typeof fullReport?.longitude !== 'number'}
                className="text-xs"
              >
                Lihat di Peta
              </Button>
              <div className="flex items-center gap-2">
                <DrawerClose asChild>
                  <Button size="sm" variant="outline" className="text-xs">Batal</Button>
                </DrawerClose>
                <Button size="sm" onClick={saveEdits} disabled={saving || !selectedReport} className="text-xs">
                  {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
                </Button>
              </div>
            </div>
          </DrawerFooter>
        </div>
      );
    }
  };
});
