import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Layers, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface MapOverlays {
  adminBoundaries: boolean;
  clustering?: boolean;
  heatmap?: boolean;
  // dynamic layer toggles keyed by geo_layers.key
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
    <Card className="w-64 shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5" />
          <CardTitle className="text-sm">Layer Overlay</CardTitle>
        </div>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="admin-boundaries" className="text-sm">
            Batas Administratif
          </Label>
          <Switch
            id="admin-boundaries"
            checked={localOverlays.adminBoundaries}
            onCheckedChange={(checked) => handleToggle('adminBoundaries', checked)}
          />
        </div>

        {availableLayers && availableLayers.length > 0 && (
          <div className="space-y-3">
            {availableLayers.map((l) => (
              <div key={l.key} className="flex items-center justify-between">
                <Label htmlFor={`dyn-${l.key}`} className="text-sm">
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

        <div className="flex items-center justify-between">
          <Label htmlFor="clustering" className="text-sm">
            Cluster Marker
          </Label>
          <Switch
            id="clustering"
            checked={Boolean(localOverlays.clustering)}
            onCheckedChange={(checked) => handleToggle('clustering', checked)}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="heatmap" className="text-sm">
            Heatmap Kepadatan
          </Label>
          <Switch
            id="heatmap"
            checked={Boolean(localOverlays.heatmap)}
            onCheckedChange={(checked) => handleToggle('heatmap', checked)}
          />
        </div>
      </CardContent>
    </Card>
  );
};
