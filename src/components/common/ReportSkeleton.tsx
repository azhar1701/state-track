import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export const ReportSkeleton = () => (
  <Card className="animate-pulse">
    <CardHeader className="pb-3">
      <Skeleton className="h-6 w-3/4 mb-2" />
      <div className="flex gap-2">
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
    </CardHeader>
    <CardContent className="space-y-3">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-20 w-full" />
      <div className="flex justify-between pt-2">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-4 w-1/4" />
      </div>
    </CardContent>
  </Card>
);

export const ReportSkeletonList = ({ count = 5 }: { count?: number }) => (
  <div className="space-y-4">
    {Array.from({ length: count }).map((_, i) => (
      <ReportSkeleton key={i} />
    ))}
  </div>
);
