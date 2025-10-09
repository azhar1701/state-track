import { useState, useEffect, useMemo, useRef, useCallback, type KeyboardEvent } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, RotateCcw, Clock, ChevronLeft, ChevronRight, Repeat } from 'lucide-react';
import { format, addDays, differenceInCalendarDays, startOfDay } from 'date-fns';

interface TimeSliderProps {
  minDate: Date;
  maxDate: Date;
  currentDate: Date;
  onDateChange: (date: Date) => void;
  // When compact, render a minimal slider without header and controls
  compact?: boolean;
  // Loop to start when reaching max
  loop?: boolean;
  // Base interval in ms (will be divided by speed factor)
  baseIntervalMs?: number;
  // Available playback speeds (e.g. [0.5,1,2])
  speeds?: number[];
  // Notify when play/pause toggles
  onPlayChange?: (playing: boolean) => void;
}

export const TimeSlider = ({
  minDate,
  maxDate,
  currentDate,
  onDateChange,
  compact = false,
  loop = false,
  baseIntervalMs = 500,
  speeds = [0.5, 1, 2],
  onPlayChange,
}: TimeSliderProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [sliderValue, setSliderValue] = useState(0);
  const [speedIndex, setSpeedIndex] = useState(() => Math.max(0, speeds.indexOf(1)));
  const emitTimerRef = useRef<number | null>(null);

  const baseMin = useMemo(() => startOfDay(minDate), [minDate]);
  const baseMax = useMemo(() => startOfDay(maxDate), [maxDate]);
  const totalDays = useMemo(
    () => Math.max(0, differenceInCalendarDays(baseMax, baseMin)),
    [baseMax, baseMin]
  );
  const currentDays = useMemo(
    () => Math.max(0, differenceInCalendarDays(startOfDay(currentDate), baseMin)),
    [currentDate, baseMin]
  );

  useEffect(() => {
    setSliderValue(currentDays);
  }, [currentDays]);

  // Debounced emitter to avoid spamming heavy filters
  const emitDateChange = useCallback((date: Date) => {
    if (emitTimerRef.current) window.clearTimeout(emitTimerRef.current);
    emitTimerRef.current = window.setTimeout(() => {
      onDateChange(date);
    }, 120);
  }, [onDateChange]);

  useEffect(() => {
    if (!isPlaying) return;
    const speed = speeds[Math.max(0, speedIndex)] ?? 1;
    const tickMs = Math.max(80, Math.round(baseIntervalMs / speed));
    const interval = setInterval(() => {
      setSliderValue((prev) => {
        let next = prev + 1;
        if (next > totalDays) {
          if (loop) {
            next = 0;
          } else {
            setIsPlaying(false);
            return prev;
          }
        }
        const newDate = addDays(baseMin, next);
        emitDateChange(newDate);
        return next;
      });
    }, tickMs);

    return () => clearInterval(interval);
  }, [isPlaying, baseMin, totalDays, loop, baseIntervalMs, speeds, speedIndex, emitDateChange]);

  const handleSliderChange = (value: number[]) => {
    const days = value[0];
    setSliderValue(days);
    const newDate = addDays(baseMin, days);
    emitDateChange(newDate);
  };

  const handlePlayPause = () => {
    const next = !isPlaying;
    setIsPlaying(next);
    onPlayChange?.(next);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setSliderValue(0);
    emitDateChange(baseMin);
  };

  const stepPrev = () => {
    setIsPlaying(false);
    setSliderValue((prev) => {
      const next = prev <= 0 ? (loop ? totalDays : 0) : prev - 1;
      emitDateChange(addDays(baseMin, next));
      return next;
    });
  };

  const stepNext = () => {
    setIsPlaying(false);
    setSliderValue((prev) => {
      const next = prev >= totalDays ? (loop ? 0 : totalDays) : prev + 1;
      emitDateChange(addDays(baseMin, next));
      return next;
    });
  };

  const cycleSpeed = () => {
    setSpeedIndex((i) => (i + 1) % speeds.length);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === ' ') { e.preventDefault(); handlePlayPause(); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); stepPrev(); }
    if (e.key === 'ArrowRight') { e.preventDefault(); stepNext(); }
  };

  if (compact) {
    return (
      <div
        className="w-full bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/60 border rounded-md px-3 py-2 shadow"
        tabIndex={0}
        role="group"
        aria-label="Pengatur waktu laporan"
        onKeyDown={onKeyDown}
      >
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={stepPrev}
              className="h-7 w-7 p-0"
              aria-label="Sebelumnya"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePlayPause}
              className="h-7 w-7 p-0"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={stepNext}
              className="h-7 w-7 p-0"
              aria-label="Berikutnya"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="h-7 w-7 p-0"
              aria-label="Reset"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={cycleSpeed}
              className="text-[10px] px-1.5 py-0.5 rounded border hover:bg-accent"
              aria-label="Kecepatan"
              title="Ubah kecepatan"
            >
              {(speeds[Math.max(0, speedIndex)] ?? 1).toString()}x
            </button>
            <span className="text-[11px] font-medium text-foreground">
              {format(currentDate, 'dd MMM yy')}
            </span>
            {loop && <Repeat className="w-3.5 h-3.5 text-muted-foreground" aria-hidden />}
          </div>
        </div>
        <Slider
          value={[sliderValue]}
          onValueChange={handleSliderChange}
          max={totalDays}
          step={1}
          className="w-full"
        />
        <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
          <span>{format(minDate, 'dd MMM yy')}</span>
          <span>{format(maxDate, 'dd MMM yy')}</span>
        </div>
      </div>
    );
  }

  return (
    <Card className="w-full shadow-lg" tabIndex={0} role="group" aria-label="Filter waktu laporan" onKeyDown={onKeyDown}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          <CardTitle className="text-sm">Filter Waktu</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{format(minDate, 'dd MMM yyyy')}</span>
            <span className="font-medium text-foreground">
              {format(currentDate, 'dd MMM yyyy')}
            </span>
            <span>{format(maxDate, 'dd MMM yyyy')}</span>
          </div>
          <Slider
            value={[sliderValue]}
            onValueChange={handleSliderChange}
            max={totalDays}
            step={1}
            className="w-full"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={stepPrev}
            className="flex items-center gap-1"
            aria-label="Sebelumnya"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePlayPause}
            className="flex items-center gap-2"
          >
            {isPlaying ? (
              <>
                <Pause className="w-4 h-4" />
                Pause
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Play
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={stepNext}
            className="flex items-center gap-1"
            aria-label="Berikutnya"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={cycleSpeed}
            aria-label="Ubah kecepatan"
            className="ml-auto"
          >
            {(speeds[Math.max(0, speedIndex)] ?? 1).toString()}x
          </Button>
          {loop && <Repeat className="w-4 h-4 text-muted-foreground" aria-hidden />}
        </div>
      </CardContent>
    </Card>
  );
};
