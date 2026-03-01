import { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Layers, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface MapOverlays {
  adminBoundaries: boolean;
  clustering?: boolean;
  heatmap?: boolean;
  dynamic?: Record<string, boolean>;
}

interface OverlayToggleProps {
  overlays: MapOverlays;
  onOverlayChange: (overlays: MapOverlays) => void;
  onClose?: () => void;
  availableLayers?: Array<{ key: string; name: string }>;
}

export const OverlayToggle = ({ overlays, onOverlayChange, onClose, availableLayers }: OverlayToggleProps) => {
  const [localOverlays, setLocalOverlays] = useState<MapOverlays>(overlays);

  const handleToggle = (key: keyof MapOverlays, value: boolean) => {
    const newOverlays = {
      ...localOverlays,
      [key]: value,
    };
    setLocalOverlays(newOverlays);
    onOverlayChange(newOverlays);
  };

  const dyn = localOverlays.dynamic || {};

  return (
    <div className="fixed inset-y-0 right-0 z-[1200] w-80 glass-sidebar shadow-lifted pointer-events-auto overflow-y-auto border-l">
      <div className="sticky top-0 glass-panel backdrop-blur-sm border-b px-4 py-3 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5" />
          <h2 className="text-lg font-semibold">Layer Overlay</h2>
        </div>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between py-2">
          <Label htmlFor="admin-boundaries" className="text-sm font-medium">
            Batas Administratif
          </Label>
          <Switch
            id="admin-boundaries"
            checked={localOverlays.adminBoundaries}
            onCheckedChange={(checked) => handleToggle('adminBoundaries', checked)}
          />
        </div>

        {availableLayers && availableLayers.length > 0 && (
          <div className="space-y-3 pt-2 border-t">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Layer Geospasial</div>
            {availableLayers.map((l) => (
              <div key={l.key} className="flex items-center justify-between py-2">
                <Label htmlFor={`dyn-${l.key}`} className="text-sm font-medium">
                  {l.name}
                </Label>
                <Switch
                  id={`dyn-${l.key}`}
                  checked={Boolean(dyn[l.key])}
                  onCheckedChange={(checked) => {
                    const newDyn = { ...(localOverlays.dynamic || {}) };
                    newDyn[l.key] = checked;
                    const newOverlays = { ...localOverlays, dynamic: newDyn };
                    setLocalOverlays(newOverlays);
                    onOverlayChange(newOverlays);
                  }}
                />
              </div>
            ))}
          </div>
        )}

        <div className="space-y-3 pt-2 border-t">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Visualisasi</div>
          <div className="flex items-center justify-between py-2">
            <Label htmlFor="clustering" className="text-sm font-medium">
              Cluster Marker
            </Label>
            <Switch
              id="clustering"
              checked={Boolean(localOverlays.clustering)}
              onCheckedChange={(checked) => handleToggle('clustering', checked)}
            />
          </div>

          <div className="flex items-center justify-between py-2">
            <Label htmlFor="heatmap" className="text-sm font-medium">
              Heatmap Kepadatan
            </Label>
            <Switch
              id="heatmap"
              checked={Boolean(localOverlays.heatmap)}
              onCheckedChange={(checked) => handleToggle('heatmap', checked)}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
