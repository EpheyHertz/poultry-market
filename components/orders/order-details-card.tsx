import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { OrderStatusBadge, PaymentStatusBadge } from './order-status-badge';
import {
  Package,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  DollarSign,
  Truck,
  Eye,
  ExternalLink,
} from 'lucide-react';
import { format } from 'date-fns';
import Image from 'next/image';

interface OrderDetailsCardProps {
  order: any;
  showActions?: boolean;
  onViewTimeline?: () => void;
  onApprove?: () => void;
  onUpdateStatus?: () => void;
  onMarkReceived?: () => void;
  onReview?: () => void;
  onConfirmPayment?: () => void;
  userRole?: 'ADMIN' | 'SELLER' | 'CUSTOMER' | 'COMPANY';
  className?: string;
}

export function OrderDetailsCard({
  order,
  showActions = true,
  onViewTimeline,
  onApprove,
  onUpdateStatus,
  onMarkReceived,
  onReview,
  onConfirmPayment,
  userRole,
  className = '',
}: OrderDetailsCardProps) {
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Order Header */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="text-2xl">Order #{order.id.slice(-8)}</CardTitle>
              <CardDescription>
                Placed on {format(new Date(order.createdAt), 'PPP')}
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <OrderStatusBadge status={order.status} size="lg" />
              <PaymentStatusBadge status={order.paymentStatus} size="lg" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Payment Method</p>
              <p className="text-lg font-semibold">
                {order.paymentType === 'BEFORE_DELIVERY' ? 'Prepaid' : 'Cash on Delivery'}
              </p>
              {order.paymentPhone && (
                <p className="text-sm text-muted-foreground">{order.paymentPhone}</p>
              )}
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Order Total</p>
              <p className="text-lg font-semibold text-emerald-600">
                KES {order.total.toLocaleString()}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Last Updated</p>
              <p className="text-sm">{format(new Date(order.updatedAt), 'PPp')}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer Info */}
        {order.customer && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5 text-blue-600" />
                Customer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Name</p>
                <p className="font-semibold">{order.customer.name}</p>
              </div>
              {order.customer.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a href={`mailto:${order.customer.email}`} className="text-blue-600 hover:underline">
                    {order.customer.email}
                  </a>
                </div>
              )}
              {order.customer.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a href={`tel:${order.customer.phone}`} className="text-blue-600 hover:underline">
                    {order.customer.phone}
                  </a>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Delivery Info */}
        {order.delivery && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Truck className="h-5 w-5 text-purple-600" />
                Delivery
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {order.delivery.address && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    Address
                  </p>
                  <p className="text-sm mt-1">{order.delivery.address}</p>
                </div>
              )}
              {order.delivery.trackingId && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Tracking ID</p>
                  <p className="text-sm font-mono bg-muted px-2 py-1 rounded mt-1">
                    {order.delivery.trackingId}
                  </p>
                </div>
              )}
              {order.delivery.agent && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Delivery Agent</p>
                  <p className="text-sm mt-1">{order.delivery.agent.name}</p>
                  {order.delivery.agent.phone && (
                    <a href={`tel:${order.delivery.agent.phone}`} className="text-xs text-blue-600 hover:underline">
                      {order.delivery.agent.phone}
                    </a>
                  )}
                </div>
              )}
              <Badge variant="outline" className="w-full justify-center">
                {order.delivery.status}
              </Badge>
            </CardContent>
          </Card>
        )}

        {/* Payment Info */}
        {order.payment && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-emerald-600" />
                Payment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Method</p>
                <p className="font-semibold">{order.payment.method}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Amount</p>
                <p className="text-lg font-bold text-emerald-600">
                  KES {order.payment.amount.toLocaleString()}
                </p>
              </div>
              {order.payment.transactionCode && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Transaction Code</p>
                  <p className="text-sm font-mono bg-muted px-2 py-1 rounded mt-1">
                    {order.payment.transactionCode}
                  </p>
                </div>
              )}
              <PaymentStatusBadge status={order.payment.status} />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Order Items */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="h-5 w-5 text-amber-600" />
            Order Items ({order.items?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {order.items?.map((item: any, index: number) => (
              <div key={item.id}>
                {index > 0 && <Separator className="my-4" />}
                <div className="flex gap-4">
                  {item.product.images && item.product.images[0] && (
                    <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg border">
                      <Image
                        src={item.product.images[0]}
                        alt={item.product.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                  <div className="flex-1 space-y-1">
                    <p className="font-semibold">{item.product.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Quantity: {item.quantity} × KES {item.price.toLocaleString()}
                    </p>
                    {item.product.seller && (
                      <p className="text-xs text-muted-foreground">
                        Sold by: <span className="font-medium">{item.product.seller.name}</span>
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-lg">
                      KES {(item.quantity * item.price).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Separator className="my-4" />

          {/* Order Summary */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>KES {order.subtotal?.toLocaleString() || '0'}</span>
            </div>
            {order.discountAmount > 0 && (
              <div className="flex justify-between text-sm text-emerald-600">
                <span>Discount {order.voucherCode && `(${order.voucherCode})`}</span>
                <span>-KES {order.discountAmount.toLocaleString()}</span>
              </div>
            )}
            {order.deliveryFee > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Delivery Fee</span>
                <span>KES {order.deliveryFee.toLocaleString()}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span className="text-emerald-600">KES {order.total.toLocaleString()}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delivery Proof */}
      {(order.deliveryProofImages?.length > 0 || order.deliveryProofMessage) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Delivery Proof</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {order.deliveryProofMessage && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Message</p>
                <p className="text-sm bg-muted p-3 rounded-lg">{order.deliveryProofMessage}</p>
              </div>
            )}
            {order.deliveryProofImages?.length > 0 && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Images</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {order.deliveryProofImages.map((image: string, index: number) => (
                    <div key={index} className="relative aspect-square overflow-hidden rounded-lg border">
                      <Image
                        src={image}
                        alt={`Delivery proof ${index + 1}`}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      {showActions && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {onViewTimeline && (
                <Button onClick={onViewTimeline} variant="outline">
                  <Eye className="h-4 w-4 mr-2" />
                  View Timeline
                </Button>
              )}
              
              {userRole === 'ADMIN' && onConfirmPayment && order.paymentStatus !== 'CONFIRMED' && (
                <Button onClick={onConfirmPayment} className="bg-emerald-600 hover:bg-emerald-700">
                  <DollarSign className="h-4 w-4 mr-2" />
                  Confirm Payment
                </Button>
              )}
              
              {(userRole === 'SELLER' || userRole === 'COMPANY') && onApprove && 
                order.status === 'PAID' && order.paymentStatus === 'CONFIRMED' && (
                <Button onClick={onApprove} className="bg-blue-600 hover:bg-blue-700">
                  Approve Order
                </Button>
              )}
              
              {(userRole === 'SELLER' || userRole === 'COMPANY') && onUpdateStatus && 
                (order.status === 'APPROVED' || order.status === 'PACKED' || order.status === 'READY_FOR_DELIVERY' || order.status === 'IN_TRANSIT') && (
                <Button onClick={onUpdateStatus} variant="outline">
                  <Truck className="h-4 w-4 mr-2" />
                  Update Status
                </Button>
              )}
              
              {userRole === 'CUSTOMER' && onMarkReceived && 
                (order.status === 'DELIVERED' || order.status === 'IN_TRANSIT' || order.status === 'READY_FOR_DELIVERY') && (
                <Button onClick={onMarkReceived} className="bg-green-600 hover:bg-green-700">
                  Mark as Received
                </Button>
              )}
              
              {userRole === 'CUSTOMER' && onReview && order.status === 'COMPLETED' && !order.isReviewed && (
                <Button onClick={onReview} variant="outline">
                  Leave a Review
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
