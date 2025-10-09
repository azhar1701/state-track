import { useEffect, useMemo, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface Ticket {
  id: string;
  user_id: string;
  subject: string;
  message: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  created_at: string;
}

const faqs = [
  { q: 'Bagaimana cara membuat laporan?', a: 'Buka menu Buat Laporan lalu isi formulir dan kirim.' },
  { q: 'Bagaimana cara melihat status laporan?', a: 'Buka halaman Laporan Saya untuk melihat status terkini.' },
  { q: 'Mengapa peta kosong?', a: 'Periksa koneksi internet, izinkan lokasi, atau segarkan halaman.' },
];

export default function HelpCenter() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);

  const filteredFaqs = useMemo(() => {
    const s = search.toLowerCase();
    return faqs.filter((f) => f.q.toLowerCase().includes(s) || f.a.toLowerCase().includes(s));
  }, [search]);

  const loadTickets = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('support_tickets')
      .select('id,user_id,subject,message,status,created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (error) return;
    setTickets((data ?? []) as Ticket[]);
  }, [user]);

  useEffect(() => { void loadTickets(); }, [loadTickets]);

  const submitTicket = async () => {
    if (!user) return toast.error('Harap login');
    if (!subject.trim() || !message.trim()) return toast.error('Lengkapi subjek dan pesan');
    setLoading(true);
    const { error } = await supabase.from('support_tickets').insert({ user_id: user.id, subject, message });
    setLoading(false);
    if (error) return toast.error('Gagal mengirim tiket');
    toast.success('Tiket terkirim');
    setSubject('');
    setMessage('');
    void loadTickets();
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-semibold mb-4">Help Center</h1>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Pertanyaan Umum</CardTitle>
        </CardHeader>
        <CardContent>
          <Input placeholder="Cari FAQ..." value={search} onChange={(e) => setSearch(e.target.value)} className="mb-3" />
          <div className="space-y-3">
            {filteredFaqs.map((f, i) => (
              <div key={i} className="border rounded p-3">
                <div className="font-medium">{f.q}</div>
                <div className="text-sm text-muted-foreground">{f.a}</div>
              </div>
            ))}
            {filteredFaqs.length === 0 && (
              <div className="text-sm text-muted-foreground">Tidak ada FAQ yang cocok</div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Buat Tiket Dukungan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Subjek</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Ringkas masalah Anda" />
            </div>
            <div>
              <Label>Pesan</Label>
              <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Jelaskan masalah secara detail" rows={5} />
            </div>
            <Button onClick={submitTicket} disabled={loading}>{loading ? 'Mengirim...' : 'Kirim Tiket'}</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tiket Saya</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subjek</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Dibuat</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tickets.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell>{t.subject}</TableCell>
                      <TableCell><Badge variant={t.status === 'open' ? 'default' : 'secondary'}>{t.status}</Badge></TableCell>
                      <TableCell>{new Date(t.created_at).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                  {tickets.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-sm text-muted-foreground">Belum ada tiket</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
