'use client';

import { CalendarDays, Clock3 } from 'lucide-react';

interface AgeDisplayProps {
  days: number;
  months: number;
  className?: string;
}

export function AgeDisplay({ days, months, className = '' }: AgeDisplayProps) {
  return (
    <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm bg-background text-foreground ${className}`}>
      <Clock3 className="h-4 w-4 text-emerald-600" />
      <span className="font-medium">{days} days</span>
      <span className="text-muted-foreground">/</span>
      <CalendarDays className="h-4 w-4 text-sky-600" />
      <span className="font-medium">{months} months</span>
    </div>
  );
}