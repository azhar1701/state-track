import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { GripVertical, Eye, EyeOff, Palette } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { useMutation } from '@tanstack/react-query';
import { useMapLayers, type GeoLayer } from '@/hooks/useMapLayers';

interface LayerControlPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const LayerControlPanel = ({ open, onOpenChange }: LayerControlPanelProps) => {
  const { layers, toggleVisibility, updateOpacity, updateZIndex } = useMapLayers();

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(layers);
    const [reordered] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reordered);

    // Update z-index for all affected layers
    items.forEach((layer, index) => {
      const newZIndex = 400 + index * 10;
      const layerWithTypes = layer as unknown as { z_index?: number; id?: string };
      if (layerWithTypes.z_index !== newZIndex) {
        updateZIndex.mutate({ id: layerWithTypes.id || '', z_index: newZIndex });
      }
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle>Layer Control</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-2">
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="layers">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef}>
                  {layers.map((layer, index) => (
                    <Draggable key={layer.id} draggableId={layer.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`
                            p-4 mb-2 rounded-lg border bg-card
                            ${snapshot.isDragging ? 'shadow-lg' : ''}
                          `}
                        >
                          <div className="flex items-start gap-3">
                            {/* Drag Handle */}
                            <div {...provided.dragHandleProps} className="mt-1 cursor-grab">
                              <GripVertical className="h-5 w-5 text-muted-foreground" />
                            </div>

                            {/* Layer Info */}
                            <div className="flex-1 space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div
                                    className="w-4 h-4 rounded border"
                                    style={{ backgroundColor: layer.legend_config.color }}
                                  />
                                  <span className="font-medium text-sm">{layer.name}</span>
                                </div>

                                <Switch
                                  checked={layer.visible}
                                  onCheckedChange={(checked) =>
                                    toggleVisibility.mutate({ id: layer.id, visible: checked })
                                  }
                                />
                              </div>

                              {/* Opacity Slider */}
                              {layer.visible && (
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                                    <span>Opacity</span>
                                    <span>{Math.round(layer.opacity * 100)}%</span>
                                  </div>
                                  <Slider
                                    value={[layer.opacity * 100]}
                                    onValueChange={([value]) =>
                                      updateOpacity.mutate({ id: layer.id, opacity: value / 100 })
                                    }
                                    min={0}
                                    max={100}
                                    step={5}
                                    className="w-full"
                                  />
                                </div>
                              )}

                              {/* Layer Type Badge */}
                              <div className="flex items-center gap-2">
                                <span className="text-xs px-2 py-1 rounded bg-muted">
                                  {layer.layer_type}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  z-index: {layer.z_index}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>

          {layers.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No layers available
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
