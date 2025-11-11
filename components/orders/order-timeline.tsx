import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Clock, 
  CheckCircle, 
  Package, 
  User, 
  Calendar,
  AlertCircle,
  Truck,
  MapPin,
  DollarSign,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface TimelineEvent {
  id: string;
  action: string;
  description: string;
  actorRole: string;
  actorName: string | null;
  oldStatus: string | null;
  newStatus: string | null;
  metadata: string | null;
  createdAt: string;
}

interface OrderTimelineProps {
  events: TimelineEvent[];
  className?: string;
}

export function OrderTimeline({ events, className = '' }: OrderTimelineProps) {
  const getEventIcon = (action: string) => {
    const icons: Record<string, any> = {
      'ORDER_CREATED': Package,
      'PAYMENT_SUBMITTED': DollarSign,
      'PAYMENT_CONFIRMED': CheckCircle,
      'PAYMENT_FAILED': AlertCircle,
      'ORDER_APPROVED': CheckCircle,
      'ORDER_REJECTED': AlertCircle,
      'STATUS_UPDATED': Truck,
      'DELIVERY_ASSIGNED': Truck,
      'DELIVERY_STARTED': Truck,
      'DELIVERY_COMPLETED': CheckCircle,
      'ORDER_RECEIVED': MapPin,
      'ORDER_COMPLETED': CheckCircle,
      'REVIEW_SUBMITTED': User,
    };

    return icons[action] || Clock;
  };

  const getEventColor = (action: string) => {
    const colors: Record<string, string> = {
      'ORDER_CREATED': 'bg-blue-100 text-blue-700',
      'PAYMENT_SUBMITTED': 'bg-amber-100 text-amber-700',
      'PAYMENT_CONFIRMED': 'bg-emerald-100 text-emerald-700',
      'PAYMENT_FAILED': 'bg-red-100 text-red-700',
      'ORDER_APPROVED': 'bg-green-100 text-green-700',
      'ORDER_REJECTED': 'bg-red-100 text-red-700',
      'STATUS_UPDATED': 'bg-purple-100 text-purple-700',
      'DELIVERY_ASSIGNED': 'bg-cyan-100 text-cyan-700',
      'DELIVERY_STARTED': 'bg-indigo-100 text-indigo-700',
      'DELIVERY_COMPLETED': 'bg-emerald-100 text-emerald-700',
      'ORDER_RECEIVED': 'bg-teal-100 text-teal-700',
      'ORDER_COMPLETED': 'bg-green-100 text-green-700',
      'REVIEW_SUBMITTED': 'bg-violet-100 text-violet-700',
    };

    return colors[action] || 'bg-gray-100 text-gray-700';
  };

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      'SYSTEM': 'text-gray-600',
      'CUSTOMER': 'text-blue-600',
      'SELLER': 'text-purple-600',
      'ADMIN': 'text-red-600',
      'DELIVERY_AGENT': 'text-cyan-600',
    };

    return colors[role] || 'text-gray-600';
  };

  if (!events || events.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg">Order Timeline</CardTitle>
          <CardDescription>Track all activities for this order</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            No timeline events yet
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg">Order Timeline</CardTitle>
        <CardDescription>Track all activities for this order</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative space-y-4">
          {/* Timeline line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />

          {events.map((event, index) => {
            const Icon = getEventIcon(event.action);
            const eventColor = getEventColor(event.action);
            const roleColor = getRoleColor(event.actorRole);

            return (
              <div key={event.id} className="relative flex gap-4 group">
                {/* Icon */}
                <div className={`relative z-10 flex h-12 w-12 items-center justify-center rounded-full ${eventColor} flex-shrink-0 shadow-sm`}>
                  <Icon className="h-5 w-5" />
                </div>

                {/* Content */}
                <div className="flex-1 pb-4">
                  <div className="rounded-lg border bg-card p-4 shadow-sm transition-all hover:shadow-md">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-semibold text-foreground">
                          {event.description}
                        </p>
                        {event.actorName && (
                          <p className="text-xs text-muted-foreground">
                            by <span className={`font-medium ${roleColor}`}>
                              {event.actorName}
                            </span>
                            {' '}
                            <Badge variant="outline" className="text-xs">
                              {event.actorRole}
                            </Badge>
                          </p>
                        )}
                        {event.oldStatus && event.newStatus && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                            <Badge variant="outline" className="text-xs">
                              {event.oldStatus}
                            </Badge>
                            <span>→</span>
                            <Badge variant="outline" className="text-xs">
                              {event.newStatus}
                            </Badge>
                          </div>
                        )}
                        {event.metadata && (() => {
                          try {
                            const metadata = JSON.parse(event.metadata);
                            return Object.keys(metadata).length > 0 && (
                              <div className="mt-2 text-xs text-muted-foreground bg-muted/50 rounded p-2">
                                {Object.entries(metadata).map(([key, value]) => (
                                  <div key={key} className="flex gap-2">
                                    <span className="font-medium">{key}:</span>
                                    <span>{String(value)}</span>
                                  </div>
                                ))}
                              </div>
                            );
                          } catch {
                            return null;
                          }
                        })()}
                      </div>
                      <div className="text-xs text-muted-foreground text-right flex-shrink-0">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDistanceToNow(new Date(event.createdAt), { addSuffix: true })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
