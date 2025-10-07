import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, RotateCcw, Clock } from 'lucide-react';
import { format, addDays, differenceInDays } from 'date-fns';

interface TimeSliderProps {
  minDate: Date;
  maxDate: Date;
  currentDate: Date;
  onDateChange: (date: Date) => void;
}

export const TimeSlider = ({ minDate, maxDate, currentDate, onDateChange }: TimeSliderProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [sliderValue, setSliderValue] = useState(0);

  const totalDays = differenceInDays(maxDate, minDate);
  const currentDays = differenceInDays(currentDate, minDate);

  useEffect(() => {
    setSliderValue(currentDays);
  }, [currentDays]);

  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setSliderValue((prev) => {
        const next = prev + 1;
        if (next > totalDays) {
          setIsPlaying(false);
          return 0;
        }
        const newDate = addDays(minDate, next);
        onDateChange(newDate);
        return next;
      });
    }, 500);

    return () => clearInterval(interval);
  }, [isPlaying, minDate, maxDate, totalDays, onDateChange]);

  const handleSliderChange = (value: number[]) => {
    const days = value[0];
    setSliderValue(days);
    const newDate = addDays(minDate, days);
    onDateChange(newDate);
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setSliderValue(0);
    onDateChange(minDate);
  };

  return (
    <Card className="w-full shadow-lg">
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

        <div className="flex gap-2">
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
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
