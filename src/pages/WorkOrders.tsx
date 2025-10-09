import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';

interface WorkOrder {
  id: string;
  title: string;
  description: string | null;
  asset_id: string | null;
  created_by: string;
  assigned_to: string | null;
  status: 'baru' | 'dalam_proses' | 'selesai' | 'ditutup';
  priority: 'rendah' | 'sedang' | 'tinggi' | 'kritikal';
  due_date: string | null;
  created_at: string;
}

export default function WorkOrders() {
  const { user } = useAuth();
  const [rows, setRows] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<'all' | WorkOrder['status']>('all');
  const [priority, setPriority] = useState<'all' | WorkOrder['priority']>('all');

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    let query = supabase
      .from('work_orders')
      .select('*')
      .or(`created_by.eq.${user.id},assigned_to.eq.${user.id}`)
      .order('created_at', { ascending: false });
    if (status !== 'all') query = query.eq('status', status);
    if (priority !== 'all') query = query.eq('priority', priority);
    const { data, error } = await query;
    setLoading(false);
    if (error) return toast.error('Gagal memuat WO');
    const list = (data ?? []) as WorkOrder[];
    setRows(q ? list.filter((r) => r.title.toLowerCase().includes(q.toLowerCase())) : list);
  }, [user, q, status, priority]);

  useEffect(() => { void load(); }, [load]);

  const createWO = async () => {
    if (!user) return toast.error('Harap login');
    const title = prompt('Judul WO');
    if (!title) return;
    const { error } = await supabase.from('work_orders').insert({ title, created_by: user.id });
    if (error) return toast.error('Gagal membuat WO');
    toast.success('Work Order dibuat');
    void load();
  };

  const updateWO = async (id: string, patch: Partial<Pick<WorkOrder, 'status' | 'priority'>>) => {
    const { error } = await supabase.from('work_orders').update(patch).eq('id', id);
    if (error) return toast.error('Gagal memperbarui WO');
    void load();
  };

  const setStatusTyped = (v: 'all' | WorkOrder['status']) => setStatus(v);
  const setPriorityTyped = (v: 'all' | WorkOrder['priority']) => setPriority(v);

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Work Orders</h1>
        <Button onClick={createWO}>Buat WO</Button>
      </div>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Filter</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatusTyped(v as 'all' | WorkOrder['status'])}>
              <SelectTrigger><SelectValue placeholder="Semua status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua</SelectItem>
                <SelectItem value="baru">Baru</SelectItem>
                <SelectItem value="dalam_proses">Dalam Proses</SelectItem>
                <SelectItem value="selesai">Selesai</SelectItem>
                <SelectItem value="ditutup">Ditutup</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Prioritas</Label>
            <Select value={priority} onValueChange={(v) => setPriorityTyped(v as 'all' | WorkOrder['priority'])}>
              <SelectTrigger><SelectValue placeholder="Semua prioritas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua</SelectItem>
                <SelectItem value="rendah">Rendah</SelectItem>
                <SelectItem value="sedang">Sedang</SelectItem>
                <SelectItem value="tinggi">Tinggi</SelectItem>
                <SelectItem value="kritikal">Kritikal</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2">
            <Label>Cari</Label>
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari judul..." />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daftar WO</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Judul</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Prioritas</TableHead>
                  <TableHead>Dibuat</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.title}</TableCell>
                    <TableCell>{r.status}</TableCell>
                    <TableCell>{r.priority}</TableCell>
                    <TableCell>{new Date(r.created_at).toLocaleString()}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button size="sm" variant="outline" onClick={() => updateWO(r.id, { status: 'dalam_proses' })}>Proses</Button>
                      <Button size="sm" variant="outline" onClick={() => updateWO(r.id, { status: 'selesai' })}>Selesai</Button>
                      <Button size="sm" variant="outline" onClick={() => updateWO(r.id, { priority: 'tinggi' })}>Naikkan Prioritas</Button>
                    </TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-sm text-muted-foreground">Tidak ada WO</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
