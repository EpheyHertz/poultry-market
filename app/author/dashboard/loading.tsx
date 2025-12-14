'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { PenTool } from 'lucide-react';

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6 rounded-2xl" style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(59, 130, 246, 0.08) 50%, rgba(249, 115, 22, 0.05) 100%)' }}>
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="h-16 w-16 rounded-full animate-pulse" style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.3), rgba(59, 130, 246, 0.3))' }} />
            <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full animate-pulse" style={{ background: 'rgba(16, 185, 129, 0.5)' }} />
          </div>
          <div className="space-y-2">
            <div className="h-7 w-48 rounded-lg animate-pulse" style={{ background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.25), rgba(59, 130, 246, 0.25))' }} />
            <div className="h-4 w-28 rounded animate-pulse" style={{ background: 'rgba(0,0,0,0.1)' }} />
          </div>
        </div>
        <div className="flex gap-3">
          <div className="h-10 w-28 rounded-lg animate-pulse" style={{ background: 'rgba(59, 130, 246, 0.2)' }} />
          <div className="h-10 w-28 rounded-lg animate-pulse" style={{ background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.4), rgba(59, 130, 246, 0.4))' }} />
        </div>
      </div>
      
      {/* Stats Cards Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { color1: '16, 185, 129' },
          { color1: '59, 130, 246' },
          { color1: '249, 115, 22' },
          { color1: '139, 92, 246' }
        ].map((colors, i) => (
          <Card key={i} className="overflow-hidden border-0 shadow-lg" style={{ background: `linear-gradient(135deg, rgba(${colors.color1}, 0.05) 0%, rgba(255,255,255,0.9) 100%)` }}>
            <div className="h-1" style={{ background: `rgba(${colors.color1}, 0.5)` }} />
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-4 w-20 rounded animate-pulse" style={{ background: 'rgba(0,0,0,0.1)' }} />
                  <div className="h-7 w-16 rounded-lg animate-pulse" style={{ background: `rgba(${colors.color1}, 0.25)` }} />
                </div>
                <div className="h-12 w-12 rounded-full animate-pulse" style={{ background: `rgba(${colors.color1}, 0.15)` }} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Quick Stats Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { bg: 'rgba(156, 163, 175, 0.15)', icon: 'rgba(156, 163, 175, 0.3)' },
          { bg: 'rgba(234, 179, 8, 0.1)', icon: 'rgba(234, 179, 8, 0.25)' },
          { bg: 'rgba(16, 185, 129, 0.1)', icon: 'rgba(16, 185, 129, 0.25)' },
          { bg: 'rgba(239, 68, 68, 0.1)', icon: 'rgba(239, 68, 68, 0.25)' }
        ].map((style, i) => (
          <Card key={i} className="border-0" style={{ background: style.bg }}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg animate-pulse" style={{ background: style.icon, width: '40px', height: '40px' }} />
              <div className="space-y-1">
                <div className="h-6 w-8 rounded animate-pulse" style={{ background: 'rgba(0,0,0,0.15)' }} />
                <div className="h-3 w-14 rounded animate-pulse" style={{ background: 'rgba(0,0,0,0.1)' }} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Main Content Grid Skeleton */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Posts Skeleton */}
        <Card className="lg:col-span-2 border-0 shadow-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.95)' }}>
          <div className="h-1" style={{ background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.7), rgba(59, 130, 246, 0.7), rgba(249, 115, 22, 0.7))' }} />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-2">
              <div className="h-6 w-32 rounded-lg animate-pulse" style={{ background: 'rgba(59, 130, 246, 0.2)' }} />
              <div className="h-4 w-40 rounded animate-pulse" style={{ background: 'rgba(0,0,0,0.1)' }} />
            </div>
            <div className="h-8 w-20 rounded animate-pulse" style={{ background: 'rgba(16, 185, 129, 0.15)' }} />
          </CardHeader>
          <CardContent className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-3 rounded-lg animate-pulse" style={{ background: `rgba(${i % 2 === 0 ? '16, 185, 129' : '59, 130, 246'}, 0.05)` }}>
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="h-5 w-3/4 rounded animate-pulse" style={{ background: 'rgba(0,0,0,0.1)' }} />
                    <div className="flex gap-2">
                      <div className="h-5 w-16 rounded-full animate-pulse" style={{ background: `rgba(${i % 3 === 0 ? '16, 185, 129' : i % 3 === 1 ? '234, 179, 8' : '59, 130, 246'}, 0.2)` }} />
                      <div className="h-5 w-20 rounded animate-pulse" style={{ background: 'rgba(0,0,0,0.08)' }} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        
        {/* Sidebar Skeleton */}
        <div className="space-y-6">
          <Card className="border-0 shadow-lg overflow-hidden" style={{ background: 'rgba(255,255,255,0.95)' }}>
            <div className="h-1" style={{ background: 'rgba(249, 115, 22, 0.6)' }} />
            <CardHeader className="pb-2">
              <div className="h-6 w-28 rounded-lg animate-pulse" style={{ background: 'rgba(249, 115, 22, 0.2)' }} />
            </CardHeader>
            <CardContent className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex justify-between items-center p-2 rounded-lg" style={{ background: 'rgba(249, 115, 22, 0.05)' }}>
                  <div className="h-4 w-32 rounded animate-pulse" style={{ background: 'rgba(0,0,0,0.1)' }} />
                  <div className="h-4 w-12 rounded animate-pulse" style={{ background: 'rgba(249, 115, 22, 0.2)' }} />
                </div>
              ))}
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-lg overflow-hidden" style={{ background: 'rgba(255,255,255,0.95)' }}>
            <div className="h-1" style={{ background: 'rgba(59, 130, 246, 0.6)' }} />
            <CardHeader className="pb-2">
              <div className="h-6 w-28 rounded-lg animate-pulse" style={{ background: 'rgba(59, 130, 246, 0.2)' }} />
            </CardHeader>
            <CardContent className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 rounded-lg animate-pulse" style={{ background: `rgba(${i === 1 ? '16, 185, 129' : i === 2 ? '59, 130, 246' : '249, 115, 22'}, 0.1)` }} />
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
