/**
 * Loading skeletons matching each card variant shape.
 * Provides smooth loading UX and minimizes layout shift.
 */

export function FeaturedCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-3xl bg-white dark:bg-slate-900 shadow-xl">
      <div className="relative h-64 sm:h-80 lg:h-96">
        <div className="skeleton-shine h-full w-full" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 lg:p-8 space-y-4">
          <div className="h-8 sm:h-10 skeleton-shine rounded-lg w-4/5" />
          <div className="hidden sm:block space-y-2">
            <div className="h-4 skeleton-shine rounded w-full" />
            <div className="h-4 skeleton-shine rounded w-3/4" />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 skeleton-shine rounded-full" />
              <div className="h-4 skeleton-shine rounded w-24" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function HorizontalCardSkeleton() {
  return (
    <div className="flex flex-col sm:flex-row gap-5 p-5 rounded-2xl bg-white dark:bg-slate-900 shadow-lg">
      <div className="relative w-full sm:w-48 h-40 sm:h-auto flex-shrink-0 skeleton-shine rounded-xl" />
      <div className="flex-1 flex flex-col justify-between min-w-0 space-y-4">
        <div className="space-y-3">
          <div className="h-5 skeleton-shine rounded-full w-24" />
          <div className="h-6 skeleton-shine rounded-lg w-4/5" />
          <div className="hidden md:block space-y-2">
            <div className="h-4 skeleton-shine rounded w-full" />
            <div className="h-4 skeleton-shine rounded w-2/3" />
          </div>
        </div>
        <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 skeleton-shine rounded-full" />
            <div className="h-4 skeleton-shine rounded w-20" />
          </div>
          <div className="h-4 skeleton-shine rounded w-16" />
        </div>
      </div>
    </div>
  );
}

export function CompactCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl bg-white dark:bg-slate-900 shadow-lg h-full flex flex-col">
      <div className="relative h-40 skeleton-shine" />
      <div className="p-4 flex-1 flex flex-col space-y-3">
        <div className="h-5 skeleton-shine rounded w-4/5" />
        <div className="h-4 skeleton-shine rounded w-full" />
        <div className="mt-auto pt-3 flex items-center justify-between border-t border-gray-100 dark:border-slate-800">
          <div className="h-3 skeleton-shine rounded w-16" />
          <div className="h-3 skeleton-shine rounded w-12" />
        </div>
      </div>
    </div>
  );
}

export function MiniCardSkeleton() {
  return (
    <div className="flex gap-3 p-3 rounded-lg">
      <div className="w-6 h-6 skeleton-shine rounded-full flex-shrink-0" />
      <div className="relative w-16 h-16 flex-shrink-0 skeleton-shine rounded-lg" />
      <div className="flex-1 min-w-0 space-y-2">
        <div className="h-4 skeleton-shine rounded w-full" />
        <div className="h-3 skeleton-shine rounded w-3/4" />
      </div>
    </div>
  );
}

export function GridCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl bg-white dark:bg-slate-900 shadow-lg h-full flex flex-col">
      <div className="relative aspect-video skeleton-shine" />
      <div className="p-5 flex-1 flex flex-col space-y-4">
        <div className="space-y-2">
          <div className="h-6 skeleton-shine rounded w-4/5" />
          <div className="h-4 skeleton-shine rounded w-full" />
          <div className="h-4 skeleton-shine rounded w-full" />
          <div className="h-4 skeleton-shine rounded w-2/3" />
        </div>
        <div className="mt-auto pt-4 space-y-3 border-t border-gray-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 skeleton-shine rounded-full" />
            <div className="h-4 skeleton-shine rounded w-24" />
          </div>
          <div className="flex items-center justify-between">
            <div className="h-3 skeleton-shine rounded w-20" />
            <div className="h-3 skeleton-shine rounded w-16" />
          </div>
        </div>
      </div>
    </div>
  );
}
