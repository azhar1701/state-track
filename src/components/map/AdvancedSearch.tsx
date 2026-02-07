import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Search, X, Clock, MapPin, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface SearchResult {
  id: string;
  title: string;
  category: string;
  location: string;
  lat: number;
  lng: number;
}

interface AdvancedSearchProps {
  onSelect: (lat: number, lng: number, label: string) => void;
  onClose: () => void;
}

export const AdvancedSearch = ({ onSelect, onClose }: AdvancedSearchProps) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [popularSearches] = useState(['Sungai Citanduy', 'Irigasi Ciamis', 'Jembatan Rusak']);

  useEffect(() => {
    const recent = JSON.parse(localStorage.getItem('recent-searches') || '[]');
    setRecentSearches(recent.slice(0, 5));
  }, []);

  const saveSearch = (search: string) => {
    const recent = JSON.parse(localStorage.getItem('recent-searches') || '[]');
    const updated = [search, ...recent.filter((s: string) => s !== search)].slice(0, 10);
    localStorage.setItem('recent-searches', JSON.stringify(updated));
    setRecentSearches(updated.slice(0, 5));
  };

  const clearRecent = () => {
    localStorage.removeItem('recent-searches');
    setRecentSearches([]);
  };

  return (
    <Card className="glass-panel shadow-lifted p-4 space-y-4 animate-in slide-in-from-top-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari lokasi, laporan, atau kategori..."
            className="pl-10 pr-10"
            autoFocus
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="btn-haptic">
          <X className="w-4 h-4" />
        </Button>
      </div>

      {!query && recentSearches.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Clock className="w-4 h-4" />
              Pencarian Terakhir
            </div>
            <button
              onClick={clearRecent}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Hapus
            </button>
          </div>
          <div className="space-y-1">
            {recentSearches.map((search, i) => (
              <button
                key={i}
                onClick={() => setQuery(search)}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted/50 text-sm transition-colors"
              >
                {search}
              </button>
            ))}
          </div>
        </div>
      )}

      {!query && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <TrendingUp className="w-4 h-4" />
            Pencarian Populer
          </div>
          <div className="flex flex-wrap gap-2">
            {popularSearches.map((search, i) => (
              <Badge
                key={i}
                variant="secondary"
                className="cursor-pointer btn-haptic"
                onClick={() => setQuery(search)}
              >
                {search}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {query && results.length > 0 && (
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {results.map((result) => (
            <button
              key={result.id}
              onClick={() => {
                onSelect(result.lat, result.lng, result.title);
                saveSearch(result.title);
                onClose();
              }}
              className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{result.title}</div>
                  <div className="text-xs text-muted-foreground truncate">{result.location}</div>
                  <Badge variant="outline" className="text-[10px] mt-1">
                    {result.category}
                  </Badge>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </Card>
  );
};
