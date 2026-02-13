import { Button } from '@/components/ui/button';
import { Hexagon, Minus, Square, Circle, Trash2 } from 'lucide-react';
import L from 'leaflet';
import { useEffect, useState } from 'react';

interface DrawToolbarProps {
  visible: boolean;
  activeMode: string | null;
  map: L.Map;
}

export function DrawToolbar({ visible, activeMode, map }: DrawToolbarProps) {
  const [isDeleteMode, setIsDeleteMode] = useState(false);

  useEffect(() => {
    if (!map || !map.pm) return;

    const handleRemovalOn = () => setIsDeleteMode(true);
    const handleRemovalOff = () => setIsDeleteMode(false);

    map.on('pm:globalremovalon', handleRemovalOn);
    map.on('pm:globalremovaloff', handleRemovalOff);

    setIsDeleteMode(map.pm.globalRemovalModeEnabled());

    return () => {
      map.off('pm:globalremovalon', handleRemovalOn);
      map.off('pm:globalremovaloff', handleRemovalOff);
    };
  }, [map]);

  if (!visible) return null;

  const tools = [
    { 
      id: 'Polygon', 
      icon: Hexagon, 
      label: 'Polygon',
      color: 'text-blue-600',
      action: () => {
        map.pm.enableDraw('Polygon', { snappable: true, snapDistance: 20 });
      }
    },
    { 
      id: 'Line', 
      icon: Minus, 
      label: 'Garis',
      color: 'text-green-600',
      action: () => {
        map.pm.enableDraw('Line', { snappable: true, snapDistance: 20 });
      }
    },
    { 
      id: 'Rectangle', 
      icon: Square, 
      label: 'Kotak',
      color: 'text-purple-600',
      action: () => {
        map.pm.enableDraw('Rectangle');
      }
    },
    { 
      id: 'Circle', 
      icon: Circle, 
      label: 'Lingkaran',
      color: 'text-orange-600',
      action: () => {
        map.pm.enableDraw('Circle');
      }
    },
    { 
      id: 'delete', 
      icon: Trash2, 
      label: 'Hapus',
      color: 'text-red-600',
      action: () => {
        map.pm.toggleGlobalRemovalMode();
      }
    },
  ];

  return (
    <div className="flex items-center gap-1">
      {tools.map((tool) => {
        const isActive = tool.id === 'delete' 
          ? isDeleteMode 
          : activeMode === tool.id;
        return (
          <Button
            key={tool.id}
            onClick={tool.action}
            variant="ghost"
            size="sm"
            className={`h-8 w-8 p-0 transition-all ${
              isActive 
                ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
                : 'hover:bg-accent'
            }`}
            title={tool.label}
          >
            <tool.icon className={`w-4 h-4 ${!isActive ? tool.color : ''}`} />
          </Button>
        );
      })}
    </div>
  );
}
