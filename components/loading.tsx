'use client';

import { Loader2 } from 'lucide-react';

interface LoadingProps {
  text?: string;
  fullScreen?: boolean;
  className?: string;
  spinnerClassName?: string;
  textClassName?: string;
}

export default function Loading({
  text = 'Loading...',
  fullScreen = false,
  className = '',
  spinnerClassName = '',
  textClassName = ''
}: LoadingProps) {
  return (
    <div className={`
      flex flex-col items-center justify-center 
      ${fullScreen ? 'h-screen w-screen' : 'h-full w-full'} 
      ${className}
    `}>
      <Loader2 className={`animate-spin h-8 w-8 text-primary ${spinnerClassName}`} />
      {text && (
        <p className={`mt-4 text-gray-600 ${textClassName}`}>
          {text}
        </p>
      )}
    </div>
  );
}

export function LoadingSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse flex space-x-4">
          <div className="rounded-full bg-gray-200 h-12 w-12"></div>
          <div className="flex-1 space-y-4 py-1">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}