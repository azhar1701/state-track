import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

interface AutosaveOptions<T> {
  key: string;
  data: T;
  delay?: number;
  onSave?: (data: T) => void;
  onRestore?: (data: T) => void;
}

export const useAutosave = <T,>({
  key,
  data,
  delay = 1000,
  onSave,
  onRestore,
}: AutosaveOptions<T>) => {
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.timestamp) {
          const savedDate = new Date(parsed.timestamp);
          const now = new Date();
          const diffMinutes = (now.getTime() - savedDate.getTime()) / 60000;
          
          if (diffMinutes < 60) {
            onRestore?.(parsed.data);
            setLastSaved(savedDate);
            toast.message('Draft dipulihkan', {
              description: `Terakhir disimpan ${Math.round(diffMinutes)} menit lalu`,
            });
          }
        }
      } catch (e) {
        console.error('Failed to restore autosave:', e);
      }
    }
  }, [key, onRestore]);

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setStatus('saving');

    timeoutRef.current = setTimeout(() => {
      try {
        const saveData = {
          data,
          timestamp: new Date().toISOString(),
        };
        localStorage.setItem(key, JSON.stringify(saveData));
        setStatus('saved');
        setLastSaved(new Date());
        onSave?.(data);
      } catch (e) {
        setStatus('error');
        console.error('Autosave failed:', e);
      }
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, key, delay, onSave]);

  const clearSaved = () => {
    localStorage.removeItem(key);
    setLastSaved(null);
    setStatus('idle');
  };

  return { status, lastSaved, clearSaved };
};
