import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { LayerStyleConfig } from '@/hooks/useMapLayers';

interface StyleEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialStyle: LayerStyleConfig;
  onSave: (style: LayerStyleConfig) => void;
}

export const StyleEditor = ({ open, onOpenChange, initialStyle, onSave }: StyleEditorProps) => {
  const [style, setStyle] = useState<LayerStyleConfig>(initialStyle);

  const handleSave = () => {
    onSave(style);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Layer Style Editor</DialogTitle>
          <DialogDescription>
            Customize the appearance of this layer
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Stroke Color */}
          <div className="space-y-2">
            <Label>Stroke Color</Label>
            <div className="flex gap-2">
              <Input
                type="color"
                value={style.color || '#3b82f6'}
                onChange={(e) => setStyle({ ...style, color: e.target.value })}
                className="w-20 h-10"
              />
              <Input
                type="text"
                value={style.color || '#3b82f6'}
                onChange={(e) => setStyle({ ...style, color: e.target.value })}
                placeholder="#3b82f6"
              />
            </div>
          </div>

          {/* Fill Color */}
          <div className="space-y-2">
            <Label>Fill Color</Label>
            <div className="flex gap-2">
              <Input
                type="color"
                value={style.fillColor || style.color || '#3b82f6'}
                onChange={(e) => setStyle({ ...style, fillColor: e.target.value })}
                className="w-20 h-10"
              />
              <Input
                type="text"
                value={style.fillColor || style.color || '#3b82f6'}
                onChange={(e) => setStyle({ ...style, fillColor: e.target.value })}
                placeholder="#3b82f6"
              />
            </div>
          </div>

          {/* Stroke Weight */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label>Stroke Weight</Label>
              <span className="text-sm text-muted-foreground">{style.weight || 2}px</span>
            </div>
            <Slider
              value={[style.weight || 2]}
              onValueChange={([value]) => setStyle({ ...style, weight: value })}
              min={1}
              max={10}
              step={1}
            />
          </div>

          {/* Stroke Opacity */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label>Stroke Opacity</Label>
              <span className="text-sm text-muted-foreground">
                {Math.round((style.opacity || 0.8) * 100)}%
              </span>
            </div>
            <Slider
              value={[(style.opacity || 0.8) * 100]}
              onValueChange={([value]) => setStyle({ ...style, opacity: value / 100 })}
              min={0}
              max={100}
              step={5}
            />
          </div>

          {/* Fill Opacity */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label>Fill Opacity</Label>
              <span className="text-sm text-muted-foreground">
                {Math.round((style.fillOpacity || 0.3) * 100)}%
              </span>
            </div>
            <Slider
              value={[(style.fillOpacity || 0.3) * 100]}
              onValueChange={([value]) => setStyle({ ...style, fillOpacity: value / 100 })}
              min={0}
              max={100}
              step={5}
            />
          </div>

          {/* Dash Array */}
          <div className="space-y-2">
            <Label>Line Style</Label>
            <Select
              value={style.dashArray || 'solid'}
              onValueChange={(value) =>
                setStyle({ ...style, dashArray: value === 'solid' ? undefined : value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="solid">Solid</SelectItem>
                <SelectItem value="5, 5">Dashed</SelectItem>
                <SelectItem value="2, 4">Dotted</SelectItem>
                <SelectItem value="10, 5, 2, 5">Dash-Dot</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Preview */}
          <div className="space-y-2">
            <Label>Preview</Label>
            <div className="h-20 border rounded flex items-center justify-center bg-muted/20">
              <svg width="200" height="60">
                <line
                  x1="20"
                  y1="30"
                  x2="180"
                  y2="30"
                  stroke={style.color || '#3b82f6'}
                  strokeWidth={style.weight || 2}
                  strokeOpacity={style.opacity || 0.8}
                  strokeDasharray={style.dashArray}
                />
                <rect
                  x="60"
                  y="10"
                  width="80"
                  height="40"
                  fill={style.fillColor || style.color || '#3b82f6'}
                  fillOpacity={style.fillOpacity || 0.3}
                  stroke={style.color || '#3b82f6'}
                  strokeWidth={style.weight || 2}
                  strokeOpacity={style.opacity || 0.8}
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Style</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
