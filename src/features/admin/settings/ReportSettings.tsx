import { logger } from "@/lib/logger";
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  Loader2,
  FileText,
  CheckCircle,
  Settings2,
  Bell,
  FileCheck,
  Workflow,
  Upload,
  Download,
  AlertCircle,
  FileSpreadsheet,
  XCircle,
  Clock,
  Sparkles,
  Save,
  RotateCcw
} from 'lucide-react';
import { useSystemSettings } from '@/features/admin/useSystemSettings';
import { supabase } from '@/services/client';
import { useAuth } from '@/features/auth/useAuth';
import type { Database } from '@/services/types';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { handleApiError } from '@/lib/api-errors';
import { exportReportsToCsv } from '@/features/admin/exportReports';

type ReportConfig = {
  autoApprove: boolean;
  requirePhotos: boolean;
  minPhotos: number;
  maxPhotos: number;
  requireLocation: boolean;
  allowAnonymous: boolean;
  autoAssign: boolean;
  defaultPriority: 'rendah' | 'sedang' | 'tinggi';
  autoCloseAfterDays: number;
  enablePublicView: boolean;
  requireVerification: boolean;
};

type ExportConfig = {
  schedule: 'none' | 'daily' | 'weekly' | 'monthly';
  format: 'csv' | 'pdf' | 'excel';
  retention: number;
  includePhotos: boolean;
  includeComments: boolean;
  autoEmail: boolean;
};

type NotificationConfig = {
  notifyOnNew: boolean;
  notifyOnUpdate: boolean;
  notifyOnClose: boolean;
  notifyEmail: string;
  notifyThreshold: number;
};

const STORAGE_KEY = 'admin:reportSettings';

const defaultConfig: ReportConfig = {
  autoApprove: false,
  requirePhotos: true,
  minPhotos: 1,
  maxPhotos: 5,
  requireLocation: true,
  allowAnonymous: false,
  autoAssign: false,
  defaultPriority: 'sedang',
  autoCloseAfterDays: 30,
  enablePublicView: true,
  requireVerification: false,
};

const defaultExport: ExportConfig = {
  schedule: 'none',
  format: 'csv',
  retention: 365,
  includePhotos: false,
  includeComments: true,
  autoEmail: false,
};

const defaultNotification: NotificationConfig = {
  notifyOnNew: true,
  notifyOnUpdate: false,
  notifyOnClose: false,
  notifyEmail: '',
  notifyThreshold: 5,
};

