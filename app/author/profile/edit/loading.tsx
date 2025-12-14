'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default function ProfileEditLoading() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="space-y-2">
        <div className="h-8 w-36 rounded-lg animate-pulse" style={{ background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.3), rgba(59, 130, 246, 0.3))' }} />
        <div className="h-4 w-64 rounded animate-pulse" style={{ background: 'rgba(0,0,0,0.1)' }} />
      </div>
      
      {/* Form Card */}
      <Card className="overflow-hidden border-0 shadow-xl" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.98), rgba(255,255,255,0.95))' }}>
        <div className="h-1.5" style={{ background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.7), rgba(59, 130, 246, 0.7), rgba(249, 115, 22, 0.7))' }} />
        <CardContent className="p-8 space-y-8">
          {/* Avatar Upload Section */}
          <div className="flex flex-col items-center gap-4 pb-6 border-b border-gray-100">
            <div className="relative">
              <div className="w-28 h-28 rounded-full animate-pulse" style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.25), rgba(59, 130, 246, 0.25))' }} />
              <div className="absolute bottom-0 right-0 w-10 h-10 rounded-full animate-pulse" style={{ background: 'rgba(59, 130, 246, 0.4)' }} />
            </div>
            <div className="h-4 w-40 rounded animate-pulse" style={{ background: 'rgba(0,0,0,0.08)' }} />
          </div>
          
          {/* Basic Info Section */}
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded animate-pulse" style={{ background: 'rgba(16, 185, 129, 0.4)' }} />
              <div className="h-5 w-32 rounded animate-pulse" style={{ background: 'rgba(16, 185, 129, 0.2)' }} />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Display Name */}
              <div className="space-y-2">
                <div className="h-4 w-28 rounded animate-pulse" style={{ background: 'rgba(0,0,0,0.1)' }} />
                <div className="h-10 w-full rounded-lg animate-pulse" style={{ background: 'rgba(59, 130, 246, 0.08)' }} />
              </div>
              
              {/* Username */}
              <div className="space-y-2">
                <div className="h-4 w-24 rounded animate-pulse" style={{ background: 'rgba(0,0,0,0.1)' }} />
                <div className="h-10 w-full rounded-lg animate-pulse" style={{ background: 'rgba(249, 115, 22, 0.08)' }} />
              </div>
            </div>
            
            {/* Bio */}
            <div className="space-y-2">
              <div className="h-4 w-16 rounded animate-pulse" style={{ background: 'rgba(0,0,0,0.1)' }} />
              <div className="h-28 w-full rounded-lg animate-pulse" style={{ background: 'rgba(16, 185, 129, 0.08)' }} />
            </div>
          </div>
          
          {/* Expertise Section */}
          <div className="space-y-4 pt-6 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded animate-pulse" style={{ background: 'rgba(59, 130, 246, 0.4)' }} />
              <div className="h-5 w-36 rounded animate-pulse" style={{ background: 'rgba(59, 130, 246, 0.2)' }} />
            </div>
            
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-8 rounded-full animate-pulse" style={{ width: `${50 + i * 12}px`, background: `rgba(${i % 2 === 0 ? '59, 130, 246' : '16, 185, 129'}, 0.15)` }} />
              ))}
              <div className="h-8 w-8 rounded-full animate-pulse" style={{ background: 'rgba(249, 115, 22, 0.3)' }} />
            </div>
          </div>
          
          {/* Social Links Section */}
          <div className="space-y-4 pt-6 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded animate-pulse" style={{ background: 'rgba(249, 115, 22, 0.4)' }} />
              <div className="h-5 w-28 rounded animate-pulse" style={{ background: 'rgba(249, 115, 22, 0.2)' }} />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {['16, 185, 129', '59, 130, 246', '249, 115, 22', '139, 92, 246'].map((color, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded animate-pulse" style={{ background: `rgba(${color}, 0.5)` }} />
                    <div className="h-4 w-16 rounded animate-pulse" style={{ background: `rgba(${color}, 0.2)` }} />
                  </div>
                  <div className="h-10 w-full rounded-lg animate-pulse" style={{ background: `rgba(${color}, 0.08)` }} />
                </div>
              ))}
            </div>
          </div>
          
          {/* Submit Buttons */}
          <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
            <div className="h-10 w-24 rounded-lg animate-pulse" style={{ background: 'rgba(0,0,0,0.1)' }} />
            <div className="h-10 w-32 rounded-lg animate-pulse" style={{ background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.4), rgba(59, 130, 246, 0.4))' }} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
