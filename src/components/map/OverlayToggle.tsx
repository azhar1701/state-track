import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Layers, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface MapOverlays {
  adminBoundaries: boolean;
  irrigation: boolean;
  floodZones: boolean;
}

interface OverlayToggleProps {
  overlays: MapOverlays;
  onOverlayChange: (overlays: MapOverlays) => void;
  onClose?: () => void;
}

export const OverlayToggle = ({ overlays, onOverlayChange, onClose }: OverlayToggleProps) => {
  const [localOverlays, setLocalOverlays] = useState<MapOverlays>(overlays);

  const handleToggle = (key: keyof MapOverlays, value: boolean) => {
    const newOverlays = {
      ...localOverlays,
      [key]: value,
    };
    setLocalOverlays(newOverlays);
    onOverlayChange(newOverlays);
  };

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

        <div className="flex items-center justify-between">
          <Label htmlFor="irrigation" className="text-sm">
            Irigasi
          </Label>
          <Switch
            id="irrigation"
            checked={localOverlays.irrigation}
            onCheckedChange={(checked) => handleToggle('irrigation', checked)}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="flood-zones" className="text-sm">
            Zona Banjir
          </Label>
          <Switch
            id="flood-zones"
            checked={localOverlays.floodZones}
            onCheckedChange={(checked) => handleToggle('floodZones', checked)}
          />
        </div>
      </CardContent>
    </Card>
  );
};
