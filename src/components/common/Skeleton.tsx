import { Card } from '@/components/ui/card';

export const ReportCardSkeleton = () => {
  return (
    <Card className="p-4 animate-pulse">
      <div className="flex gap-4">
        <div className="w-20 h-20 bg-muted rounded-lg" />
        <div className="flex-1 space-y-3">
          <div className="h-4 bg-muted rounded w-3/4" />
          <div className="h-3 bg-muted rounded w-1/2" />
          <div className="h-3 bg-muted rounded w-2/3" />
        </div>
      </div>
    </Card>
  );
};

export const MapSkeleton = () => {
  return (
    <div className="w-full h-full bg-muted animate-pulse flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="w-16 h-16 bg-muted-foreground/20 rounded-full mx-auto" />
        <div className="h-4 bg-muted-foreground/20 rounded w-32 mx-auto" />
      </div>
    </div>
  );
};
