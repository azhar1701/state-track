import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, FileText, Camera, MapPin, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const FloatingActionButton = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const actions = [
    { icon: FileText, label: 'Laporan Baru', onClick: () => navigate('/report') },
    { icon: Camera, label: 'Foto Langsung', onClick: () => navigate('/report?photo=true') },
    { icon: MapPin, label: 'Tandai Lokasi', onClick: () => navigate('/map?mark=true') },
  ];

  return (
    <div className="fixed bottom-24 right-4 z-50 md:bottom-8">
      {open && (
        <div className="absolute bottom-16 right-0 space-y-2 animate-in slide-in-from-bottom-4">
          {actions.map((action, i) => (
            <div
              key={i}
              className="flex items-center gap-3 animate-in slide-in-from-right-4"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <span className="glass-panel px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap shadow-float">
                {action.label}
              </span>
              <Button
                size="icon"
                className="h-12 w-12 rounded-full shadow-float btn-haptic"
                onClick={() => {
                  action.onClick();
                  setOpen(false);
                }}
              >
                <action.icon className="w-5 h-5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Button
        size="icon"
        className="h-14 w-14 rounded-full shadow-lifted btn-haptic"
        onClick={() => setOpen(!open)}
      >
        {open ? (
          <X className="w-6 h-6 transition-transform rotate-90" />
        ) : (
          <Plus className="w-6 h-6 transition-transform" />
        )}
      </Button>

      {open && (
        <div
          className="fixed inset-0 -z-10"
          onClick={() => setOpen(false)}
        />
      )}
    </div>
  );
};
