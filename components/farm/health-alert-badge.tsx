import React from 'react';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { HealthAlertType } from '@/contexts/farm-context';

interface HealthAlertBadgeProps {
  severity: HealthAlertType;
  message: string;
  onClick?: () => void;
}

const severityConfig: Record<HealthAlertType, { bg: string; icon: React.ReactNode }> = {
  INFO: {
    bg: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    icon: <Info className="h-4 w-4" />,
  },
  WARNING: {
    bg: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    icon: <AlertTriangle className="h-4 w-4" />,
  },
  CRITICAL: {
    bg: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    icon: <AlertCircle className="h-4 w-4" />,
  },
};

export function HealthAlertBadge({
  severity,
  message,
  onClick,
}: HealthAlertBadgeProps) {
  const config = severityConfig[severity];

  return (
    <Badge
      className={`${config.bg} flex items-center gap-2 cursor-pointer hover:shadow-md transition-shadow`}
      onClick={onClick}
    >
      {config.icon}
      {message}
    </Badge>
  );
}
