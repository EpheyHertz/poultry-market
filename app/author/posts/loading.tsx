'use client';

import { Card, CardContent } from '@/components/ui/card';

export default function PostsLoading() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <div className="h-8 w-32 rounded-lg animate-pulse" style={{ background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.3), rgba(59, 130, 246, 0.3))' }} />
          <div className="h-4 w-48 rounded animate-pulse" style={{ background: 'rgba(0,0,0,0.1)' }} />
        </div>
        <div className="h-10 w-36 rounded-lg animate-pulse" style={{ background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.4), rgba(59, 130, 246, 0.4))' }} />
      </div>
      
      {/* Filters Skeleton */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 h-10 rounded-lg animate-pulse" style={{ background: 'rgba(59, 130, 246, 0.1)' }} />
        <div className="w-full sm:w-44 h-10 rounded-lg animate-pulse" style={{ background: 'rgba(249, 115, 22, 0.1)' }} />
      </div>
      
      {/* Posts Skeleton */}
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="overflow-hidden border-0 shadow-lg" style={{ background: 'rgba(255,255,255,0.9)' }}>
            <div className="h-0.5" style={{ background: `rgba(${i % 3 === 0 ? '16, 185, 129' : i % 3 === 1 ? '59, 130, 246' : '249, 115, 22'}, 0.5)` }} />
            <CardContent className="p-4">
              <div className="flex gap-4">
                {/* Thumbnail Skeleton */}
                <div className="hidden sm:block w-32 h-24 rounded-lg animate-pulse flex-shrink-0" style={{ background: `linear-gradient(135deg, rgba(${i % 2 === 0 ? '16, 185, 129' : '59, 130, 246'}, 0.2), rgba(249, 115, 22, 0.1))` }} />
                
                {/* Content Skeleton */}
                <div className="flex-1 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-2 flex-1">
                      <div className="h-5 w-3/4 rounded animate-pulse" style={{ background: 'rgba(59, 130, 246, 0.2)' }} />
                      <div className="h-4 w-full rounded animate-pulse" style={{ background: 'rgba(0,0,0,0.08)' }} />
                      <div className="h-4 w-2/3 rounded animate-pulse" style={{ background: 'rgba(0,0,0,0.05)' }} />
                    </div>
                    <div className="h-8 w-8 rounded animate-pulse" style={{ background: 'rgba(0,0,0,0.1)' }} />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <div className="h-6 w-20 rounded-full animate-pulse" style={{ background: `rgba(${i % 2 === 0 ? '16, 185, 129' : '249, 115, 22'}, 0.2)` }} />
                    <div className="h-6 w-16 rounded-full animate-pulse" style={{ background: 'rgba(59, 130, 246, 0.15)' }} />
                    <div className="h-6 w-24 rounded-full animate-pulse" style={{ background: 'rgba(0,0,0,0.08)' }} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Pagination Skeleton */}
      <div className="flex justify-center gap-2 pt-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-9 w-9 rounded-lg animate-pulse" style={{ background: `rgba(${i === 3 ? '16, 185, 129' : '0, 0, 0'}, ${i === 3 ? 0.3 : 0.1})` }} />
        ))}
      </div>
    </div>
  );
}
