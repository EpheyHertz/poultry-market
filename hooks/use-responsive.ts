'use client'

import { useState, useEffect } from 'react';

interface ScreenSize {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isLarge: boolean;
  width: number;
  height: number;
}

export function useResponsive(): ScreenSize {
  const [screenSize, setScreenSize] = useState<ScreenSize>({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    isLarge: true,
    width: 1024,
    height: 768,
  });

  useEffect(() => {
    const updateScreenSize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      setScreenSize({
        isMobile: width < 640,
        isTablet: width >= 640 && width < 1024,
        isDesktop: width >= 1024,
        isLarge: width >= 1280,
        width,
        height,
      });
    };

    // Initial check
    updateScreenSize();

    // Add event listener
    window.addEventListener('resize', updateScreenSize);

    // Cleanup
    return () => window.removeEventListener('resize', updateScreenSize);
  }, []);

  return screenSize;
}

// Hook for dynamic grid columns based on screen size
export function useResponsiveGrid(
  baseColumns: number = 3,
  options?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
    large?: number;
  }
) {
  const screen = useResponsive();
  
  if (screen.isMobile) return options?.mobile || 1;
  if (screen.isTablet) return options?.tablet || 2;
  if (screen.isLarge) return options?.large || baseColumns + 1;
  return options?.desktop || baseColumns;
}

// Hook for responsive spacing
export function useResponsiveSpacing() {
  const screen = useResponsive();
  
  return {
    padding: screen.isMobile ? 'p-3' : screen.isTablet ? 'p-4' : 'p-6',
    margin: screen.isMobile ? 'm-3' : screen.isTablet ? 'm-4' : 'm-6',
    gap: screen.isMobile ? 'gap-3' : screen.isTablet ? 'gap-4' : 'gap-6',
    textSize: screen.isMobile ? 'text-sm' : screen.isTablet ? 'text-base' : 'text-lg',
  };
}