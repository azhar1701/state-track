import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination, PaginationContent, PaginationItem, PaginationLink } from '@/components/ui/pagination';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, MapPin, RefreshCw } from 'lucide-react';
import { ReportDetailDrawer } from '@/components/map/ReportDetailDrawer';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import EmptyState from '@/components/common/EmptyState';
// Sync button removed per request

type ReportRow = {
  id: string;
  title: string | null;
  description: string | null;
  category: string | null;
  status: string | null;
  incident_date: string | null;
  created_at: string;
  user_id: string;
  latitude: number;
  longitude: number;
  location_name: string | null;
  photo_url: string | null;
  photo_urls: string[] | null;
  severity?: 'ringan' | 'sedang' | 'berat' | null;
  resolution?: string | null;
};

const categoryLabels: Record<string, string> = {
  jalan: 'Jalan',
  jembatan: 'Jembatan',
  irigasi: 'Irigasi',
  drainase: 'Drainase',
  sungai: 'Sungai',
  lainnya: 'Lainnya',
};

const statusLabels: Record<string, string> = {
  baru: 'Baru',
  diproses: 'Diproses',
  selesai: 'Selesai',
};

const PAGE_SIZE = 10;

export default function MyReports() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<string>('all');
  const [category, setCategory] = useState<string>('all');
  const [q, setQ] = useState('');
  const [selectedReport, setSelectedReport] = useState<ReportRow | null>(null);
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const where = useMemo(() => ({ status, category, q }), [status, category, q]);

  const loadData = useCallback(async () => {
    setSelectedReport(null);
    if (!user) {
      setRows([]);
      setTotal(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Primary query with extended columns
      let query = supabase
        .from('reports')
        .select(
          'id,title,description,category,status,incident_date,created_at,user_id,latitude,longitude,location_name,photo_url,photo_urls,severity,resolution',
          { count: 'exact' }
        )
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (where.status !== 'all') query = query.eq('status', where.status);
      if (where.category !== 'all') query = query.eq('category', where.category);
      if (where.q) query = query.ilike('title', `%${where.q}%`);

      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      query = query.range(from, to);

      let { data, error, count } = await query;
      if (error) {
        // If column not found (e.g., location_name), retry without it and other optional fields
        const lower = (error.message || '').toLowerCase();
        const missingColumn =
          (lower.includes('column') && lower.includes('does not exist')) ||
          lower.includes('schema cache') ||
          lower.includes('could not find');
        if (missingColumn) {
          // Fallback A: drop risky fields like location_name, but keep photo_urls, severity, resolution
          const trySelect = async (sel: string) => {
            let q = supabase
              .from('reports')
              .select(sel, { count: 'exact' })
              .eq('user_id', user.id)
              .order('created_at', { ascending: false })
              .range(from, to);
            if (where.status !== 'all') q = q.eq('status', where.status);
            if (where.category !== 'all') q = q.eq('category', where.category);
            if (where.q) q = q.ilike('title', `%${where.q}%`);
            return await q;
          };

          const selKeepPhotos = 'id,title,description,category,status,incident_date,created_at,user_id,latitude,longitude,photo_url,photo_urls,severity,resolution';
          let attempt = await trySelect(selKeepPhotos);
          if (attempt.error) {
            // Fallback B: minimal if even photo_urls not available
            attempt = await trySelect('id,title,description,category,status,incident_date,created_at,user_id,latitude,longitude,photo_url');
          }
          data = attempt.data as unknown[] | null;
          error = attempt.error as unknown as Error | null;
          count = attempt.count ?? 0;
          if (error) throw error;
          // Map to ReportRow with safe defaults for missing fields
          type PartialRow = Partial<Record<keyof ReportRow, unknown>> & {
            id: string;
            created_at: string;
            user_id: string;
            latitude: number | string;
            longitude: number | string;
          };
          const mapped = (data || []).map((r) => {
            const rr = r as PartialRow;
            const row: ReportRow = {
              id: rr.id,
              title: (rr.title as string) ?? null,
              description: (rr.description as string) ?? null,
              category: (rr.category as string) ?? null,
              status: (rr.status as string) ?? null,
              incident_date: (rr.incident_date as string) ?? null,
              created_at: rr.created_at,
              user_id: rr.user_id,
              latitude: typeof rr.latitude === 'string' ? Number(rr.latitude) : (rr.latitude as number),
              longitude: typeof rr.longitude === 'string' ? Number(rr.longitude) : (rr.longitude as number),
              location_name: null,
              photo_url: (rr.photo_url as string) ?? null,
              photo_urls: (rr.photo_urls as string[] | null | undefined) ?? null,
              severity: (rr.severity as ReportRow['severity']) ?? null,
              resolution: (rr.resolution as string | null | undefined) ?? null,
            };
            return row;
          });
          setRows(mapped);
          setTotal(count ?? 0);
          return;
        }
        throw error;
      }
      setRows((data ?? []) as ReportRow[]);
      setTotal(count ?? 0);
    } catch (e: unknown) {
      const msg = e && typeof e === 'object' && 'message' in e ? String((e as { message?: string }).message) : undefined;
      setError(msg ?? 'Gagal memuat laporan');
    } finally {
      setLoading(false);
    }
  }, [user, page, where.status, where.category, where.q]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Realtime sync for user's reports
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('myreports-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reports', filter: `user_id=eq.${user.id}` },
        () => { void loadData(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, loadData]);

  const resetFilters = () => {
    setStatus('all');
    setCategory('all');
    setQ('');
    setPage(1);
  };

  const refetch = () => { void loadData(); };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Laporan Saya</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={refetch}>
            <RefreshCw className="w-4 h-4 mr-2" /> Muat Ulang
          </Button>
        </div>
      </div>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Filter</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="space-y-1">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
              <SelectTrigger>
                <SelectValue placeholder="Semua status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua status</SelectItem>
                {Object.entries(statusLabels).map(([val, label]) => (
                  <SelectItem key={val} value={val}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Kategori</Label>
            <Select value={category} onValueChange={(v) => { setCategory(v); setPage(1); }}>
              <SelectTrigger>
                <SelectValue placeholder="Semua kategori" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua kategori</SelectItem>
                {Object.entries(categoryLabels).map(([val, label]) => (
                  <SelectItem key={val} value={val}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label>Cari Judul</Label>
            <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Ketik judul laporan..." />
          </div>
          <div className="md:col-span-4 flex gap-2 justify-end">
            <Button variant="outline" onClick={resetFilters}>Reset</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Laporan</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="text-sm text-red-600 dark:text-red-400">{error}</div>
          ) : rows.length === 0 ? (
            <EmptyState
              title="Belum ada laporan"
              description="Buat laporan pertama Anda untuk mulai memantau perbaikan."
              action={{ label: 'Buat Laporan', onClick: () => navigate('/report') }}
              secondaryAction={{ label: 'Lihat Peta', onClick: () => navigate('/map') }}
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Judul</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tanggal Kejadian</TableHead>
                    <TableHead>Dibuat</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="max-w-[20rem]">
                        <div className="font-medium line-clamp-2">{r.title ?? 'Tanpa judul'}</div>
                        {r.description && <div className="text-xs text-muted-foreground line-clamp-1">{r.description}</div>}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{categoryLabels[r.category ?? ''] ?? r.category ?? '-'}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge>{statusLabels[r.status ?? ''] ?? r.status ?? '-'}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <CalendarDays className="w-4 h-4" />
                          {r.incident_date ? new Date(r.incident_date).toLocaleDateString() : '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <CalendarDays className="w-4 h-4" />
                          {new Date(r.created_at).toLocaleString()}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" onClick={() => setSelectedReport(r)}>
                          <MapPin className="w-4 h-4 mr-2" /> Detail
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {pageCount > 1 && (
            <div className="mt-4">
              <Pagination>
                <PaginationContent>
                  {Array.from({ length: pageCount }).map((_, i) => {
                    const p = i + 1;
                    return (
                      <PaginationItem key={p}>
                        <PaginationLink href="#" isActive={p === page} onClick={(e) => { e.preventDefault(); setPage(p); }}>{p}</PaginationLink>
                      </PaginationItem>
                    );
                  })}
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Floating detail card, sama seperti MapView */}
      {selectedReport && (
        <div
          className={`fixed z-[1300] flex justify-center items-end md:items-start inset-0 pointer-events-none`}
        >
          <div
            className={
              `pointer-events-auto w-full max-w-[42rem] bg-background/95 rounded-xl shadow-lg border border-border/70 ` +
              (window.innerWidth < 768
                ? 'mx-2 mb-20' // mobile: margin horizontal dan bawah
                : 'mt-28 ml-4') // desktop: margin atas dan kiri
            }
            style={{
              minHeight: window.innerWidth < 700 ? 'calc(100dvh - 120px)' : 'auto',
              maxHeight: 'calc(100dvh - 32px)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <ReportDetailDrawer
              report={selectedReport}
              onClose={() => setSelectedReport(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
