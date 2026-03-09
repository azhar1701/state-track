import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Search, X, MapPin } from 'lucide-react';
import { geocodeAddress, type GeocodingResult, formatAddress } from '@/features/map/geocoding';

interface MapSearchProps {
 onSelect: (lat: number, lon: number, label: string) => void;
 onClose?: () => void;
}

export const MapSearch = ({ onSelect, onClose }: MapSearchProps) => {
 const [query, setQuery] = useState('');
 const [loading, setLoading] = useState(false);
 const [results, setResults] = useState<GeocodingResult[]>([]);

 useEffect(() => {
 if (!query.trim()) {
 setResults([]);
 setLoading(false);
 return;
 }
 setLoading(true);
 const t = setTimeout(async () => {
 const data = await geocodeAddress(query.trim());
 setResults(data);
 setLoading(false);
 }, 400);
 return () => {
 clearTimeout(t);
 };
 }, [query]);

 const handleSelect = (r: GeocodingResult) => {
 onSelect(r.lat, r.lon, formatAddress(r));
 setQuery('');
 setResults([]);
 onClose?.();
 };

 return (
 <motion.div initial={{ opacity: 0, scale: 0.95, y: -20 }}
 animate={{ opacity: 1, scale: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.95, y: -20 }}
 className="bg-popover/95 border-border shadow-lg shadow-lg p-4 w-full max-w-md rounded-2xl border border-border"
 >
 <div className="flex items-center gap-2 mb-3">
 <div className="relative flex-1">
 <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
 <Input
 value={query}
 onChange={(e) => setQuery(e.target.value)}
 placeholder="Cari lokasi, alamat, atau tempat..."
 className="pl-9 pr-9 h-10 bg-card border-border shadow-sm border-border rounded-xl"
 autoFocus
 />
 {loading && (
 <Loader2 className="w-4 h-4 animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
 )}
 {query && !loading && (
 <button
 onClick={() => {
 setQuery('');
 setResults([]);
 }}
 className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
 >
 <X className="w-4 h-4" />
 </button>
 )}
 </div>
 {onClose && (
 <Button variant="ghost" size="icon" onClick={onClose} className="rounded-xl">
 <X className="w-4 h-4" />
 </Button>
 )}
 </div>

 {loading && (
 <div className="space-y-2">
 {[1, 2, 3].map((i) => (
 <motion.div key={i} initial={{ opacity: 0, x: -10 }}
 animate={{ opacity: 1, x: 0 }}
 transition={{ delay: i * 0.1 }}
 className="flex items-start gap-3 px-4 py-3 rounded-xl bg-card border-border shadow-sm animate-pulse"
 >
 <div className="w-4 h-4 mt-0.5 bg-white/10 rounded shrink-0" />
 <div className="flex-1 space-y-2">
 <div className="h-4 bg-white/10 rounded w-3/4" />
 <div className="h-3 bg-white/10 rounded w-1/2" />
 </div>
 </motion.div>
 ))}
 </div>
 )}

 <AnimatePresence>
 {!loading && results.length > 0 && (
 <motion.div initial={{ opacity: 0, height: 0 }}
 animate={{ opacity: 1, height: 'auto' }}
 className="space-y-1 max-h-80 overflow-y-auto mt-2"
 >
 {results.map((r, i) => (
 <motion.button
 key={i}
 initial={{ opacity: 0, x: -5 }}
 animate={{ opacity: 1, x: 0 }}
 transition={{ delay: i * 0.05 }}
 onClick={() => handleSelect(r)}
 className="w-full text-left px-4 py-3 rounded-xl hover:bg-card border-border shadow-sm transition-all flex items-start gap-3 border border-transparent hover:border-border group"
 >
 <div className="w-8 h-8 rounded-full bg-card border-border shadow-sm flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
 <MapPin className="w-4 h-4 text-primary" />
 </div>
 <div className="flex-1 min-w-0">
 <div className="text-sm font-medium truncate">{formatAddress(r)}</div>
 <div className="text-xs text-muted-foreground font-mono mt-0.5 opacity-70">
 {Number.isFinite(r.lat) && Number.isFinite(r.lon) ? `${r.lat.toFixed(6)}, ${r.lon.toFixed(6)}` : '—'}
 </div>
 </div>
 </motion.button>
 ))}
 </motion.div>
 )}
 </AnimatePresence>

 {!loading && query && results.length === 0 && (
 <div className="text-center py-6 text-sm text-muted-foreground">
 Tidak ada hasil ditemukan
 </div>
 )}
 </motion.div>
 );
};
