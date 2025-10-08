import { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Search, X } from 'lucide-react';
import { geocodeAddress, type GeocodingResult, formatAddress } from '@/lib/geocoding';

interface MapSearchProps {
  onSelect: (lat: number, lon: number, label: string) => void;
  onClose?: () => void;
}

export const MapSearch = ({ onSelect, onClose }: MapSearchProps) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<GeocodingResult[]>([]);
  const [open, setOpen] = useState(true);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setLoading(true);
      const data = await geocodeAddress(query.trim());
      setResults(data);
      setLoading(false);
      setOpen(true);
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const handleSelect = (r: GeocodingResult) => {
    setOpen(false);
    onSelect(r.lat, r.lon, formatAddress(r));
  };

  return (
    <div ref={ref} className="relative w-[320px]">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari tempat atau alamat..."
            className="pl-8"
          />
          {loading && (
            <Loader2 className="w-4 h-4 animate-spin absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
          )}
        </div>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>
      {open && results.length > 0 && (
        <Card className="absolute z-[1002] mt-2 w-full shadow-xl">
          <CardContent className="p-0">
            <ul className="max-h-64 overflow-auto">
              {results.map((r, i) => (
                <li key={i} className="px-3 py-2 hover:bg-muted cursor-pointer" onClick={() => handleSelect(r)}>
                  <div className="text-sm text-foreground">{formatAddress(r)}</div>
                  <div className="text-xs text-muted-foreground font-mono">
                    {Number.isFinite(r.lat) && Number.isFinite(r.lon) ? `${r.lat.toFixed(6)}, ${r.lon.toFixed(6)}` : '—'}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
