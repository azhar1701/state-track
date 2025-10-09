import { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';

interface RecentItem {
  id: string;
  title: string;
  status: 'baru' | 'diproses' | 'selesai' | string;
  severity?: 'ringan' | 'sedang' | 'berat' | null;
  location_name?: string | null;
  created_at: string;
}

function StatusPill({ s }: { s: RecentItem['status'] }) {
  const cls = s === 'selesai' ? 'bg-green-600 text-white' : s === 'diproses' ? 'bg-blue-600 text-white' : 'bg-amber-500 text-black';
  return <span className={`px-2 py-0.5 rounded text-[11px] ${cls}`}>{s}</span>;
}

function SevPill({ s }: { s?: RecentItem['severity'] }) {
  if (!s) return <span className="text-muted-foreground">-</span>;
  const cls = s === 'berat' ? 'bg-red-600 text-white' : s === 'sedang' ? 'bg-orange-500 text-white' : 'bg-slate-200 text-slate-900';
  return <span className={`px-2 py-0.5 rounded text-[11px] ${cls}`}>{s}</span>;
}

export default function RecentReports() {
  const [items, setItems] = useState<RecentItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!isSupabaseConfigured) { setItems([]); return; }
      const { data, error } = await supabase
        .from('reports')
        .select('id,title,status,severity,location_name,created_at')
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) { setError('Gagal memuat'); setItems([]); return; }
      setItems((data || []) as RecentItem[]);
    };
    void load();
  }, []);

  return (
    <div className="space-y-3 rounded-md border p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Laporan Terbaru</h3>
        <Link to="/map" className="text-sm text-primary hover:underline">Lihat semua</Link>
      </div>
      <div className="rounded-md border">
        {items === null ? (
          <div className="p-4 text-sm text-muted-foreground">Memuat…</div>
        ) : items.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground">Belum ada laporan.</div>
        ) : (
          <ul className="divide-y">
            {items.map((it) => (
              <li key={it.id} className="p-3 flex items-center justify-between gap-3">
                <div>
                  <div className="font-medium text-sm line-clamp-1">{it.title || '(tanpa judul)'}</div>
                  <div className="text-xs text-muted-foreground line-clamp-1">{it.location_name || '-'}</div>
                </div>
                <div className="flex items-center gap-2">
                  <SevPill s={it.severity} />
                  <StatusPill s={it.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
