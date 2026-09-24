import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { X, Filter, Loader2, Plus } from 'lucide-react';
import { supabase } from '@/services/client';
import { useAuth } from '@/features/auth/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

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
 irigasi: 'Irigasi',
 sungai: 'Sungai',
 lainnya: 'Lainnya',
} as const;

const statusLabels = {
 baru: 'Baru',
 diproses: 'Diproses',
 selesai: 'Selesai',
};

export const FilterPanel = ({ filters, onFilterChange, onClose }: FilterPanelProps) => {
  const isMobileOrTablet = useIsMobile(1024);
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
    <>
      {/* Interactive Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/30 backdrop-blur-xs z-[1190] pointer-events-auto"
        aria-hidden="true"
      />

      <motion.div
        initial={isMobileOrTablet ? { y: "100%" } : { x: "100%" }}
        animate={isMobileOrTablet ? { y: 0 } : { x: 0 }}
        exit={isMobileOrTablet ? { y: "100%" } : { x: "100%" }}
        transition={{ type: "spring", damping: 26, stiffness: 220 }}
        className={cn(
          "fixed z-[1200] bg-popover/95 backdrop-blur-xl border-border shadow-lifted pointer-events-auto flex flex-col",
          "max-lg:bottom-0 max-lg:left-0 max-lg:right-0 max-lg:rounded-t-3xl max-lg:max-h-[85dvh] max-lg:border-t max-lg:pb-safe",
          "lg:top-0 lg:right-0 lg:h-full lg:w-96 lg:border-l lg:rounded-none overflow-y-auto"
        )}
      >
        {/* Mobile Drag Handle */}
        <div className="lg:hidden flex justify-center py-2.5 cursor-grab touch-none" onClick={onClose}>
          <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full" />
        </div>
 <div className="sticky top-0 bg-background/80 backdrop-blur-md border-b border-border/80 px-6 py-4 flex items-center justify-between z-10">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
 <Filter className="w-5 h-5" />
 </div>
 <div>
 <h2 className="text-lg font-bold tracking-tight">Filter Laporan</h2>
 <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Geospatial Analysis</p>
 </div>
 </div>
 {onClose && (
 <Button variant="ghost" size="icon" onClick={onClose} className="rounded-xl h-10 w-10 hover:bg-muted/60">
 <X className="w-5 h-5" />
 </Button>
 )}
 </div>

 <div className="p-6 space-y-8 flex-1">
 {user && (
 <div className="space-y-4">
 <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Preset Tersimpan</Label>
 <div className="bg-card/70 border border-border/70 rounded-2xl p-2.5">
 {loadingPresets ? (
 <div className="p-4 text-center">
 <Loader2 className="w-5 h-5 animate-spin mx-auto text-primary" />
 <p className="text-xs text-muted-foreground mt-2">Memuat preset…</p>
 </div>
 ) : presets.length === 0 ? (
 <div className="p-4 text-center">
 <p className="text-xs text-muted-foreground italic">Belum ada preset tersimpan</p>
 </div>
 ) : (
 <div className="space-y-1.5">
 <AnimatePresence mode="popLayout">
 {presets.map((p, idx) => (
 <motion.div key={p.id}
 initial={{ opacity: 0, x: 20 }}
 animate={{ opacity: 1, x: 0 }}
 exit={{ opacity: 0, x: -20 }}
 transition={{ delay: idx * 0.05 }}
 className="flex items-center justify-between gap-2 p-1 group"
 >
 <Button variant="ghost" size="sm" onClick={() => applyPreset(p.id)} className="flex-1 text-left justify-start h-10 px-3 rounded-xl hover:bg-muted/50 border border-transparent hover:border-border/60 transition-all"
 >
 <span className="text-sm font-medium truncate">{p.name}</span>
 </Button>
 <Button variant="ghost" size="icon" onClick={() => deletePreset(p.id)}
 className="h-9 w-9 rounded-xl text-muted-foreground hover:text-destructive hover:bg-muted/50 transition-colors opacity-0 group-hover:opacity-100"
 >
 <X className="w-4 h-4" />
 </Button>
 </motion.div>
 ))}
 </AnimatePresence>
 </div>
 )}
 </div>
 <div className="flex items-center gap-2 pt-2">
 <Input placeholder="Nama preset baru..." value={presetName} onChange={(e) => setPresetName(e.target.value)} className="h-10 bg-muted/30 border border-border/70 rounded-xl focus:bg-background transition-colors text-sm"
 />
 <Button onClick={savePreset} size="icon" className="h-10 w-10 shrink-0 rounded-xl shadow-lg shadow-primary/20">
 <Plus className="w-4 h-4" />
 </Button>
 </div>
 </div>
 )}

 <div className="space-y-6">
 <div className="space-y-3">
 <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Parameter Utama</Label>
 <div className="space-y-4 bg-card/70 border border-border/70 rounded-2xl p-5">
 <div className="space-y-2.5">
 <Label className="text-sm font-medium">Kategori</Label>
 <Select
 value={localFilters.category || 'all'}
 onValueChange={(value) => updateFilter('category', value === 'all' ? undefined : value)}
 >
 <SelectTrigger className="h-11 bg-muted/30 border border-border/70 rounded-xl focus:bg-background transition-colors">
 <SelectValue placeholder="Semua kategori" />
 </SelectTrigger>
 <SelectContent className="bg-popover border border-border shadow-lg rounded-xl">
 <SelectItem value="all">Semua kategori</SelectItem>
 {Object.entries(categoryLabels)
 .map(([value, label]) => (
 <SelectItem key={value} value={value}>{label}</SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>

 <div className="space-y-2.5">
 <Label className="text-sm font-medium">Status</Label>
 <Select
 value={localFilters.status || 'all'}
 onValueChange={(value) => updateFilter('status', value === 'all' ? undefined : value)}
 >
 <SelectTrigger className="h-11 bg-muted/30 border border-border/70 rounded-xl focus:bg-background transition-colors">
 <SelectValue placeholder="Semua status" />
 </SelectTrigger>
 <SelectContent className="bg-popover border border-border shadow-lg rounded-xl">
 <SelectItem value="all">Semua status</SelectItem>
 {Object.entries(statusLabels).map(([value, label]) => (
 <SelectItem key={value} value={value}>{label}</SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 </div>
 </div>

 <div className="space-y-3">
 <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Rentang Waktu</Label>
 <div className="grid grid-cols-2 gap-3 bg-card/70 border border-border/70 rounded-2xl p-5">
 <div className="space-y-2.5">
 <Label className="text-xs font-semibold">Mulai</Label>
 <Input
 type="date"
 value={localFilters.dateFrom || ''}
 onChange={(e) => updateFilter('dateFrom', e.target.value)}
 className="h-10 bg-muted/30 border border-border/70 rounded-xl text-xs"
 />
 </div>
 <div className="space-y-2.5">
 <Label className="text-xs font-semibold">Akhir</Label>
 <Input
 type="date"
 value={localFilters.dateTo || ''}
 onChange={(e) => updateFilter('dateTo', e.target.value)}
 className="h-10 bg-muted/30 border border-border/70 rounded-xl text-xs"
 />
 </div>
 </div>
 </div>
 </div>
 </div>

 <div className="sticky bottom-0 bg-background/80 backdrop-blur-md border-t border-border/80 p-5 flex gap-3 z-10">
 <Button variant="outline" onClick={handleReset} className="flex-1 h-11 rounded-xl hover:bg-muted/60 transition-all font-semibold"
 >
 Reset
 </Button>
 <Button onClick={handleApply} className="flex-1 h-11 bg-primary hover:bg-primary-hover text-primary-foreground rounded-xl shadow-md transition-all font-bold"
 >
 Terapkan
 </Button>
 </div>
 </motion.div>
    </>
  );
};
