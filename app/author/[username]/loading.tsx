'use client';

import { Card, CardContent } from '@/components/ui/card';

export default function AuthorProfileLoading() {
  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, rgba(248,250,252,1) 0%, rgba(255,255,255,1) 50%, rgba(248,250,252,1) 100%)' }}>
      {/* Navbar Placeholder */}
      <div className="h-16 border-b" style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)' }}>
        <div className="container max-w-6xl mx-auto px-4 h-full flex items-center justify-between">
          <div className="h-8 w-32 rounded-lg animate-pulse" style={{ background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.3), rgba(59, 130, 246, 0.3))' }} />
          <div className="flex gap-3">
            <div className="h-8 w-20 rounded animate-pulse" style={{ background: 'rgba(0,0,0,0.1)' }} />
            <div className="h-8 w-8 rounded-full animate-pulse" style={{ background: 'rgba(59, 130, 246, 0.2)' }} />
          </div>
        </div>
      </div>
      
      <main className="container max-w-6xl mx-auto px-4 py-8">
        {/* Back Button */}
        <div className="mb-6">
          <div className="h-10 w-32 rounded-lg animate-pulse" style={{ background: 'rgba(16, 185, 129, 0.15)' }} />
        </div>

        {/* Profile Header Card */}
        <Card className="mb-8 overflow-hidden border-0 shadow-2xl" style={{ background: 'rgba(255,255,255,0.95)' }}>
          {/* Cover Image / Banner Skeleton */}
          <div className="relative h-32 sm:h-48 animate-pulse" style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.4), rgba(59, 130, 246, 0.4), rgba(249, 115, 22, 0.3))' }}>
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
          </div>
          
          <CardContent className="relative px-4 sm:px-6 pb-6">
            {/* Avatar Skeleton */}
            <div className="absolute -top-16 left-4 sm:left-6">
              <div className="relative">
                <div className="h-28 w-28 sm:h-32 sm:w-32 rounded-full border-4 border-white shadow-xl animate-pulse" style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.3), rgba(59, 130, 246, 0.3))' }} />
                <div className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full animate-pulse" style={{ background: 'rgba(16, 185, 129, 0.5)' }} />
              </div>
            </div>

            {/* Actions Skeleton */}
            <div className="flex justify-end pt-4 pb-8 sm:pb-4 gap-2">
              <div className="h-9 w-20 rounded-lg animate-pulse" style={{ background: 'rgba(59, 130, 246, 0.15)' }} />
              <div className="h-9 w-32 rounded-lg animate-pulse" style={{ background: 'rgba(16, 185, 129, 0.15)' }} />
            </div>

            {/* Profile Info Skeleton */}
            <div className="mt-4 sm:mt-0 space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="h-8 w-48 rounded-lg animate-pulse" style={{ background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.25), rgba(59, 130, 246, 0.25))' }} />
                <div className="h-6 w-28 rounded-full animate-pulse" style={{ background: 'rgba(16, 185, 129, 0.2)' }} />
              </div>
              <div className="h-4 w-32 rounded animate-pulse" style={{ background: 'rgba(0,0,0,0.1)' }} />

              {/* Tagline Skeleton */}
              <div className="h-6 w-64 rounded-lg animate-pulse" style={{ background: 'rgba(16, 185, 129, 0.15)' }} />

              {/* Bio Skeleton */}
              <div className="space-y-2">
                <div className="h-4 w-full rounded animate-pulse" style={{ background: 'rgba(0,0,0,0.08)' }} />
                <div className="h-4 w-4/5 rounded animate-pulse" style={{ background: 'rgba(0,0,0,0.06)' }} />
                <div className="h-4 w-3/4 rounded animate-pulse" style={{ background: 'rgba(0,0,0,0.05)' }} />
              </div>

              {/* Expertise Tags Skeleton */}
              <div className="flex flex-wrap gap-2 mt-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-6 w-20 rounded-full animate-pulse" style={{ background: `rgba(${i % 2 === 0 ? '59, 130, 246' : '249, 115, 22'}, 0.15)` }} />
                ))}
              </div>

              {/* Meta Info Skeleton */}
              <div className="flex flex-wrap gap-4 mt-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-5 w-28 rounded animate-pulse" style={{ background: `rgba(${i === 1 ? '16, 185, 129' : i === 2 ? '59, 130, 246' : i === 3 ? '239, 68, 68' : '139, 92, 246'}, 0.15)` }} />
                ))}
              </div>

              {/* Social Links Skeleton */}
              <div className="flex gap-2 mt-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-10 w-10 rounded-lg animate-pulse" style={{ background: `rgba(${i === 1 ? '29, 161, 242' : i === 2 ? '10, 102, 194' : i === 3 ? '228, 64, 95' : '0, 0, 0'}, 0.15)` }} />
                ))}
              </div>

              {/* Stats Skeleton */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t" style={{ borderColor: 'rgba(0,0,0,0.1)' }}>
                {[
                  { color: '16, 185, 129' },
                  { color: '59, 130, 246' },
                  { color: '139, 92, 246' },
                  { color: '249, 115, 22' }
                ].map((stat, i) => (
                  <div key={i} className="text-center p-3 rounded-xl" style={{ background: `rgba(${stat.color}, 0.08)` }}>
                    <div className="flex items-center justify-center gap-1.5 mb-1">
                      <div className="h-4 w-4 rounded animate-pulse" style={{ background: `rgba(${stat.color}, 0.4)` }} />
                      <div className="h-7 w-10 rounded animate-pulse" style={{ background: `rgba(${stat.color}, 0.3)` }} />
                    </div>
                    <div className="h-3 w-12 mx-auto rounded animate-pulse" style={{ background: 'rgba(0,0,0,0.1)' }} />
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Posts Section Skeleton */}
        <section>
          <div className="flex items-center gap-2 mb-6">
            <div className="h-5 w-5 rounded animate-pulse" style={{ background: 'rgba(16, 185, 129, 0.4)' }} />
            <div className="h-6 w-40 rounded-lg animate-pulse" style={{ background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.25), rgba(59, 130, 246, 0.25))' }} />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="overflow-hidden border-0 shadow-lg" style={{ background: 'rgba(255,255,255,0.95)' }}>
                <div className="h-1" style={{ background: `rgba(${i % 3 === 0 ? '16, 185, 129' : i % 3 === 1 ? '59, 130, 246' : '249, 115, 22'}, 0.5)` }} />
                {/* Image Skeleton */}
                <div className="h-48 animate-pulse" style={{ background: `linear-gradient(135deg, rgba(${i % 2 === 0 ? '16, 185, 129' : '59, 130, 246'}, 0.15), rgba(249, 115, 22, 0.1))` }} />
                
                <CardContent className="p-4 space-y-3">
                  {/* Category & Reading Time */}
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-24 rounded-full animate-pulse" style={{ background: `rgba(${i % 2 === 0 ? '16, 185, 129' : '59, 130, 246'}, 0.2)` }} />
                    <div className="h-4 w-16 rounded animate-pulse" style={{ background: 'rgba(0,0,0,0.1)' }} />
                  </div>
                  
                  {/* Title */}
                  <div className="h-6 w-full rounded animate-pulse" style={{ background: 'rgba(0,0,0,0.12)' }} />
                  <div className="h-6 w-3/4 rounded animate-pulse" style={{ background: 'rgba(0,0,0,0.08)' }} />
                  
                  {/* Excerpt */}
                  <div className="space-y-1">
                    <div className="h-4 w-full rounded animate-pulse" style={{ background: 'rgba(0,0,0,0.06)' }} />
                    <div className="h-4 w-5/6 rounded animate-pulse" style={{ background: 'rgba(0,0,0,0.05)' }} />
                  </div>
                  
                  {/* Tags */}
                  <div className="flex gap-1">
                    {[1, 2, 3].map((j) => (
                      <div key={j} className="h-4 w-12 rounded animate-pulse" style={{ background: 'rgba(16, 185, 129, 0.15)' }} />
                    ))}
                  </div>
                  
                  {/* Footer */}
                  <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: 'rgba(0,0,0,0.08)' }}>
                    <div className="h-4 w-24 rounded animate-pulse" style={{ background: 'rgba(0,0,0,0.1)' }} />
                    <div className="flex items-center gap-3">
                      <div className="h-4 w-10 rounded animate-pulse" style={{ background: 'rgba(139, 92, 246, 0.15)' }} />
                      <div className="h-4 w-10 rounded animate-pulse" style={{ background: 'rgba(249, 115, 22, 0.15)' }} />
                      <div className="h-4 w-10 rounded animate-pulse" style={{ background: 'rgba(59, 130, 246, 0.15)' }} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* CTA Skeleton */}
        <div className="mt-8 text-center">
          <div className="h-11 w-64 mx-auto rounded-lg animate-pulse" style={{ background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.2), rgba(59, 130, 246, 0.2))' }} />
        </div>
      </main>
    </div>
  );
}
