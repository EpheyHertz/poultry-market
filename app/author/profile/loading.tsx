'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default function ProfileLoading() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 w-40 rounded-lg animate-pulse" style={{ background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.3), rgba(59, 130, 246, 0.3))' }} />
          <div className="h-4 w-56 rounded animate-pulse" style={{ background: 'rgba(0,0,0,0.1)' }} />
        </div>
        <div className="h-10 w-32 rounded-lg animate-pulse" style={{ background: 'linear-gradient(90deg, rgba(59, 130, 246, 0.4), rgba(16, 185, 129, 0.4))' }} />
      </div>
      
      {/* Main Profile Card */}
      <Card className="overflow-hidden border-0 shadow-xl" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.95), rgba(255,255,255,0.9))' }}>
        <div className="h-1.5" style={{ background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.7), rgba(59, 130, 246, 0.7), rgba(249, 115, 22, 0.7))' }} />
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-8">
            {/* Avatar Section */}
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="w-32 h-32 rounded-full animate-pulse" style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.3), rgba(59, 130, 246, 0.3))' }} />
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 h-6 w-20 rounded-full animate-pulse" style={{ background: 'rgba(16, 185, 129, 0.4)' }} />
              </div>
              <div className="space-y-2 text-center">
                <div className="h-6 w-32 mx-auto rounded animate-pulse" style={{ background: 'rgba(59, 130, 246, 0.2)' }} />
                <div className="h-4 w-24 mx-auto rounded animate-pulse" style={{ background: 'rgba(249, 115, 22, 0.2)' }} />
              </div>
            </div>
            
            {/* Info Section */}
            <div className="flex-1 space-y-6">
              {/* Bio */}
              <div className="space-y-2">
                <div className="h-4 w-full rounded animate-pulse" style={{ background: 'rgba(0,0,0,0.08)' }} />
                <div className="h-4 w-5/6 rounded animate-pulse" style={{ background: 'rgba(0,0,0,0.06)' }} />
                <div className="h-4 w-3/4 rounded animate-pulse" style={{ background: 'rgba(0,0,0,0.05)' }} />
              </div>
              
              {/* Expertise Tags */}
              <div>
                <div className="h-4 w-20 rounded mb-3 animate-pulse" style={{ background: 'rgba(16, 185, 129, 0.3)' }} />
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-7 rounded-full animate-pulse" style={{ width: `${60 + i * 15}px`, background: `rgba(${i % 2 === 0 ? '59, 130, 246' : '16, 185, 129'}, 0.15)` }} />
                  ))}
                </div>
              </div>
              
              {/* Social Links */}
              <div>
                <div className="h-4 w-28 rounded mb-3 animate-pulse" style={{ background: 'rgba(249, 115, 22, 0.3)' }} />
                <div className="flex gap-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="w-10 h-10 rounded-full animate-pulse" style={{ background: `rgba(${i % 3 === 0 ? '249, 115, 22' : i % 3 === 1 ? '59, 130, 246' : '16, 185, 129'}, 0.2)` }} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { color: '16, 185, 129' },
          { color: '59, 130, 246' },
          { color: '249, 115, 22' },
          { color: '139, 92, 246' },
        ].map((stat, i) => (
          <Card key={i} className="overflow-hidden border-0 shadow-lg" style={{ background: `linear-gradient(135deg, rgba(${stat.color}, 0.05), rgba(${stat.color}, 0.1))` }}>
            <div className="h-1" style={{ background: `rgba(${stat.color}, 0.5)` }} />
            <CardContent className="p-4 text-center space-y-2">
              <div className="h-8 w-16 mx-auto rounded animate-pulse" style={{ background: `rgba(${stat.color}, 0.3)` }} />
              <div className="h-4 w-20 mx-auto rounded animate-pulse" style={{ background: `rgba(${stat.color}, 0.15)` }} />
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Recent Posts Section */}
      <Card className="overflow-hidden border-0 shadow-lg">
        <div className="h-1" style={{ background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.5), rgba(59, 130, 246, 0.5))' }} />
        <CardHeader className="pb-2">
          <div className="h-6 w-32 rounded animate-pulse" style={{ background: 'rgba(59, 130, 246, 0.2)' }} />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3 p-3 rounded-lg" style={{ background: 'rgba(0,0,0,0.02)' }}>
              <div className="w-16 h-12 rounded animate-pulse flex-shrink-0" style={{ background: `rgba(${i % 2 === 0 ? '16, 185, 129' : '249, 115, 22'}, 0.2)` }} />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 rounded animate-pulse" style={{ background: 'rgba(59, 130, 246, 0.15)' }} />
                <div className="h-3 w-1/2 rounded animate-pulse" style={{ background: 'rgba(0,0,0,0.08)' }} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
