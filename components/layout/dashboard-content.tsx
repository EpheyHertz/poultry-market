'use client'

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface DashboardContentProps {
  children: ReactNode;
  title?: string;
  description?: string;
  className?: string;
}

interface DashboardSectionProps {
  children: ReactNode;
  className?: string;
  spacing?: 'sm' | 'md' | 'lg';
}

interface DashboardGridProps {
  children: ReactNode;
  cols?: {
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
}

// Main dashboard content wrapper
export function DashboardContent({ children, title, description, className = '' }: DashboardContentProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`space-y-4 sm:space-y-6 lg:space-y-8 ${className}`}
    >
      {(title || description) && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-2"
        >
          {title && (
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 tracking-tight">
              {title}
            </h1>
          )}
          {description && (
            <p className="text-sm sm:text-base text-gray-600 max-w-3xl">
              {description}
            </p>
          )}
        </motion.div>
      )}
      <div className="space-y-4 sm:space-y-6 lg:space-y-8">
        {children}
      </div>
    </motion.div>
  );
}

// Responsive dashboard section
export function DashboardSection({ children, className = '', spacing = 'md' }: DashboardSectionProps) {
  const spacingClasses = {
    sm: 'space-y-3 sm:space-y-4',
    md: 'space-y-4 sm:space-y-6',
    lg: 'space-y-6 sm:space-y-8'
  };

  return (
    <div className={`${spacingClasses[spacing]} ${className}`}>
      {children}
    </div>
  );
}

// Responsive dashboard grid
export function DashboardGrid({ 
  children, 
  cols = { sm: 1, md: 2, lg: 3, xl: 4 }, 
  gap = 'md',
  className = '' 
}: DashboardGridProps) {
  const gapClasses = {
    sm: 'gap-3 sm:gap-4',
    md: 'gap-4 sm:gap-5 lg:gap-6',
    lg: 'gap-6 sm:gap-7 lg:gap-8'
  };

  const gridCols = `grid-cols-${cols.sm || 1} ${
    cols.md ? `md:grid-cols-${cols.md}` : ''
  } ${
    cols.lg ? `lg:grid-cols-${cols.lg}` : ''
  } ${
    cols.xl ? `xl:grid-cols-${cols.xl}` : ''
  }`.trim();

  return (
    <div className={`grid ${gridCols} ${gapClasses[gap]} ${className}`}>
      {children}
    </div>
  );
}

// Responsive card grid for stats
export function DashboardStatsGrid({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <DashboardGrid
      cols={{ sm: 1, md: 2, lg: 3, xl: 5 }}
      gap="md"
      className={className}
    >
      {children}
    </DashboardGrid>
  );
}

// Responsive two-column layout
export function DashboardTwoColumn({ 
  left, 
  right, 
  leftClassName = '', 
  rightClassName = '',
  className = '' 
}: { 
  left: ReactNode; 
  right: ReactNode; 
  leftClassName?: string; 
  rightClassName?: string;
  className?: string;
}) {
  return (
    <div className={`grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 ${className}`}>
      <div className={leftClassName}>{left}</div>
      <div className={rightClassName}>{right}</div>
    </div>
  );
}

// Responsive three-column layout
export function DashboardThreeColumn({ 
  left, 
  center, 
  right, 
  className = '' 
}: { 
  left: ReactNode; 
  center: ReactNode; 
  right: ReactNode; 
  className?: string;
}) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 ${className}`}>
      <div>{left}</div>
      <div>{center}</div>
      <div>{right}</div>
    </div>
  );
}

// Responsive card that adapts to content
export function DashboardCard({ 
  children, 
  className = '',
  padding = 'md' 
}: { 
  children: ReactNode; 
  className?: string;
  padding?: 'sm' | 'md' | 'lg';
}) {
  const paddingClasses = {
    sm: 'p-3 sm:p-4',
    md: 'p-4 sm:p-6',
    lg: 'p-6 sm:p-8'
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className={`bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200 ${paddingClasses[padding]} ${className}`}
    >
      {children}
    </motion.div>
  );
}

// Mobile-friendly table wrapper
export function DashboardTable({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`overflow-x-auto -mx-3 sm:-mx-4 md:-mx-6 lg:-mx-8 ${className}`}>
      <div className="inline-block min-w-full align-middle">
        <div className="overflow-hidden border border-gray-200 rounded-lg sm:rounded-xl">
          {children}
        </div>
      </div>
    </div>
  );
}

// Responsive list with proper spacing
export function DashboardList({ 
  children, 
  spacing = 'md',
  className = '' 
}: { 
  children: ReactNode; 
  spacing?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const spacingClasses = {
    sm: 'space-y-2 sm:space-y-3',
    md: 'space-y-3 sm:space-y-4',
    lg: 'space-y-4 sm:space-y-6'
  };

  return (
    <div className={`${spacingClasses[spacing]} ${className}`}>
      {children}
    </div>
  );
}