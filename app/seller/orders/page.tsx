'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  ShoppingCart, 
  Package, 
  Clock, 
  CheckCircle, 
  Truck, 
  CreditCard,
  Eye,
  XCircle
} from 'lucide-react';
import { toast } from 'sonner';

export default function SellerOrders() {
  const [user, setUser] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const userData = await response.json();
          if (userData.role !== 'SELLER' && userData.role !== 'COMPANY') {
            router.push('/auth/login');
            return;
          }
          setUser(userData);
        } else {
          router.push('/auth/login');
        }
      } catch (error) {
        router.push('/auth/login');
      }
    };

    fetchUser();
  }, [router]);

  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [user]);

  const fetchOrders = async () => {
    try {
      const response = await fetch('/api/orders');
      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders);
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    }
  };

  const handlePaymentApproval = async (action: 'APPROVE' | 'REJECT') => {
    setIsLoading(true);

    try {
      const response = await fetch(`/api/orders/${selectedOrder.id}/approve-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          notes: approvalNotes
        }),
      });

      if (response.ok) {
        toast.success(`Payment ${action.toLowerCase()}d successfully!`);
        setSelectedOrder(null);
        setApprovalNotes('');
        fetchOrders();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to process payment approval');
      }
    } catch (error) {
      toast.error('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'CONFIRMED': return 'bg-blue-100 text-blue-800';
      case 'PACKED': return 'bg-purple-100 text-purple-800';
      case 'OUT_FOR_DELIVERY': return 'bg-orange-100 text-orange-800';
      case 'DELIVERED': return 'bg-green-100 text-green-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'UNPAID': return 'bg-red-100 text-red-800';
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'SUBMITTED': return 'bg-blue-100 text-blue-800';
      case 'APPROVED': return 'bg-green-100 text-green-800';
      case 'REJECTED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING': return Clock;
      case 'CONFIRMED': return CheckCircle;
      case 'PACKED': return Package;
      case 'OUT_FOR_DELIVERY': return Truck;
      case 'DELIVERED': return CheckCircle;
      default: return Clock;
    }
  };

  const needsPaymentApproval = (order: any) => {
    return order.paymentStatus === 'SUBMITTED';
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <DashboardLayout user={user}>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Orders</h1>
          <p className="text-gray-600 mt-2">Manage your orders and approve payments</p>
        </div>

        {/* Orders List */}
        <div className="space-y-6">
          {orders.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <ShoppingCart className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No orders yet</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Orders for your products will appear here.
                </p>
              </CardContent>
            </Card>
          ) : (
            orders.map((order) => {
              const StatusIcon = getStatusIcon(order.status);
              return (
                <Card key={order.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="flex items-center space-x-2">
                          <StatusIcon className="h-5 w-5" />
                          <span>Order #{order.id.slice(-8)}</span>
                        </CardTitle>
                        <CardDescription>
                          From {order.customer.name} • {new Date(order.createdAt).toLocaleDateString()}
                        </CardDescription>
                      </div>
                      <div className="flex flex-col space-y-2">
                        <Badge className={getStatusColor(order.status)}>
                          {order.status.replace('_', ' ')}
                        </Badge>
                        <Badge className={getPaymentStatusColor(order.paymentStatus)}>
                          Payment: {order.paymentStatus}
                        </Badge>
                        <Badge variant="outline">
                          {order.paymentType.replace('_', ' ')}
                        </Badge>
                        {needsPaymentApproval(order) && (
                          <Badge className="bg-orange-100 text-orange-800">
                            Needs Approval
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Order Items */}
                      <div>
                        <h4 className="font-medium mb-2">Items:</h4>
                        <div className="space-y-2">
                          {order.items.map((item: any) => (
                            <div key={item.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                              <div>
                                <span className="font-medium">{item.product.name}</span>
                                <span className="text-gray-500 ml-2">x{item.quantity}</span>
                              </div>
                              <span>${(item.price * item.quantity).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Total */}
                      <div className="flex justify-between items-center pt-2 border-t">
                        <span className="font-medium">Total:</span>
                        <span className="text-xl font-bold">${order.total.toFixed(2)}</span>
                      </div>

                      {/* Customer Info */}
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <h4 className="font-medium mb-1">Customer Information</h4>
                        <p className="text-sm text-gray-600">
                          Name: {order.customer.name}
                        </p>
                        <p className="text-sm text-gray-600">
                          Email: {order.customer.email}
                        </p>
                      </div>

                      {/* Delivery Agent Info */}
                      {order.delivery && (
                        <div className="p-3 bg-green-50 rounded-lg">
                          <h4 className="font-medium mb-1 flex items-center">
                            <Truck className="h-4 w-4 mr-2" />
                            Delivery Status
                          </h4>
                          <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                            <p>Tracking: {order.delivery.trackingId}</p>
                            <p>Status: {order.delivery.status.replace('_', ' ')}</p>
                            {order.delivery.agentName && (
                              <>
                                <p>Agent: {order.delivery.agentName}</p>
                                {order.delivery.agentPhone && (
                                  <p>Phone: {order.delivery.agentPhone}</p>
                                )}
                              </>
                            )}
                            {!order.delivery.agentId && (
                              <p className="col-span-2 text-orange-600">⚠️ No delivery agent assigned</p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Payment Details */}
                      {order.paymentDetails && (
                        <div className="p-3 bg-green-50 rounded-lg">
                          <h4 className="font-medium mb-1">Payment Details</h4>
                          <p className="text-sm text-gray-600">Phone: {order.paymentPhone}</p>
                          <p className="text-sm text-gray-600">Reference: {order.paymentReference}</p>
                          <p className="text-sm text-gray-600 mt-2">Message:</p>
                          <p className="text-xs text-gray-500 bg-white p-2 rounded border">
                            {order.paymentDetails}
                          </p>
                        </div>
                      )}

                      {/* Payment Approval Actions */}
                      {needsPaymentApproval(order) && (
                        <div className="flex space-x-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                onClick={() => setSelectedOrder(order)}
                                className="flex-1"
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                Review Payment
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Review Payment</DialogTitle>
                                <DialogDescription>
                                  Review and approve/reject payment for order #{order.id.slice(-8)}
                                </DialogDescription>
                              </DialogHeader>
                              
                              <div className="space-y-4">
                                <div className="p-4 bg-gray-50 rounded-lg">
                                  <h4 className="font-medium mb-2">Payment Information</h4>
                                  <p className="text-sm"><strong>Phone:</strong> {order.paymentPhone}</p>
                                  <p className="text-sm"><strong>Reference:</strong> {order.paymentReference}</p>
                                  <p className="text-sm mt-2"><strong>M-Pesa Message:</strong></p>
                                  <p className="text-xs bg-white p-2 rounded border mt-1">
                                    {order.paymentDetails}
                                  </p>
                                </div>

                                <div className="space-y-2">
                                  <Label htmlFor="notes">Notes (Optional)</Label>
                                  <Textarea
                                    id="notes"
                                    value={approvalNotes}
                                    onChange={(e) => setApprovalNotes(e.target.value)}
                                    placeholder="Add any notes about your decision..."
                                    rows={3}
                                  />
                                </div>

                                <div className="flex space-x-2">
                                  <Button
                                    onClick={() => handlePaymentApproval('APPROVE')}
                                    disabled={isLoading}
                                    className="flex-1 bg-green-600 hover:bg-green-700"
                                  >
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Approve
                                  </Button>
                                  <Button
                                    onClick={() => handlePaymentApproval('REJECT')}
                                    disabled={isLoading}
                                    variant="destructive"
                                    className="flex-1"
                                  >
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Reject
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      )}

                      {/* Payment Approval History */}
                      {order.paymentApprovals && order.paymentApprovals.length > 0 && (
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <h4 className="font-medium mb-2">Payment History</h4>
                          {order.paymentApprovals.map((approval: any) => (
                            <div key={approval.id} className="text-sm text-gray-600 mb-1">
                              <span className="font-medium">{approval.action}</span> by {approval.approver.name} 
                              <span className="text-gray-400 ml-2">
                                {new Date(approval.createdAt).toLocaleDateString()}
                              </span>
                              {approval.notes && (
                                <p className="text-xs text-gray-500 mt-1">{approval.notes}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}