import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

interface Shortcut {
  keys: string[];
  description: string;
  category: string;
}

export const KeyboardShortcuts = () => {
  const [visible, setVisible] = useState(false);

  const shortcuts: Shortcut[] = [
    { keys: ['Ctrl', 'K'], description: 'Buka Command Menu', category: 'Navigasi' },
    { keys: ['Ctrl', 'M'], description: 'Buka Peta', category: 'Navigasi' },
    { keys: ['Ctrl', 'N'], description: 'Laporan Baru', category: 'Aksi' },
    { keys: ['Ctrl', 'F'], description: 'Cari', category: 'Aksi' },
    { keys: ['Esc'], description: 'Tutup Dialog', category: 'Umum' },
    { keys: ['?'], description: 'Tampilkan Shortcut', category: 'Umum' },
  ];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setVisible((v) => !v);
      }
      if (e.key === 'Escape' && visible) {
        setVisible(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visible]);

  if (!visible) return null;

  const categories = Array.from(new Set(shortcuts.map((s) => s.category)));

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 animate-in fade-in">
      <Card className="max-w-2xl w-full bg-card border-border shadow-sm shadow-lifted p-6 animate-in slide-in-from-bottom-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Keyboard Shortcuts</h2>
          <button
            onClick={() => setVisible(false)}
            className="p-1 hover:bg-muted rounded-full btn-haptic focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6">
          {categories.map((category) => (
            <div key={category}>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                {category}
              </h3>
              <div className="space-y-2">
                {shortcuts
                  .filter((s) => s.category === category)
                  .map((shortcut, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <span className="text-sm">{shortcut.description}</span>
                      <div className="flex items-center gap-1">
                        {shortcut.keys.map((key, j) => (
                          <Badge
                            key={j}
                            variant="outline"
                            className="font-mono text-xs px-2 py-1"
                          >
                            {key}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-6 border-t text-center text-sm text-muted-foreground">
          Tekan <Badge variant="outline" className="font-mono mx-1">?</Badge> untuk
          menampilkan shortcut ini kapan saja
        </div>
      </Card>
    </div>
  );
};
