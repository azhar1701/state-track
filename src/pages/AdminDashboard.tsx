import { useEffect, useMemo, useState, Component, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious, PaginationLink } from "@/components/ui/pagination";
import { Checkbox } from "@/components/ui/checkbox";
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
import { toast } from "sonner";
import { FileText, Clock, CheckCircle, Loader2 } from "lucide-react";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: {
      columns: Array<{ header: string; dataKey: string }>;
      body: Array<Record<string, string | number | null>>;
      styles?: { fontSize?: number };
      headStyles?: { fillColor?: [number, number, number] };
    }) => void;
  }
}
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, BarChart, Bar } from 'recharts';

interface Report {
  id: string;
  title: string;
  category: string;
  status: string;
  created_at: string;
  location_name: string | null;
  severity?: 'ringan' | 'sedang' | 'berat' | null;
  kecamatan?: string | null;
  desa?: string | null;
  resolution?: string | null;
}

interface ReportLog {
  id: string;
  report_id: string;
  action: 'status_update' | 'bulk_status_update' | 'edit';
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  actor_id: string | null;
  actor_email: string | null;
  created_at: string;
}

const AdminDashboard = () => {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'semua' | 'baru' | 'diproses' | 'selesai'>('semua');
  const [severityFilter, setSeverityFilter] = useState<'semua' | 'ringan' | 'sedang' | 'berat'>('semua');
  const [categoryFilter, setCategoryFilter] = useState<string>('semua');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortBy, setSortBy] = useState<'created_at_desc' | 'severity_desc' | 'category_asc'>('created_at_desc');
  const [stats, setStats] = useState({ total: 0, baru: 0, diproses: 0, selesai: 0 });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalFiltered, setTotalFiltered] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<"" | "baru" | "diproses" | "selesai">("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [confirmBulkOpen, setConfirmBulkOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editSeverity, setEditSeverity] = useState<'' | 'ringan' | 'sedang' | 'berat'>('');
  const [editResolution, setEditResolution] = useState('');
  const [saving, setSaving] = useState(false);
  const maxResolutionLen = 5000;
  const [chartDays, setChartDays] = useState<7 | 30>(30);
  const [chartDaily, setChartDaily] = useState<Array<{ date: string; count: number }>>([]);
  const [chartByCategory, setChartByCategory] = useState<Array<{ name: string; count: number }>>([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [logs, setLogs] = useState<ReportLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const renderSeverityBadge = (sev?: 'ringan' | 'sedang' | 'berat' | null) => {
    if (!sev) return <span className="text-muted-foreground">-</span>;
    const variant = sev === 'berat' ? 'destructive' : sev === 'sedang' ? 'secondary' : 'outline';
    return <Badge variant={variant}>{sev}</Badge>;
  };

  const renderStatusBadge = (status: string) => {
    const cls =
      status === 'selesai' ? 'bg-green-600 text-white' :
      status === 'diproses' ? 'bg-blue-600 text-white' :
      'bg-amber-500 text-black';
    return <span className={`px-2 py-1 rounded text-xs ${cls}`}>{status}</span>;
  };

  const formatDate = (iso?: string | null) => {
    try {
      if (!iso) return '-';
      const d = new Date(iso);
      return isNaN(d.getTime()) ? '-' : d.toLocaleDateString('id-ID');
    } catch {
      return '-';
    }
  };

  const formatDateTime = (iso?: string | null) => {
    try {
      if (!iso) return '-';
      const d = new Date(iso);
      return isNaN(d.getTime()) ? '-' : d.toLocaleString('id-ID');
    } catch {
      return '-';
    }
  };

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      toast.error("Akses ditolak");
      navigate("/");
      return;
    }
    if (user && isAdmin) {
      fetchStats();
      fetchReports();
      fetchChartData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isAdmin, authLoading, navigate]);

  // Realtime updates for reports
  useEffect(() => {
    if (!user || !isAdmin) return;
    const channel = supabase
      .channel('reports-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reports' }, () => {
        // refresh both list and stats; keep current filters
        fetchReports();
        fetchStats();
        fetchChartData();
      })
      .subscribe();
    return () => {
      channel.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isAdmin, statusFilter, severityFilter, categoryFilter, debouncedSearch, sortBy, page, pageSize]);

  // debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  // refetch when filters or sort or debounced search change
  useEffect(() => {
    if (user && isAdmin) {
      setPage(1); // reset to first page when filters change
      fetchReports();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, severityFilter, categoryFilter, debouncedSearch, sortBy]);

  useEffect(() => {
    if (user && isAdmin) {
      fetchChartData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartDays]);

  // Refetch charts when filters change to keep them in sync with the table
  useEffect(() => {
    if (user && isAdmin) {
      fetchChartData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, severityFilter, categoryFilter, debouncedSearch]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('reports')
        .select("id,title,category,status,created_at,location_name,severity,kecamatan,desa,resolution", { count: 'exact' });

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

      if (sortBy === 'created_at_desc') {
        query = query.order('created_at', { ascending: false });
      } else if (sortBy === 'category_asc') {
        query = query.order('category', { ascending: true }).order('created_at', { ascending: false });
      } else {
        // severity_desc: still order by created_at for determinism, then client-sort
        query = query.order('created_at', { ascending: false });
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      const { data, error, count } = await query.range(from, to);
      if (error) throw error;

      let result = (data || []) as Report[];

      if (sortBy === 'severity_desc') {
        const weight: Record<NonNullable<Report['severity']>, number> = {
          ringan: 1,
          sedang: 2,
          berat: 3,
        } as const;
        result = [...result].sort((a, b) => (weight[b.severity || 'ringan'] || 0) - (weight[a.severity || 'ringan'] || 0));
      }

      setReports(result);
      setTotalFiltered(count || 0);
      // cleanup selection if items are no longer visible
      setSelectedIds((prev) => {
        const next = new Set<string>();
        const ids = new Set(result.map((r) => r.id));
        prev.forEach((id) => {
          if (ids.has(id)) next.add(id);
        });
        return next;
      });
    } catch (err) {
      console.error(err);
      toast.error('Gagal memuat laporan');
    }
    setLoading(false);
  };

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

  const openDetail = (r: Report) => {
    try {
      setSelectedReport(r);
      setEditTitle(r?.title ?? '');
      setEditSeverity((r?.severity ?? '') as '' | 'ringan' | 'sedang' | 'berat');
      setEditResolution(r?.resolution ?? '');
      setDetailOpen(true);
      fetchReportLogs(r.id);
    } catch (e) {
      console.error('Failed to open detail:', e);
      toast.error('Gagal membuka detail laporan');
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
      setLogs((data || []) as ReportLog[]);
    } catch (err) {
      console.error('Gagal memuat riwayat perubahan:', err);
      toast.error('Gagal memuat riwayat perubahan');
    } finally {
      setLogsLoading(false);
    }
  };

  const summarizeLog = (log: ReportLog) => {
    const changes: string[] = [];
    const b = (log.before || {}) as Record<string, unknown>;
    const a = (log.after || {}) as Record<string, unknown>;
    const add = (k: string, fromVal: unknown, toVal: unknown) => {
      const fromStr = fromVal == null || fromVal === '' ? '-' : String(fromVal);
      const toStr = toVal == null || toVal === '' ? '-' : String(toVal);
      changes.push(`${k}: ${fromStr} → ${toStr}`);
    };
    const keys = new Set([...Object.keys(b), ...Object.keys(a)]);
    keys.forEach((k) => add(k, b[k], a[k]));
    const actionLabel = log.action === 'status_update' ? 'Ubah status' : log.action === 'bulk_status_update' ? 'Bulk status' : 'Edit';
    return `${actionLabel} — ${changes.join('; ')}`;
  };

  const buildExportRows = () => {
    return reports.map((r) => ({
      id: r.id,
      title: r.title,
      category: r.category || '',
      severity: r.severity || '',
      status: r.status,
      created_at: formatDateTime(r.created_at),
      location_name: r.location_name || '',
      kecamatan: r.kecamatan || '',
      desa: r.desa || '',
    }));
  };

  const exportExcel = () => {
    try {
      const ws = XLSX.utils.json_to_sheet(buildExportRows());
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Reports');
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      XLSX.writeFile(wb, `reports-export-${ts}.xlsx`);
      toast.success('Export Excel berhasil');
    } catch (err) {
      console.error(err);
      toast.error('Gagal export ke Excel');
    }
  };

  const exportPDF = () => {
    try {
      const doc = new jsPDF({ orientation: 'landscape' });
      const rows = buildExportRows();
      const columns = [
        { header: 'ID', dataKey: 'id' },
        { header: 'Judul', dataKey: 'title' },
        { header: 'Kategori', dataKey: 'category' },
        { header: 'Severity', dataKey: 'severity' },
        { header: 'Status', dataKey: 'status' },
        { header: 'Tanggal', dataKey: 'created_at' },
        { header: 'Lokasi', dataKey: 'location_name' },
        { header: 'Kecamatan', dataKey: 'kecamatan' },
        { header: 'Desa', dataKey: 'desa' },
      ];
  doc.autoTable({ columns, body: rows, styles: { fontSize: 8 }, headStyles: { fillColor: [25, 118, 210] } });
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      doc.save(`reports-export-${ts}.pdf`);
      toast.success('Export PDF berhasil');
    } catch (err) {
      console.error(err);
      toast.error('Gagal export ke PDF');
    }
  };

  const saveEdits = async () => {
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
    if (noChange) {
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
      const payload: { title: string; severity: 'ringan' | 'sedang' | 'berat' | null; resolution: string | null } = {
        title: editTitle,
        severity: editSeverity ? editSeverity : null,
        resolution: editResolution ? editResolution : null,
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
      toast.success('Perubahan tersimpan');
      setDetailOpen(false);
      fetchReports();
      fetchStats();
      if (selectedReport) fetchReportLogs(selectedReport.id);
    } catch (err) {
      console.error(err);
      toast.error('Gagal menyimpan perubahan');
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

  const performBulkUpdate = async (status: 'baru' | 'diproses' | 'selesai') => {
    try {
      setBulkLoading(true);
      const ids = Array.from(selectedIds);
      // fetch previous statuses for logging
      const { data: beforeRows, error: beforeErr } = await supabase
        .from('reports')
        .select('id,status')
        .in('id', ids);
      if (beforeErr) throw beforeErr;
      const beforeMap = new Map<string, 'baru' | 'diproses' | 'selesai' | string>();
      const beforeTyped = (beforeRows || []) as Array<{ id: string; status: 'baru' | 'diproses' | 'selesai' | string }>;
      beforeTyped.forEach((r) => beforeMap.set(r.id, r.status));
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
        toast.warning('Bulk update berhasil, namun gagal mencatat audit log');
      }
      toast.success(`Berhasil mengupdate ${ids.length} laporan`);
      setSelectedIds(new Set());
      setBulkStatus("");
      fetchReports();
      fetchStats();
    } catch (err) {
      console.error(err);
      toast.error('Gagal melakukan bulk update');
    } finally {
      setBulkLoading(false);
      setConfirmBulkOpen(false);
    }
  };

  const fetchStats = async () => {
    try {
      const { data, error } = await supabase
        .from('reports')
        .select('id,status');
      if (error) throw error;
      const total = data?.length || 0;
      const baru = data?.filter((r) => r.status === 'baru').length || 0;
      const diproses = data?.filter((r) => r.status === 'diproses').length || 0;
      const selesai = data?.filter((r) => r.status === 'selesai').length || 0;
      setStats({ total, baru, diproses, selesai });
    } catch (err) {
      console.error(err);
    }
  };

  const fetchChartData = async () => {
    try {
      setChartLoading(true);
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

      const items = (data || []) as Array<{ created_at: string; category: string | null }>;

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
        const name = it.category || 'Lainnya';
        catCount.set(name, (catCount.get(name) || 0) + 1);
      }
      const catArr = Array.from(catCount.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6); // top 6 categories
      setChartByCategory(catArr);
    } catch (err) {
      console.error(err);
    } finally {
      setChartLoading(false);
    }
  };

  const categories = useMemo(() => {
    const set = new Set<string>();
    reports.forEach((r) => r.category && set.add(r.category));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [reports]);

  const updateStatus = async (id: string, newStatus: string) => {
    setUpdatingId(id);
    const prevStatus = reports.find((r) => r.id === id)?.status;
    const { error } = await supabase
      .from("reports")
      .update({ status: newStatus as "baru" | "diproses" | "selesai" })
      .eq("id", id);

    if (error) {
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
      toast.success("Status berhasil diupdate");
      fetchReports();
      fetchStats();
      if (selectedReport && selectedReport.id === id) fetchReportLogs(id);
    }
    setUpdatingId(null);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  

  return (
    <div className="min-h-screen bg-gradient-to-br from-accent/5 via-background to-primary/5 py-8">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Dashboard Admin</h1>
          <p className="text-muted-foreground">Kelola semua laporan infrastruktur</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-muted-foreground">Total Laporan</CardTitle>
              <div className="text-3xl font-bold flex items-center gap-2">
                <FileText className="w-6 h-6 text-primary" />
                {stats.total}
              </div>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-muted-foreground">Baru</CardTitle>
              <div className="text-3xl font-bold flex items-center gap-2">
                <Clock className="w-6 h-6 text-accent" />
                {stats.baru}
              </div>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-muted-foreground">Diproses</CardTitle>
              <div className="text-3xl font-bold flex items-center gap-2">
                <Loader2 className="w-6 h-6 text-secondary" />
                {stats.diproses}
              </div>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-muted-foreground">Selesai</CardTitle>
              <div className="text-3xl font-bold flex items-center gap-2">
                <CheckCircle className="w-6 h-6 text-green-600" />
                {stats.selesai}
              </div>
            </CardHeader>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm text-muted-foreground">Tren Laporan ({chartDays} hari)</CardTitle>
              <Select value={String(chartDays)} onValueChange={(v) => setChartDays(Number(v) as 7 | 30)}>
                <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 hari</SelectItem>
                  <SelectItem value="30">30 hari</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              {chartLoading ? (
                <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">Memuat chart...</div>
              ) : chartDaily.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">Tidak ada data</div>
              ) : (
                <ChartContainer
                  config={{ reports: { label: 'Laporan', color: 'hsl(var(--primary))' } }}
                  className="h-64"
                >
                  <LineChart data={chartDaily} margin={{ left: 12, right: 12 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickLine={false} axisLine={false} />
                    <YAxis allowDecimals={false} width={28} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line type="monotone" dataKey="count" stroke="var(--color-reports)" strokeWidth={2} dot={false} />
                  </LineChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Kategori Terbanyak ({chartDays} hari)</CardTitle>
            </CardHeader>
            <CardContent>
              {chartLoading ? (
                <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">Memuat chart...</div>
              ) : chartByCategory.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">Tidak ada data</div>
              ) : (
                <ChartContainer
                  config={{ count: { label: 'Jumlah', color: 'hsl(var(--primary))' } }}
                  className="h-64"
                >
                  <BarChart data={chartByCategory} margin={{ left: 12, right: 12 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} />
                    <YAxis allowDecimals={false} width={28} />
                    <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                    <Bar dataKey="count" fill="var(--color-count)" radius={4} />
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6 space-y-4">
            <div className="flex flex-col gap-3">
              <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
                <TabsList className="grid grid-cols-4 w-full md:w-auto">
                  <TabsTrigger value="semua">Semua</TabsTrigger>
                  <TabsTrigger value="baru">Baru</TabsTrigger>
                  <TabsTrigger value="diproses">Diproses</TabsTrigger>
                  <TabsTrigger value="selesai">Selesai</TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <Select value={severityFilter} onValueChange={(v) => setSeverityFilter(v as typeof severityFilter)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Severity" />
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
                  <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Kategori" />
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
                  <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Urutkan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="created_at_desc">Terbaru</SelectItem>
                      <SelectItem value="severity_desc">Severity (tinggi → rendah)</SelectItem>
                      <SelectItem value="category_asc">Kategori (A → Z)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Cari judul laporan..."
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reports Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>Semua Laporan</CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={exportExcel}>Export Excel</Button>
                <Button variant="outline" onClick={exportPDF}>Export PDF</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Bulk actions toolbar */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-3 mb-4">
              <div className="text-sm text-muted-foreground">
                {selectedIds.size > 0 ? `${selectedIds.size} dipilih` : 'Tidak ada item dipilih'}
              </div>
              <div className="flex items-center gap-2 w-full md:w-auto">
                <Select value={bulkStatus} onValueChange={(v) => setBulkStatus(v as typeof bulkStatus)}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Ubah status menjadi..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baru">Baru</SelectItem>
                    <SelectItem value="diproses">Diproses</SelectItem>
                    <SelectItem value="selesai">Selesai</SelectItem>
                  </SelectContent>
                </Select>
                <AlertDialog open={confirmBulkOpen} onOpenChange={setConfirmBulkOpen}>
                  <AlertDialogTrigger asChild>
                    <Button onClick={applyBulk} disabled={!bulkStatus || selectedIds.size === 0 || bulkLoading}>
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
              <div className="text-center text-muted-foreground py-10">Tidak ada laporan untuk filter saat ini.</div>
            ) : (
              <div className="w-full overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox checked={allVisibleSelected} onCheckedChange={() => toggleSelectAll()} aria-label="Pilih semua" />
                      </TableHead>
                      <TableHead>Judul</TableHead>
                      <TableHead>Kategori</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Lokasi</TableHead>
                      <TableHead>Wilayah</TableHead>
                      <TableHead>Tanggal</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reports.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.has(report.id)}
                            onCheckedChange={(c) => toggleSelect(report.id, Boolean(c))}
                            aria-label={`Pilih laporan ${report.title || ''}`}
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          <button type="button" className="text-left hover:underline" onClick={() => openDetail(report)}>
                            {report.title || '(tanpa judul)'}
                          </button>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{report.category}</Badge>
                        </TableCell>
                        <TableCell>{renderSeverityBadge(report.severity)}</TableCell>
                        <TableCell>
                          {report.location_name ? `📍 ${report.location_name}` : <span className="text-muted-foreground">-</span>}
                        </TableCell>
                        <TableCell>
                          {(report.kecamatan || report.desa)
                            ? [report.desa, report.kecamatan].filter(Boolean).join(', ')
                            : <span className="text-muted-foreground">-</span>}
                        </TableCell>
                        <TableCell>{formatDate(report.created_at)}</TableCell>
                        <TableCell className="text-right">
                          <Select
                            value={report.status}
                            onValueChange={(value) => updateStatus(report.id, value)}
                            disabled={updatingId === report.id}
                          >
                            <SelectTrigger className="w-[140px] ml-auto">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="baru">Baru</SelectItem>
                              <SelectItem value="diproses">Diproses</SelectItem>
                              <SelectItem value="selesai">Selesai</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="flex flex-col md:flex-row items-center justify-between gap-3 mt-4">
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    Menampilkan {Math.min((page - 1) * pageSize + 1, totalFiltered)}–{Math.min(page * pageSize, totalFiltered)} dari {totalFiltered}
                    <div className="flex items-center gap-2">
                      <span className="hidden md:inline">Per halaman:</span>
                      <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
                        <SelectTrigger className="w-[90px]">
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
                        <PaginationPrevious onClick={() => setPage((p) => Math.max(1, p - 1))} aria-disabled={page === 1} />
                      </PaginationItem>
                      {Array.from({ length: Math.max(1, Math.ceil(totalFiltered / pageSize)) }).slice(0, 5).map((_, i) => {
                        const pageNum = i + 1; // simple first 5 pages display
                        return (
                          <PaginationItem key={pageNum}>
                            <PaginationLink isActive={page === pageNum} onClick={() => setPage(pageNum)}>
                              {pageNum}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      })}
                      <PaginationItem>
                        <PaginationNext onClick={() => setPage((p) => (p * pageSize < totalFiltered ? p + 1 : p))} aria-disabled={page * pageSize >= totalFiltered} />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detail Drawer */}
        <Drawer open={detailOpen} onOpenChange={setDetailOpen}>
          <DrawerContent>
            <DrawerErrorBoundary>
            <DrawerHeader className="text-left">
              <DrawerTitle>Detail Laporan</DrawerTitle>
              <DrawerDescription>Informasi lengkap laporan terpilih.</DrawerDescription>
            </DrawerHeader>
            <div className="px-6 py-4 space-y-4">
              {(() => {
                try {
                  if (!selectedReport) return <div className="text-sm text-muted-foreground">Data laporan tidak tersedia.</div>;
                  return (
                <div className="space-y-2">
                  <div>
                    <div className="text-sm text-muted-foreground">Judul</div>
                    <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                  </div>
                  <div className="flex flex-wrap gap-2 items-center">
                    <Badge variant="outline">{selectedReport.category || '-'}</Badge>
                    <select
                      className="h-9 w-[180px] rounded-md border bg-background px-3 text-sm"
                      value={editSeverity}
                      onChange={(e) => setEditSeverity(e.target.value as typeof editSeverity)}
                    >
                      <option value="">-</option>
                      <option value="berat">Berat</option>
                      <option value="sedang">Sedang</option>
                      <option value="ringan">Ringan</option>
                    </select>
                    {renderStatusBadge(String(selectedReport.status || ''))}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <div className="text-sm text-muted-foreground">Lokasi</div>
                      <div>{selectedReport.location_name || '-'}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Wilayah</div>
                      <div>{(selectedReport.desa || selectedReport.kecamatan) ? [selectedReport.desa ?? '', selectedReport.kecamatan ?? ''].filter(Boolean).join(', ') : '-'}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Tanggal</div>
                      <div>{formatDateTime(selectedReport.created_at)}</div>
                    </div>
                    <div className="md:col-span-2">
                      <div className="text-sm text-muted-foreground">Hasil/Respon</div>
                      <textarea
                        className="w-full min-h-[120px] rounded-md border bg-background p-2 text-sm"
                        value={editResolution}
                        onChange={(e) => setEditResolution(e.target.value)}
                        placeholder="Tulis hasil penanganan/respon admin di sini..."
                      />
                    </div>
                  </div>
                  <div className="pt-4 mt-4 border-t">
                    <div className="font-medium mb-2">Riwayat Perubahan</div>
                    {logsLoading ? (
                      <div className="text-sm text-muted-foreground">Memuat riwayat...</div>
                    ) : logs.length === 0 ? (
                      <div className="text-sm text-muted-foreground">Belum ada perubahan.</div>
                    ) : (
                      <ul className="space-y-2 max-h-56 overflow-auto pr-2">
                        {logs.map((log) => (
                          <li key={log.id} className="text-sm">
                            <div className="text-muted-foreground">{formatDateTime(log.created_at)} — {log.actor_email || '-'}</div>
                            <div>{summarizeLog(log)}</div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
                  );
                } catch (err) {
                  console.error('Drawer inner render error:', err);
                  return <div className="text-sm text-red-600">Terjadi kesalahan saat memuat detail.</div>;
                }
              })()}
            </div>
            <DrawerFooter>
              <div className="flex items-center justify-end gap-2">
                <DrawerClose asChild>
                  <Button variant="outline">Batal</Button>
                </DrawerClose>
                <Button onClick={saveEdits} disabled={saving || !selectedReport}>Simpan</Button>
              </div>
            </DrawerFooter>
            </DrawerErrorBoundary>
          </DrawerContent>
        </Drawer>
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
    console.error('Drawer render error:', error);
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
