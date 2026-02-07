export const ReportDetailSkeleton = () => {
  return (
    <div className="fixed z-[1401] bg-white dark:bg-slate-900 shadow-2xl lg:top-0 lg:right-0 lg:h-full lg:w-[400px] max-lg:bottom-0 max-lg:left-0 max-lg:right-0 max-lg:rounded-t-2xl max-lg:max-h-[90vh]">
      {/* Mobile Handle */}
      <div className="lg:hidden flex justify-center py-2">
        <div className="w-12 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
      </div>

      <div className="h-full overflow-y-auto pb-20">
        {/* Header Skeleton */}
        <div className="sticky top-0 z-10 bg-white dark:bg-slate-900 border-b px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 space-y-2">
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4" />
              <div className="flex gap-2">
                <div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
                <div className="h-5 w-20 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
              </div>
            </div>
            <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
        </div>

        {/* Image Skeleton */}
        <div className="aspect-video bg-gray-200 dark:bg-gray-700 animate-pulse" />

        {/* Content Skeleton */}
        <div className="px-4 py-4 space-y-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-2/3" />
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-1/2" />
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-5/6" />
          </div>
        </div>
      </div>

      {/* Footer Skeleton */}
      <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t p-4">
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      </div>
    </div>
  );
};
