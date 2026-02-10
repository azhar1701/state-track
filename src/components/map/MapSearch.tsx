import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Search, X, MapPin } from 'lucide-react';
import { geocodeAddress, type GeocodingResult, formatAddress } from '@/lib/geocoding';

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
    <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-white/20 rounded-xl shadow-xl p-4 w-full max-w-md">
      <div className="flex items-center gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari lokasi, alamat, atau tempat..."
            className="pl-9 pr-9 h-10"
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
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {loading && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-muted/30 animate-pulse">
              <div className="w-4 h-4 mt-0.5 bg-muted rounded shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="space-y-1 max-h-80 overflow-y-auto">
          {results.map((r, i) => (
            <button
              key={i}
              onClick={() => handleSelect(r)}
              className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors flex items-start gap-2"
            >
              <MapPin className="w-4 h-4 mt-0.5 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{formatAddress(r)}</div>
                <div className="text-xs text-muted-foreground font-mono mt-0.5">
                  {Number.isFinite(r.lat) && Number.isFinite(r.lon) ? `${r.lat.toFixed(6)}, ${r.lon.toFixed(6)}` : '—'}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {!loading && query && results.length === 0 && (
        <div className="text-center py-6 text-sm text-muted-foreground">
          Tidak ada hasil ditemukan
        </div>
      )}
    </div>
  );
};
