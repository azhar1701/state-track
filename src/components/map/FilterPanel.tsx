import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { X, Filter } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface MapFilters {
  category?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}

interface FilterPanelProps {
  filters: MapFilters;
  onFilterChange: (filters: MapFilters) => void;
  onClose?: () => void;
}

const categoryLabels = {
  jalan: 'Jalan',
  jembatan: 'Jembatan',
  irigasi: 'Irigasi',
  drainase: 'Drainase',
  sungai: 'Sungai',
  lainnya: 'Lainnya',
} as const;

const statusLabels = {
  baru: 'Baru',
  diproses: 'Diproses',
  selesai: 'Selesai',
};

export const FilterPanel = ({ filters, onFilterChange, onClose }: FilterPanelProps) => {
  const { user } = useAuth();
  const [localFilters, setLocalFilters] = useState<MapFilters>(filters);
  const [presets, setPresets] = useState<Array<{ id: string; name: string; filters: MapFilters }>>([]);
  const [presetName, setPresetName] = useState('');
  const [loadingPresets, setLoadingPresets] = useState(false);

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  useEffect(() => {
    if (!user) return;
    const localKey = `filter_presets:${user.id}`;
    const load = async () => {
      try {
        setLoadingPresets(true);
        const { data, error } = await supabase
          .from('filter_presets')
          .select('id,name,filters')
          .eq('user_id', user.id)
          .order('name');
        if (!error && data) {
          const rows = (data ?? []) as Array<{ id: string; name: string; filters: MapFilters | null }>;
          const mapped = rows.map((r) => ({ id: r.id, name: r.name, filters: r.filters ?? {} }));
          setPresets(mapped);
          try { localStorage.setItem(localKey, JSON.stringify(mapped)); } catch { /* ignore */ }
          return;
        }
      } catch {
        // ignore
      } finally {
        setLoadingPresets(false);
      }
      // fallback to local presets if remote fails
      try {
        const raw = localStorage.getItem(localKey);
        if (raw) {
          const parsed = JSON.parse(raw) as Array<{ id: string; name: string; filters: MapFilters }>;
          setPresets(parsed);
        }
      } catch {
        // ignore local fallback errors
      }
    };
    void load();
  }, [user]);

  const handleApply = () => {
    onFilterChange(localFilters);
  };

  const handleReset = () => {
    const emptyFilters: MapFilters = {};
    setLocalFilters(emptyFilters);
    onFilterChange(emptyFilters);
  };

  const updateFilter = (key: keyof MapFilters, value: string | undefined) => {
    setLocalFilters((prev) => ({
      ...prev,
      [key]: value || undefined,
    }));
  };

  const savePreset = async () => {
    if (!user) return;
    const name = presetName.trim();
    if (!name) return;
    const payload = { user_id: user.id, name, filters: localFilters } as unknown as Record<string, unknown>;
    // Upsert to avoid duplicate names per user
    const { data, error } = await supabase
      .from('filter_presets')
      .upsert(payload, { onConflict: 'user_id,name' })
      .select('id,name,filters')
      .single();
    if (!error && data) {
      const row = data as { id: string; name: string; filters: MapFilters | null };
      const next = { id: row.id, name: row.name, filters: row.filters ?? {} };
      setPresets((prev) => {
        const exists = prev.some((p) => p.name === next.name);
        const updated = exists ? prev.map((p) => (p.name === next.name ? next : p)) : [...prev, next];
        try { localStorage.setItem(`filter_presets:${user.id}`, JSON.stringify(updated)); } catch { /* ignore */ }
        return updated;
      });
      setPresetName('');
      return;
    }
    // fallback: local only
    const next = { id: `${Date.now()}`, name, filters: localFilters };
    setPresets((prev) => {
      const exists = prev.some((p) => p.name === next.name);
      const updated = exists ? prev.map((p) => (p.name === next.name ? next : p)) : [...prev, next];
      try { localStorage.setItem(`filter_presets:${user.id}`, JSON.stringify(updated)); } catch { /* ignore */ }
      return updated;
    });
    setPresetName('');
  };

  const applyPreset = (id: string) => {
    const p = presets.find((x) => x.id === id);
    if (!p) return;
    setLocalFilters(p.filters);
    onFilterChange(p.filters);
  };

  const deletePreset = async (id: string) => {
    if (!user) return;
  try { await supabase.from('filter_presets').delete().eq('id', id).eq('user_id', user.id); } catch { /* ignore */ }
    setPresets((prev) => prev.filter((x) => x.id !== id));
  try { localStorage.setItem(`filter_presets:${user.id}`, JSON.stringify(presets.filter((x) => x.id !== id))); } catch { /* ignore */ }
  };

  return (
    <Card className="w-80 shadow-xl">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5" />
          <CardTitle className="text-lg">Filter Laporan</CardTitle>
        </div>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {user && (
          <div className="space-y-2">
            <Label>Preset Tersimpan</Label>
            {loadingPresets ? (
              <div className="text-sm text-muted-foreground">Memuat preset…</div>
            ) : presets.length === 0 ? (
              <div className="text-sm text-muted-foreground">Belum ada preset</div>
            ) : (
              <div className="space-y-2">
                {presets.map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-2">
                    <Button variant="outline" size="sm" onClick={() => applyPreset(p.id)} className="flex-1 text-left justify-start">
                      {p.name}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => deletePreset(p.id)}>Hapus</Button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2">
              <Input placeholder="Nama preset" value={presetName} onChange={(e) => setPresetName(e.target.value)} />
              <Button onClick={savePreset}>Simpan</Button>
            </div>
          </div>
        )}
        <div className="space-y-2">
          <Label>Kategori</Label>
          <Select
            value={localFilters.category || 'all'}
            onValueChange={(value) => updateFilter('category', value === 'all' ? undefined : value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Semua kategori" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua kategori</SelectItem>
              {Object.entries(categoryLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Status</Label>
          <Select
            value={localFilters.status || 'all'}
            onValueChange={(value) => updateFilter('status', value === 'all' ? undefined : value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Semua status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua status</SelectItem>
              {Object.entries(statusLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Tanggal Mulai</Label>
          <Input
            type="date"
            value={localFilters.dateFrom || ''}
            onChange={(e) => updateFilter('dateFrom', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Tanggal Akhir</Label>
          <Input
            type="date"
            value={localFilters.dateTo || ''}
            onChange={(e) => updateFilter('dateTo', e.target.value)}
          />
        </div>

        <div className="flex gap-2 pt-4">
          <Button variant="outline" onClick={handleReset} className="flex-1">
            Reset
          </Button>
          <Button onClick={handleApply} className="flex-1">
            Terapkan
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
