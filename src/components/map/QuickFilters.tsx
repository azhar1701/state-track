import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

interface QuickFilter {
  id: string;
  label: string;
  value: string;
  type: 'category' | 'status' | 'severity';
}

interface QuickFiltersProps {
  activeFilters: QuickFilter[];
  onRemove: (id: string) => void;
  onClear: () => void;
}

export const QuickFilters = ({ activeFilters, onRemove, onClear }: QuickFiltersProps) => {
  if (activeFilters.length === 0) return null;

  const colorMap = {
    category: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    status: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    severity: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  };

  return (
    <div className="glass-panel p-3 rounded-xl shadow-float animate-in slide-in-from-top-4">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-medium text-muted-foreground">Filter Aktif:</span>
        {activeFilters.map((filter) => (
          <Badge
            key={filter.id}
            className={`${colorMap[filter.type]} gap-1 btn-haptic`}
          >
            {filter.label}
            <button
              onClick={() => onRemove(filter.id)}
              className="hover:bg-black/10 rounded-full p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          </Badge>
        ))}
        <button
          onClick={onClear}
          className="text-xs text-muted-foreground hover:text-foreground underline"
        >
          Hapus Semua
        </button>
      </div>
    </div>
  );
};
