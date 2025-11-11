'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { OrderStatusBadge, PaymentStatusBadge } from './order-status-badge';
import { Search, Filter, Eye, Package, Calendar, User } from 'lucide-react';
import { format } from 'date-fns';
import Image from 'next/image';

interface OrderListProps {
  orders: any[];
  onViewDetails: (order: any) => void;
  showCustomer?: boolean;
  showSeller?: boolean;
  loading?: boolean;
  className?: string;
}

export function OrderList({
  orders,
  onViewDetails,
  showCustomer = true,
  showSeller = false,
  loading = false,
  className = '',
}: OrderListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [paymentFilter, setPaymentFilter] = useState('ALL');

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      !searchQuery ||
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer?.email?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || order.status === statusFilter;
    const matchesPayment = paymentFilter === 'ALL' || order.paymentStatus === paymentFilter;

    return matchesSearch && matchesStatus && matchesPayment;
  });

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-20 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by order ID, customer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="PAID">Paid</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="PACKED">Packed</SelectItem>
                <SelectItem value="READY_FOR_DELIVERY">Ready for Delivery</SelectItem>
                <SelectItem value="IN_TRANSIT">In Transit</SelectItem>
                <SelectItem value="DELIVERED">Delivered</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={paymentFilter} onValueChange={setPaymentFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Payment Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Payment Statuses</SelectItem>
                <SelectItem value="UNPAID">Unpaid</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="SUBMITTED">Submitted</SelectItem>
                <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Order List */}
      {filteredOrders.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">No orders found</p>
            <p className="text-sm text-muted-foreground">
              {searchQuery || statusFilter !== 'ALL' || paymentFilter !== 'ALL'
                ? 'Try adjusting your filters'
                : 'Orders will appear here when customers make purchases'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <Card key={order.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-0">
                <div className="p-6">
                  {/* Order Header */}
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-lg">Order #{order.id.slice(-8)}</h3>
                        <OrderStatusBadge status={order.status} />
                        <PaymentStatusBadge status={order.paymentStatus} />
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(order.createdAt), 'PPp')}
                        </div>
                        {showCustomer && order.customer && (
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {order.customer.name}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <p className="text-2xl font-bold text-emerald-600">
                        KES {order.total.toLocaleString()}
                      </p>
                      <Button
                        onClick={() => onViewDetails(order)}
                        size="sm"
                        variant="outline"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                    </div>
                  </div>

                  {/* Order Items Preview */}
                  <div className="border-t pt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm font-medium">
                        {order.items?.length || 0} {order.items?.length === 1 ? 'item' : 'items'}
                      </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {order.items?.slice(0, 3).map((item: any) => (
                        <div key={item.id} className="flex gap-3 p-2 rounded-lg border">
                          {item.product.images?.[0] && (
                            <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded">
                              <Image
                                src={item.product.images[0]}
                                alt={item.product.name}
                                fill
                                className="object-cover"
                              />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{item.product.name}</p>
                            <p className="text-xs text-muted-foreground">
                              Qty: {item.quantity} × KES {item.price.toLocaleString()}
                            </p>
                            {showSeller && item.product.seller && (
                              <p className="text-xs text-muted-foreground truncate">
                                By: {item.product.seller.name}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                      {order.items?.length > 3 && (
                        <div className="flex items-center justify-center p-2 rounded-lg border border-dashed">
                          <p className="text-sm text-muted-foreground">
                            +{order.items.length - 3} more
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Quick Info */}
                  <div className="border-t mt-4 pt-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground mb-1">Payment Method</p>
                        <p className="font-medium">
                          {order.paymentType === 'BEFORE_DELIVERY' ? 'Prepaid' : 'Cash on Delivery'}
                        </p>
                      </div>
                      {order.delivery?.status && (
                        <div>
                          <p className="text-muted-foreground mb-1">Delivery Status</p>
                          <Badge variant="outline">{order.delivery.status}</Badge>
                        </div>
                      )}
                      {order.delivery?.trackingId && (
                        <div>
                          <p className="text-muted-foreground mb-1">Tracking ID</p>
                          <p className="font-mono text-xs">{order.delivery.trackingId}</p>
                        </div>
                      )}
                      {order.payment?.transactionCode && (
                        <div>
                          <p className="text-muted-foreground mb-1">Transaction Code</p>
                          <p className="font-mono text-xs">{order.payment.transactionCode}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