export const ReportSettings = () => {
  const { fetchSetting } = useSystemSettings();
  const { user } = useAuth();
  const [config, setConfig] = useState<ReportConfig>(defaultConfig);
  const [exportConfig, setExportConfig] = useState<ExportConfig>(defaultExport);
  const [notificationConfig, setNotificationConfig] = useState<NotificationConfig>(defaultNotification);

  // Baseline configuration for tracking unsaved dirty state
  const [baselineConfig, setBaselineConfig] = useState<string>(
    JSON.stringify({ config: defaultConfig, export: defaultExport, notification: defaultNotification })
  );

  const [initialLoading, setInitialLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [exportingNow, setExportingNow] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; failed: number; errors: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentSerialized = useMemo(() => {
    return JSON.stringify({ config, export: exportConfig, notification: notificationConfig });
  }, [config, exportConfig, notificationConfig]);

  const isDirty = currentSerialized !== baselineConfig;

  // Load settings from Supabase on mount (falls back to localStorage)
  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setInitialLoading(true);
      try {
        let loadedConfig = defaultConfig;
        let loadedExport = defaultExport;
        let loadedNotification = defaultNotification;

        const remote = await fetchSetting<{ config: ReportConfig; export: ExportConfig; notification: NotificationConfig }>('reports', 'config');
        if (remote) {
          if (remote.config) loadedConfig = { ...defaultConfig, ...remote.config };
          if (remote.export) loadedExport = { ...defaultExport, ...remote.export };
          if (remote.notification) loadedNotification = { ...defaultNotification, ...remote.notification };
        } else if (typeof window !== 'undefined') {
          // Fallback: localStorage
          const stored = localStorage.getItem(STORAGE_KEY);
          if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed.config) loadedConfig = { ...defaultConfig, ...parsed.config };
            if (parsed.export) loadedExport = { ...defaultExport, ...parsed.export };
            if (parsed.notification) loadedNotification = { ...defaultNotification, ...parsed.notification };
          }
        }

        if (isMounted) {
          setConfig(loadedConfig);
          setExportConfig(loadedExport);
          setNotificationConfig(loadedNotification);
          setBaselineConfig(JSON.stringify({ config: loadedConfig, export: loadedExport, notification: loadedNotification }));
        }
      } catch (error) {
        logger.warn('Failed to load report settings from storage', error);
      } finally {
        if (isMounted) {
          setInitialLoading(false);
        }
      }
    };
    void load();

    return () => {
      isMounted = false;
    };
  }, [fetchSetting]);

  const handleResetToBaseline = useCallback(() => {
    try {
      const baseline = JSON.parse(baselineConfig);
      if (baseline.config) setConfig(baseline.config);
      if (baseline.export) setExportConfig(baseline.export);
      if (baseline.notification) setNotificationConfig(baseline.notification);
      toast.info('Perubahan dibatalkan, kembali ke pengaturan tersimpan');
    } catch (e) {
      logger.error('Failed to reset config to baseline', e);
    }
  }, [baselineConfig]);

  const handleSave = useCallback(async () => {
    // Validate before touching saving state
    if (config.minPhotos > config.maxPhotos) {
      toast.error('Minimal foto tidak boleh lebih besar dari batas maksimal foto');
      return;
    }
    if (config.autoCloseAfterDays < 1) {
      toast.error('Auto-close minimal 1 hari');
      return;
    }
    if (exportConfig.retention < 30) {
      toast.error('Retensi data minimal 30 hari');
      return;
    }
    if (notificationConfig.notifyEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(notificationConfig.notifyEmail)) {
      toast.error('Format email notifikasi tidak valid');
      return;
    }

    setSaving(true);
    try {
      const data = { config, export: exportConfig, notification: notificationConfig };
      const { error } = await supabase
        .from('app_settings')
        .upsert({ category: 'reports', key: 'config', value: data }, { onConflict: 'category,key' });
      if (error) throw error;

      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      }

      setBaselineConfig(JSON.stringify(data));

      toast.success('Pengaturan laporan berhasil disimpan', {
        icon: <CheckCircle className="h-4 w-4" />,
      });
    } catch (error) {
      logger.error('Failed to save report settings', error);
      toast.error(handleApiError(error, 'Gagal menyimpan pengaturan laporan'));
    } finally {
      setSaving(false);
    }
  }, [config, exportConfig, notificationConfig]);

  const handleInstantExport = async () => {
    setExportingNow(true);
    try {
      await exportReportsToCsv({
        statusFilter: 'semua',
        severityFilter: 'semua',
        categoryFilter: 'semua',
        search: '',
        sortBy: 'created_at_desc',
      });
    } catch (error) {
      logger.error('Failed to trigger instant report export', error);
      toast.error(handleApiError(error, 'Gagal mengunduh ekspor laporan'));
    } finally {
      setExportingNow(false);
    }
  };

  const downloadTemplate = () => {
    const headers = [
      'title',
      'description',
      'category',
      'severity',
      'status',
      'latitude',
      'longitude',
      'location_name',
      'kecamatan',
      'desa',
      'reporter_name',
      'phone',
      'incident_date',
      'resolution'
    ];

    const example = [
      'Jalan Rusak di Desa Sukamaju',
      'Jalan berlubang sepanjang 50 meter memerlukan penambalan aspal',
      'jalan',
      'sedang',
      'baru',
      '-7.325000',
      '108.353000',
      'Jl. Raya Sukamaju No. 12',
      'Ciamis',
      'Sukamaju',
      'Budi Santoso',
      '081234567890',
      '2026-03-01',
      ''
    ];

    // UTF-8 BOM for Excel compatibility
    const BOM = '\uFEFF';
    const csv = BOM + [
      headers.join(','),
      example.map(v => `"${v.replace(/"/g, '""')}"`).join(',')
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template-import-laporan.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success('Template CSV berhasil diunduh');
  };

  // Proper CSV value parser — handles quoted fields containing commas and double quotes
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; } // escaped quote
        else inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!user?.id) {
      toast.error('Anda harus terautentikasi sebagai admin untuk melakukan import data laporan');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast.error('File harus berformat CSV (.csv)');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Enforce 5MB limit
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ukuran file melebihi batas 5MB');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setImporting(true);
    setImportResult(null);

    try {
      const text = await file.text();
      // Strip UTF-8 BOM if present
      const cleanText = text.startsWith('\uFEFF') ? text.slice(1) : text;
      const lines = cleanText.split(/\r?\n/).filter(l => l.trim().length > 0);

      if (lines.length < 2) {
        toast.error('File CSV kosong atau tidak memiliki baris data');
        return;
      }

      const headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase());
      const rows = lines.slice(1);

      const validCategories: Database['public']['Enums']['report_category'][] = [
        'jalan', 'jembatan', 'irigasi', 'drainase', 'sungai', 'lainnya'
      ];
      const validSeverities: Database['public']['Enums']['report_severity'][] = [
        'ringan', 'sedang', 'berat'
      ];
      const validStatuses: Database['public']['Enums']['report_status'][] = [
        'baru', 'diproses', 'selesai'
      ];

      let success = 0;
      let failed = 0;
      const errors: string[] = [];

      const inserts: Database['public']['Tables']['reports']['Insert'][] = [];
      for (let i = 0; i < rows.length; i++) {
        const lineNum = i + 2;
        try {
          const values = parseCSVLine(rows[i]);
          if (values.every(v => !v)) continue;

          const row: Record<string, string> = {};
          headers.forEach((h, idx) => {
            row[h] = values[idx] || '';
          });

          if (!row.title || !row.description) {
            errors.push(`Baris ${lineNum}: Judul dan deskripsi wajib diisi`);
            failed++;
            continue;
          }

          const lat = parseFloat(row.latitude);
          const lng = parseFloat(row.longitude);
          if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            errors.push(`Baris ${lineNum}: Koordinat tidak valid (Lat: ${row.latitude || '-'}, Lng: ${row.longitude || '-'})`);
            failed++;
            continue;
          }

          const category = validCategories.includes(row.category as Database['public']['Enums']['report_category'])
            ? (row.category as Database['public']['Enums']['report_category'])
            : 'lainnya';
          const severity = validSeverities.includes(row.severity as Database['public']['Enums']['report_severity'])
            ? (row.severity as Database['public']['Enums']['report_severity'])
            : null;
          const status = validStatuses.includes(row.status as Database['public']['Enums']['report_status'])
            ? (row.status as Database['public']['Enums']['report_status'])
            : 'baru';

          // Safe incident date parsing
          let validIncidentDate: string | null = null;
          if (row.incident_date && row.incident_date.trim()) {
            const parsed = new Date(row.incident_date.trim());
            if (!isNaN(parsed.getTime())) {
              validIncidentDate = parsed.toISOString();
            } else {
              errors.push(`Baris ${lineNum}: Format tanggal incident_date (${row.incident_date}) tidak valid, dikosongkan`);
            }
          }

          inserts.push({
            title: row.title.trim(),
            description: row.description.trim(),
            category,
            severity,
            status,
            latitude: lat,
            longitude: lng,
            location_name: row.location_name?.trim() || null,
            kecamatan: row.kecamatan?.trim() || null,
            desa: row.desa?.trim() || null,
            reporter_name: row.reporter_name?.trim() || null,
            phone: row.phone?.trim() || null,
            incident_date: validIncidentDate,
            resolution: row.resolution?.trim() || null,
            user_id: user.id
          });
        } catch (err) {
          failed++;
          errors.push(`Baris ${lineNum}: ${err instanceof Error ? err.message : 'Error saat parsing baris'}`);
        }
      }

      // Chunk inserts in batches of 50 to avoid Supabase payload limits
      const CHUNK_SIZE = 50;
      for (let i = 0; i < inserts.length; i += CHUNK_SIZE) {
        const chunk = inserts.slice(i, i + CHUNK_SIZE);
        const { error } = await supabase.from('reports').insert(chunk);
        if (error) {
          // Fallback to inserting row-by-row in this chunk to rescue valid rows
          for (let j = 0; j < chunk.length; j++) {
            const singleInsert = chunk[j];
            const { error: singleError } = await supabase.from('reports').insert(singleInsert);
            if (singleError) {
              failed++;
              errors.push(`Gagal simpan baris "${singleInsert.title}": ${singleError.message}`);
            } else {
              success++;
            }
          }
        } else {
          success += chunk.length;
        }
      }

      setImportResult({ success, failed, errors });

      if (success > 0) {
        toast.success(`Berhasil mengimpor ${success} laporan baru`, {
          icon: <CheckCircle className="h-4 w-4" />
        });
      }
      if (failed > 0) {
        toast.error(`${failed} baris laporan gagal diimpor`);
      }
    } catch (error) {
      logger.error('Import CSV error:', error);
      toast.error(handleApiError(error, 'Gagal memproses file CSV'));
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (initialLoading) {
    return (
      <Card variant="glass" className="border-0">
        <CardHeader className="p-4 sm:p-6 space-y-2">
          <div className="flex items-center justify-between">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-6 w-28 rounded-full" />
          </div>
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent className="p-4 sm:p-6 space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-xl" />
            ))}
          </div>
          <div className="space-y-4 pt-2">
            <Skeleton className="h-5 w-40" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-lg" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="glass" className="border-0">
      <CardHeader className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <FileText className="h-5 w-5 text-emerald-500" />
              Pengaturan Laporan
            </CardTitle>
            <CardDescription className="mt-1.5 text-xs sm:text-sm">
              Konfigurasi alur kerja tiket, aturan validasi, ekspor terjadwal, dan notifikasi pelaporan
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {isDirty ? (
              <Badge variant="outline" className="text-amber-500 border-amber-500/30 bg-amber-500/10 gap-1.5 text-xs py-1">
                <Clock className="h-3 w-3 animate-pulse" />
                Belum Disimpan
              </Badge>
            ) : (
              <Badge variant="outline" className="text-emerald-500 border-emerald-500/30 bg-emerald-500/10 gap-1.5 text-xs py-1">
                <CheckCircle className="h-3 w-3" />
                Tersimpan
              </Badge>
            )}
            <Badge variant="outline" className="gap-1.5 text-xs py-1">
              <Settings2 className="h-3 w-3" />
              Advanced
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-0">
        <Tabs defaultValue="workflow" className="w-full">
          <TabsList className="grid grid-cols-2 sm:grid-cols-5 w-full mb-6 glass-surface p-1.5 gap-1.5 rounded-xl h-auto">
            <TabsTrigger value="workflow" className="gap-1.5 text-xs sm:text-sm py-2">
              <Workflow className="h-3.5 w-3.5" />
              <span>Workflow</span>
            </TabsTrigger>
            <TabsTrigger value="validation" className="gap-1.5 text-xs sm:text-sm py-2">
              <FileCheck className="h-3.5 w-3.5" />
              <span>Validasi</span>
            </TabsTrigger>
            <TabsTrigger value="import" className="gap-1.5 text-xs sm:text-sm py-2">
              <Upload className="h-3.5 w-3.5" />
              <span>Import CSV</span>
            </TabsTrigger>
            <TabsTrigger value="export" className="gap-1.5 text-xs sm:text-sm py-2">
              <Download className="h-3.5 w-3.5" />
              <span>Ekspor</span>
            </TabsTrigger>
            <TabsTrigger value="notification" className="col-span-2 sm:col-span-1 gap-1.5 text-xs sm:text-sm py-2">
              <Bell className="h-3.5 w-3.5" />
              <span>Notifikasi</span>
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: WORKFLOW */}
          <TabsContent value="workflow" className="space-y-5 mt-0 focus-visible:outline-none">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Workflow className="h-4 w-4 text-emerald-500" />
                <h4 className="text-sm font-semibold">Alur Kerja & Akses Laporan</h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="glass-surface border border-border/50 rounded-xl p-3.5 transition-colors hover:border-emerald-500/30">
                  <label className="flex items-center justify-between cursor-pointer">
                    <div className="pr-3">
                      <div className="text-sm font-medium">Auto-approve laporan</div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Laporan baru langsung diverifikasi tanpa peninjauan manual tim admin
                      </p>
                    </div>
                    <Switch
                      checked={config.autoApprove}
                      onCheckedChange={(checked) =>
                        setConfig((prev) => ({ ...prev, autoApprove: checked }))
                      }
                    />
                  </label>
                </div>

                <div className="glass-surface border border-border/50 rounded-xl p-3.5 transition-colors hover:border-emerald-500/30">
                  <label className="flex items-center justify-between cursor-pointer">
                    <div className="pr-3">
                      <div className="text-sm font-medium">Auto-assign ke petugas</div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Distribusi otomatis laporan ke petugas teknis sesuai kecamatan
                      </p>
                    </div>
                    <Switch
                      checked={config.autoAssign}
                      onCheckedChange={(checked) =>
                        setConfig((prev) => ({ ...prev, autoAssign: checked }))
                      }
                    />
                  </label>
                </div>

                <div className="glass-surface border border-border/50 rounded-xl p-3.5 transition-colors hover:border-emerald-500/30">
                  <label className="flex items-center justify-between cursor-pointer">
                    <div className="pr-3">
                      <div className="text-sm font-medium">Izinkan laporan anonim</div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Warga dapat menyampaikan aduan publik tanpa perlu login akun
                      </p>
                    </div>
                    <Switch
                      checked={config.allowAnonymous}
                      onCheckedChange={(checked) =>
                        setConfig((prev) => ({ ...prev, allowAnonymous: checked }))
                      }
                    />
                  </label>
                </div>

                <div className="glass-surface border border-border/50 rounded-xl p-3.5 transition-colors hover:border-emerald-500/30">
                  <label className="flex items-center justify-between cursor-pointer">
                    <div className="pr-3">
                      <div className="text-sm font-medium">Tampilan publik transparan</div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Daftar dan status laporan dapat dilihat publik di peta interaktif
                      </p>
                    </div>
                    <Switch
                      checked={config.enablePublicView}
                      onCheckedChange={(checked) =>
                        setConfig((prev) => ({ ...prev, enablePublicView: checked }))
                      }
                    />
                  </label>
                </div>
              </div>
            </div>

            <Separator className="opacity-50" />

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Settings2 className="h-4 w-4 text-emerald-500" />
                <h4 className="text-sm font-semibold">Konfigurasi Default & Batas Waktu</h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Prioritas Default Laporan Masuk
                  </label>
                  <Select
                    value={config.defaultPriority}
                    onValueChange={(value) =>
                      setConfig((prev) => ({
                        ...prev,
                        defaultPriority: value as ReportConfig['defaultPriority'],
                      }))
                    }
                  >
                    <SelectTrigger className="h-10 glass-surface border-border/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rendah">Rendah (Penyelesaian reguler)</SelectItem>
                      <SelectItem value="sedang">Sedang (Prioritas normal)</SelectItem>
                      <SelectItem value="tinggi">Tinggi (Perhatian khusus/urgensi)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Auto-close Selesai Setelah (Hari)
                  </label>
                  <Input
                    className="h-10 glass-surface border-border/50"
                    type="number"
                    min="1"
                    max="365"
                    value={config.autoCloseAfterDays}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        autoCloseAfterDays: Math.max(1, Number(e.target.value) || 1),
                      }))
                    }
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Laporan berstatus &apos;selesai&apos; akan diarsipkan secara otomatis setelah jumlah hari ini
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* TAB 2: VALIDATION */}
          <TabsContent value="validation" className="space-y-5 mt-0 focus-visible:outline-none">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <FileCheck className="h-4 w-4 text-emerald-500" />
                <h4 className="text-sm font-semibold">Validasi Input Pelapor</h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="glass-surface border border-border/50 rounded-xl p-3.5 transition-colors hover:border-emerald-500/30">
                  <label className="flex items-center justify-between cursor-pointer">
                    <div className="pr-2">
                      <div className="text-sm font-medium">Wajibkan foto bukti</div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Laporan harus menyertakan foto dokumentasi
                      </p>
                    </div>
                    <Switch
                      checked={config.requirePhotos}
                      onCheckedChange={(checked) =>
                        setConfig((prev) => ({ ...prev, requirePhotos: checked }))
                      }
                    />
                  </label>
                </div>

                <div className="glass-surface border border-border/50 rounded-xl p-3.5 transition-colors hover:border-emerald-500/30">
                  <label className="flex items-center justify-between cursor-pointer">
                    <div className="pr-2">
                      <div className="text-sm font-medium">Wajibkan koordinat GPS</div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Titik koordinat akurat harus terdeteksi
                      </p>
                    </div>
                    <Switch
                      checked={config.requireLocation}
                      onCheckedChange={(checked) =>
                        setConfig((prev) => ({ ...prev, requireLocation: checked }))
                      }
                    />
                  </label>
                </div>

                <div className="glass-surface border border-border/50 rounded-xl p-3.5 transition-colors hover:border-emerald-500/30">
                  <label className="flex items-center justify-between cursor-pointer">
                    <div className="pr-2">
                      <div className="text-sm font-medium">Verifikasi kontak pelapor</div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Nomor HP atau email harus valid
                      </p>
                    </div>
                    <Switch
                      checked={config.requireVerification}
                      onCheckedChange={(checked) =>
                        setConfig((prev) => ({ ...prev, requireVerification: checked }))
                      }
                    />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="glass-surface border border-border/50 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Minimal Foto Lampiran
                    </label>
                    <Badge variant="outline" className="text-xs font-mono font-bold">
                      {config.minPhotos} Foto
                    </Badge>
                  </div>
                  <Slider
                    value={[config.minPhotos]}
                    onValueChange={([v]) => setConfig((prev) => ({ ...prev, minPhotos: Math.min(v, prev.maxPhotos) }))}
                    min={0}
                    max={5}
                    step={1}
                    disabled={!config.requirePhotos}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Jumlah minimal foto yang wajib diunggah pelapor saat membuat tiket
                  </p>
                </div>

                <div className="glass-surface border border-border/50 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Maksimal Foto Lampiran
                    </label>
                    <Badge variant="outline" className="text-xs font-mono font-bold">
                      {config.maxPhotos} Foto
                    </Badge>
                  </div>
                  <Slider
                    value={[config.maxPhotos]}
                    onValueChange={([v]) => setConfig((prev) => ({ ...prev, maxPhotos: Math.max(v, prev.minPhotos) }))}
                    min={1}
                    max={10}
                    step={1}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Batas atas kuota upload foto untuk menghemat kapasitas storage Supabase
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* TAB 3: IMPORT */}
          <TabsContent value="import" className="space-y-5 mt-0 focus-visible:outline-none">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Upload className="h-4 w-4 text-emerald-500" />
                  <h4 className="text-sm font-semibold">Bulk Import Data Laporan</h4>
                </div>
                <Badge variant="outline" className="text-xs gap-1">
                  <FileSpreadsheet className="h-3 w-3" />
                  Format CSV (Maks 5MB)
                </Badge>
              </div>

              <Alert className="border-emerald-500/20 bg-emerald-500/5">
                <AlertCircle className="h-4 w-4 text-emerald-500" />
                <AlertDescription className="text-xs leading-relaxed">
                  Gunakan template CSV resmi SIPASDA untuk memasukkan data laporan dalam jumlah besar. Koordinat geografis akan divalidasi otomatis untuk memastikan peta Leaflet berfungsi optimal.
                </AlertDescription>
              </Alert>

              <div className="glass-surface border border-border/50 rounded-xl p-4 space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <h5 className="text-sm font-medium">Template Data Laporan</h5>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Unduh template resmi dengan header dan contoh baris yang sesuai skema database
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={downloadTemplate}
                    className="gap-2 shrink-0 border-emerald-500/30 hover:bg-emerald-500/10"
                  >
                    <Download className="h-3.5 w-3.5 text-emerald-500" />
                    Unduh Template CSV
                  </Button>
                </div>

                <Separator className="opacity-50" />

                <div>
                  <h5 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                    Skema Kolom Data
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="flex items-start gap-2 bg-background/40 p-2 rounded-lg border border-border/40">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 bg-destructive/10 text-destructive border-destructive/20 shrink-0">
                        Wajib
                      </Badge>
                      <div className="text-[11px] leading-relaxed">
                        <code className="text-xs font-mono font-medium text-primary">title</code>,{' '}
                        <code className="text-xs font-mono font-medium text-primary">description</code>,{' '}
                        <code className="text-xs font-mono font-medium text-primary">latitude</code>,{' '}
                        <code className="text-xs font-mono font-medium text-primary">longitude</code>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 bg-background/40 p-2 rounded-lg border border-border/40">
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 shrink-0">
                        Opsional
                      </Badge>
                      <div className="text-[11px] leading-relaxed">
                        <code className="text-xs font-mono">category</code>,{' '}
                        <code className="text-xs font-mono">severity</code>,{' '}
                        <code className="text-xs font-mono">status</code>,{' '}
                        <code className="text-xs font-mono">kecamatan</code>,{' '}
                        <code className="text-xs font-mono">desa</code>,{' '}
                        <code className="text-xs font-mono">incident_date</code>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="glass-surface border border-border/50 rounded-xl p-4 space-y-3">
                <h5 className="text-sm font-medium">Unggah Berkas CSV</h5>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <Input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    disabled={importing}
                    className="h-10 glass-surface border-border/50 file:text-xs file:font-semibold"
                  />
                  {importing && (
                    <div className="flex items-center gap-2 text-xs text-primary font-medium shrink-0">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Memproses data...
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Sistem mengeksekusi import dalam batch 50 baris dengan proteksi fallback per-baris jika terjadi anomali data.
                </p>
              </div>

              {importResult && (
                <div className="glass-surface border border-border/50 rounded-xl p-4 space-y-3 animate-in fade-in-50 duration-200">
                  <div className="flex items-center justify-between">
                    <h5 className="text-sm font-medium flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4 text-emerald-500" />
                      Ringkasan Eksekusi Import
                    </h5>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setImportResult(null)}
                      className="h-7 text-xs px-2 gap-1 text-muted-foreground hover:text-foreground"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Tutup
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
                      <div className="text-xs text-muted-foreground mb-1 font-medium">Berhasil Masuk</div>
                      <div className="text-2xl font-bold text-emerald-500">{importResult.success}</div>
                    </div>
                    <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-3">
                      <div className="text-xs text-muted-foreground mb-1 font-medium">Gagal / Ditolak</div>
                      <div className="text-2xl font-bold text-destructive">{importResult.failed}</div>
                    </div>
                  </div>
                  {importResult.errors.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between">
                        <h6 className="text-xs font-semibold text-muted-foreground">Log Kendala Validasi:</h6>
                        {importResult.errors.length > 10 && (
                          <span className="text-[10px] text-muted-foreground">
                            (Menampilkan 10 dari {importResult.errors.length} catatan)
                          </span>
                        )}
                      </div>
                      <div className="bg-background/60 rounded-lg border border-border/50 p-2.5 max-h-36 overflow-y-auto space-y-1 text-xs">
                        {importResult.errors.slice(0, 10).map((err, idx) => (
                          <div key={idx} className="text-destructive font-mono text-[11px] leading-tight">
                            • {err}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </TabsContent>

          {/* TAB 4: EXPORT */}
          <TabsContent value="export" className="space-y-5 mt-0 focus-visible:outline-none">
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Download className="h-4 w-4 text-emerald-500" />
                  <h4 className="text-sm font-semibold">Konfigurasi Ekspor & Retensi Data</h4>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleInstantExport}
                  disabled={exportingNow}
                  className="gap-2 border-emerald-500/30 hover:bg-emerald-500/10 text-xs shrink-0"
                >
                  {exportingNow ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-500" />
                  )}
                  Ekspor Laporan Sekarang (CSV)
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Jadwal Auto-Export
                  </label>
                  <Select
                    value={exportConfig.schedule}
                    onValueChange={(value) =>
                      setExportConfig((prev) => ({
                        ...prev,
                        schedule: value as ExportConfig['schedule'],
                      }))
                    }
                  >
                    <SelectTrigger className="h-10 glass-surface border-border/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Tidak Aktif (Manual)</SelectItem>
                      <SelectItem value="daily">Harian (Tiap 00:00 WIB)</SelectItem>
                      <SelectItem value="weekly">Mingguan (Tiap Senin)</SelectItem>
                      <SelectItem value="monthly">Bulanan (Tanggal 1)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Format Berkas Ekspor
                  </label>
                  <Select
                    value={exportConfig.format}
                    onValueChange={(value) =>
                      setExportConfig((prev) => ({
                        ...prev,
                        format: value as ExportConfig['format'],
                      }))
                    }
                  >
                    <SelectTrigger className="h-10 glass-surface border-border/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="csv">CSV (Excel Compatible)</SelectItem>
                      <SelectItem value="excel">Excel Spreadsheet (.xlsx)</SelectItem>
                      <SelectItem value="pdf">Dokumen PDF Terstruktur</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Retensi Data Arsip (Hari)
                  </label>
                  <Input
                    className="h-10 glass-surface border-border/50"
                    type="number"
                    min="30"
                    max="3650"
                    value={exportConfig.retention}
                    onChange={(e) =>
                      setExportConfig((prev) => ({
                        ...prev,
                        retention: Math.max(30, Number(e.target.value) || 30),
                      }))
                    }
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Minimal retensi arsip laporan adalah 30 hari
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="glass-surface border border-border/50 rounded-xl p-3.5 transition-colors hover:border-emerald-500/30">
                  <label className="flex items-center justify-between cursor-pointer">
                    <div className="pr-2">
                      <div className="text-sm font-medium">Sertakan tautan foto</div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Sertakan link foto lampiran dalam berkas ekspor
                      </p>
                    </div>
                    <Switch
                      checked={exportConfig.includePhotos}
                      onCheckedChange={(checked) =>
                        setExportConfig((prev) => ({ ...prev, includePhotos: checked }))
                      }
                    />
                  </label>
                </div>

                <div className="glass-surface border border-border/50 rounded-xl p-3.5 transition-colors hover:border-emerald-500/30">
                  <label className="flex items-center justify-between cursor-pointer">
                    <div className="pr-2">
                      <div className="text-sm font-medium">Sertakan riwayat log</div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Muat riwayat disposisi status dan catatan teknis
                      </p>
                    </div>
                    <Switch
                      checked={exportConfig.includeComments}
                      onCheckedChange={(checked) =>
                        setExportConfig((prev) => ({ ...prev, includeComments: checked }))
                      }
                    />
                  </label>
                </div>

                <div className="glass-surface border border-border/50 rounded-xl p-3.5 transition-colors hover:border-emerald-500/30">
                  <label className="flex items-center justify-between cursor-pointer">
                    <div className="pr-2">
                      <div className="text-sm font-medium">Kirim berkas via email</div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Kirimkan hasil rekapitulasi ke email admin utama
                      </p>
                    </div>
                    <Switch
                      checked={exportConfig.autoEmail}
                      onCheckedChange={(checked) =>
                        setExportConfig((prev) => ({ ...prev, autoEmail: checked }))
                      }
                    />
                  </label>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* TAB 5: NOTIFICATION */}
          <TabsContent value="notification" className="space-y-5 mt-0 focus-visible:outline-none">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-emerald-500" />
                <h4 className="text-sm font-semibold">Notifikasi & Peringatan Otomatis</h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="glass-surface border border-border/50 rounded-xl p-3.5 transition-colors hover:border-emerald-500/30">
                  <label className="flex items-center justify-between cursor-pointer">
                    <div className="pr-2">
                      <div className="text-sm font-medium">Laporan baru masuk</div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Kirim notifikasi setiap kali ada laporan warga masuk
                      </p>
                    </div>
                    <Switch
                      checked={notificationConfig.notifyOnNew}
                      onCheckedChange={(checked) =>
                        setNotificationConfig((prev) => ({ ...prev, notifyOnNew: checked }))
                      }
                    />
                  </label>
                </div>

                <div className="glass-surface border border-border/50 rounded-xl p-3.5 transition-colors hover:border-emerald-500/30">
                  <label className="flex items-center justify-between cursor-pointer">
                    <div className="pr-2">
                      <div className="text-sm font-medium">Update status penanganan</div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Notifikasi saat status tiket beralih ke &apos;diproses&apos;
                      </p>
                    </div>
                    <Switch
                      checked={notificationConfig.notifyOnUpdate}
                      onCheckedChange={(checked) =>
                        setNotificationConfig((prev) => ({ ...prev, notifyOnUpdate: checked }))
                      }
                    />
                  </label>
                </div>

                <div className="glass-surface border border-border/50 rounded-xl p-3.5 transition-colors hover:border-emerald-500/30">
                  <label className="flex items-center justify-between cursor-pointer">
                    <div className="pr-2">
                      <div className="text-sm font-medium">Laporan ditutup/selesai</div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Notifikasi saat tim lapangan menyelesaikan perbaikan
                      </p>
                    </div>
                    <Switch
                      checked={notificationConfig.notifyOnClose}
                      onCheckedChange={(checked) =>
                        setNotificationConfig((prev) => ({ ...prev, notifyOnClose: checked }))
                      }
                    />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Email Tujuan Notifikasi
                  </label>
                  <Input
                    className="h-10 glass-surface border-border/50"
                    type="email"
                    placeholder="dinas-pupr@ciamis.go.id"
                    value={notificationConfig.notifyEmail}
                    onChange={(e) =>
                      setNotificationConfig((prev) => ({ ...prev, notifyEmail: e.target.value }))
                    }
                  />
                  {notificationConfig.notifyEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(notificationConfig.notifyEmail) ? (
                    <p className="text-[11px] text-destructive">Format email tidak valid</p>
                  ) : (
                    <p className="text-[11px] text-muted-foreground">
                      Alamat email petugas operasional penerima alert real-time
                    </p>
                  )}
                </div>

                <div className="glass-surface border border-border/50 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Batas Ambang Peringatan Lonjakan
                    </label>
                    <Badge variant="outline" className="text-xs font-mono font-bold">
                      {notificationConfig.notifyThreshold} Tiket / Jam
                    </Badge>
                  </div>
                  <Slider
                    value={[notificationConfig.notifyThreshold]}
                    onValueChange={([v]) =>
                      setNotificationConfig((prev) => ({ ...prev, notifyThreshold: v }))
                    }
                    min={1}
                    max={20}
                    step={1}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Kirim alert darurat ke tim jika tercapai {notificationConfig.notifyThreshold} laporan baru dalam rentang waktu 1 jam
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <Separator className="my-6 opacity-50" />

        {/* FOOTER ACTIONS */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <p className="text-xs text-muted-foreground">
              Konfigurasi ini berlaku global untuk pemrosesan laporan di sistem SIPASDA.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isDirty && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetToBaseline}
                disabled={saving}
                className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Batalkan
              </Button>
            )}
            <Button
              onClick={handleSave}
              disabled={saving || !isDirty}
              size="sm"
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {isDirty ? 'Simpan Pengaturan' : 'Tersimpan'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
