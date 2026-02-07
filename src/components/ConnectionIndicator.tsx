import { useState, useEffect } from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

type ConnectionQuality = 'excellent' | 'good' | 'poor' | 'offline';

export const ConnectionIndicator = () => {
  const [quality, setQuality] = useState<ConnectionQuality>('excellent');
  const [speed, setSpeed] = useState<string>('');

  useEffect(() => {
    const updateConnection = () => {
      if (!navigator.onLine) {
        setQuality('offline');
        return;
      }

      const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
      
      if (connection) {
        const effectiveType = connection.effectiveType;
        const downlink = connection.downlink;
        
        setSpeed(downlink ? `${downlink.toFixed(1)} Mbps` : '');
        
        if (effectiveType === '4g' || downlink > 5) {
          setQuality('excellent');
        } else if (effectiveType === '3g' || downlink > 1) {
          setQuality('good');
        } else {
          setQuality('poor');
        }
      }
    };

    updateConnection();
    
    window.addEventListener('online', updateConnection);
    window.addEventListener('offline', updateConnection);
    
    const connection = (navigator as any).connection;
    if (connection) {
      connection.addEventListener('change', updateConnection);
    }

    return () => {
      window.removeEventListener('online', updateConnection);
      window.removeEventListener('offline', updateConnection);
      if (connection) {
        connection.removeEventListener('change', updateConnection);
      }
    };
  }, []);

  const config = {
    excellent: { color: 'bg-emerald-500', label: 'Sangat Baik', bars: 4 },
    good: { color: 'bg-blue-500', label: 'Baik', bars: 3 },
    poor: { color: 'bg-amber-500', label: 'Lemah', bars: 2 },
    offline: { color: 'bg-red-500', label: 'Offline', bars: 0 },
  };

  const current = config[quality];

  return (
    <Badge variant="outline" className="gap-2 glass-panel">
      <div className="flex items-end gap-0.5 h-3">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className={`w-1 transition-all ${
              i < current.bars ? current.color : 'bg-muted'
            }`}
            style={{ height: `${(i + 1) * 25}%` }}
          />
        ))}
      </div>
      <span className="text-xs">{current.label}</span>
      {speed && <span className="text-xs text-muted-foreground">({speed})</span>}
    </Badge>
  );
};
