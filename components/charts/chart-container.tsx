'use client';

import { ReactElement } from 'react';
import { ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';

interface ChartContainerProps {
  children: ReactElement;
  className?: string;
  heightClassName?: string;
}

export function ChartContainer({
  children,
  className,
  heightClassName = 'h-[300px] md:h-[400px]',
}: ChartContainerProps) {
  return (
    <div className={cn('w-full', heightClassName, className)}>
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}