import { Badge } from '@/components/ui/badge';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import {
  Package,
  Clock,
  CheckCircle,
  XCircle,
  Truck,
  PackageCheck,
  MapPin,
  AlertCircle,
  DollarSign,
} from 'lucide-react';

interface OrderStatusBadgeProps {
  status: OrderStatus | string;
  size?: 'sm' | 'md' | 'lg';
}

export function OrderStatusBadge({ status, size = 'md' }: OrderStatusBadgeProps) {
  const getStatusConfig = (status: string) => {
    const configs: Record<string, { label: string; variant: string; icon: any; color: string }> = {
      PENDING: {
        label: 'Pending',
        variant: 'secondary',
        icon: Clock,
        color: 'text-gray-600 bg-gray-100',
      },
      PAYMENT_PENDING: {
        label: 'Payment Pending',
        variant: 'warning',
        icon: DollarSign,
        color: 'text-amber-700 bg-amber-100',
      },
      PAID: {
        label: 'Paid',
        variant: 'success',
        icon: CheckCircle,
        color: 'text-emerald-700 bg-emerald-100',
      },
      APPROVED: {
        label: 'Approved',
        variant: 'info',
        icon: CheckCircle,
        color: 'text-blue-700 bg-blue-100',
      },
      PACKED: {
        label: 'Packed',
        variant: 'info',
        icon: PackageCheck,
        color: 'text-indigo-700 bg-indigo-100',
      },
      READY_FOR_DELIVERY: {
        label: 'Ready for Delivery',
        variant: 'info',
        icon: Package,
        color: 'text-cyan-700 bg-cyan-100',
      },
      IN_TRANSIT: {
        label: 'In Transit',
        variant: 'info',
        icon: Truck,
        color: 'text-purple-700 bg-purple-100',
      },
      REACHED_COLLECTION_POINT: {
        label: 'At Collection Point',
        variant: 'info',
        icon: MapPin,
        color: 'text-violet-700 bg-violet-100',
      },
      READY_FOR_PICKUP: {
        label: 'Ready for Pickup',
        variant: 'info',
        icon: PackageCheck,
        color: 'text-teal-700 bg-teal-100',
      },
      DELIVERED: {
        label: 'Delivered',
        variant: 'success',
        icon: CheckCircle,
        color: 'text-green-700 bg-green-100',
      },
      COMPLETED: {
        label: 'Completed',
        variant: 'success',
        icon: CheckCircle,
        color: 'text-emerald-800 bg-emerald-200',
      },
      CANCELLED: {
        label: 'Cancelled',
        variant: 'destructive',
        icon: XCircle,
        color: 'text-red-700 bg-red-100',
      },
      REJECTED: {
        label: 'Rejected',
        variant: 'destructive',
        icon: AlertCircle,
        color: 'text-red-700 bg-red-100',
      },
    };

    return configs[status] || configs.PENDING;
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  return (
    <Badge 
      className={`inline-flex items-center gap-1.5 font-medium ${config.color} ${sizeClasses[size]}`}
    >
      <Icon className={iconSizes[size]} />
      {config.label}
    </Badge>
  );
}

interface PaymentStatusBadgeProps {
  status: PaymentStatus | string;
  size?: 'sm' | 'md' | 'lg';
}

export function PaymentStatusBadge({ status, size = 'md' }: PaymentStatusBadgeProps) {
  const getStatusConfig = (status: string) => {
    const configs: Record<string, { label: string; color: string; icon: any }> = {
      UNPAID: {
        label: 'Unpaid',
        color: 'text-gray-700 bg-gray-100',
        icon: Clock,
      },
      PENDING: {
        label: 'Pending',
        color: 'text-amber-700 bg-amber-100',
        icon: Clock,
      },
      SUBMITTED: {
        label: 'Submitted',
        color: 'text-blue-700 bg-blue-100',
        icon: DollarSign,
      },
      CONFIRMED: {
        label: 'Confirmed',
        color: 'text-emerald-700 bg-emerald-100',
        icon: CheckCircle,
      },
      APPROVED: {
        label: 'Approved',
        color: 'text-green-700 bg-green-100',
        icon: CheckCircle,
      },
      REJECTED: {
        label: 'Rejected',
        color: 'text-red-700 bg-red-100',
        icon: XCircle,
      },
      REFUNDED: {
        label: 'Refunded',
        color: 'text-orange-700 bg-orange-100',
        icon: AlertCircle,
      },
      FAILED: {
        label: 'Failed',
        color: 'text-red-700 bg-red-100',
        icon: XCircle,
      },
    };

    return configs[status] || configs.UNPAID;
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  return (
    <Badge 
      className={`inline-flex items-center gap-1.5 font-medium ${config.color} ${sizeClasses[size]}`}
    >
      <Icon className={iconSizes[size]} />
      {config.label}
    </Badge>
  );
}
