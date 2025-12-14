'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, useScroll, useSpring } from 'framer-motion';
import { Clock, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReadingProgressProps {
  readingTime?: number;
  postId: string;
  className?: string;
}

export default function ReadingProgress({ readingTime, postId, className }: ReadingProgressProps) {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [startTime] = useState(Date.now());
  const lastTrackedRef = useRef(0);
  const hasTrackedViewRef = useRef(false);

  // Smooth spring animation for progress bar
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  // Track scroll progress
  useEffect(() => {
    const handleScroll = () => {
      const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
      const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const scrolled = (winScroll / height) * 100;
      
      setScrollProgress(scrolled);
      setIsVisible(winScroll > 100);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Track view with engagement data
  const trackView = useCallback(async (readDuration: number, scrollDepth: number) => {
    try {
      await fetch(`/api/blog/posts/by-id/${postId}/view`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          readDuration: Math.round(readDuration),
          scrollDepth: Math.round(scrollDepth),
          referrer: document.referrer || undefined
        })
      });
    } catch (error) {
      console.error('Failed to track view:', error);
    }
  }, [postId]);

  // Track initial view
  useEffect(() => {
    if (!hasTrackedViewRef.current) {
      hasTrackedViewRef.current = true;
      // Track initial view after 5 seconds
      const timer = setTimeout(() => {
        const duration = (Date.now() - startTime) / 1000;
        trackView(duration, scrollProgress);
        lastTrackedRef.current = Date.now();
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [postId, startTime, scrollProgress, trackView]);

  // Track engagement periodically and on exit
  useEffect(() => {
    // Track every 30 seconds while reading
    const interval = setInterval(() => {
      const duration = (Date.now() - startTime) / 1000;
      if (duration > 30 && Date.now() - lastTrackedRef.current > 30000) {
        trackView(duration, scrollProgress);
        lastTrackedRef.current = Date.now();
      }
    }, 30000);

    // Track on page exit
    const handleBeforeUnload = () => {
      const duration = (Date.now() - startTime) / 1000;
      // Use sendBeacon for reliability
      if (navigator.sendBeacon) {
        navigator.sendBeacon(
          `/api/blog/posts/by-id/${postId}/view`,
          JSON.stringify({
            readDuration: Math.round(duration),
            scrollDepth: Math.round(scrollProgress)
          })
        );
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [postId, startTime, scrollProgress, trackView]);

  return (
    <>
      {/* Progress Bar at Top */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-emerald-500 origin-left z-50"
        style={{ scaleX }}
      />

      {/* Floating Reading Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ 
          opacity: isVisible ? 1 : 0, 
          y: isVisible ? 0 : 20 
        }}
        className={cn(
          'fixed bottom-4 left-4 z-40 bg-background/95 dark:bg-gray-900/95 backdrop-blur-sm',
          'rounded-full shadow-lg border dark:border-gray-700 px-4 py-2',
          'flex items-center gap-3 text-sm',
          className
        )}
      >
        {/* Progress Circle */}
        <div className="relative h-8 w-8">
          <svg className="h-8 w-8 -rotate-90" viewBox="0 0 36 36">
            <circle
              cx="18"
              cy="18"
              r="15"
              fill="none"
              className="stroke-gray-200 dark:stroke-gray-700"
              strokeWidth="3"
            />
            <circle
              cx="18"
              cy="18"
              r="15"
              fill="none"
              className="stroke-emerald-500"
              strokeWidth="3"
              strokeDasharray={`${scrollProgress}, 100`}
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-xs font-medium">
            {Math.round(scrollProgress)}%
          </span>
        </div>

        {/* Reading Time */}
        {readingTime && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{readingTime} min read</span>
          </div>
        )}
      </motion.div>
    </>
  );
}

// Simplified inline reading time display
export function ReadingTimeInline({ minutes, className }: { minutes?: number; className?: string }) {
  if (!minutes) return null;
  
  return (
    <span className={cn('inline-flex items-center gap-1 text-muted-foreground', className)}>
      <BookOpen className="h-4 w-4" />
      <span>{minutes} min read</span>
    </span>
  );
}
