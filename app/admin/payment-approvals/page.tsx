'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  CreditCard, 
  CheckCircle, 
  XCircle, 
  Eye, 
  Clock, 
  Phone,
  User,
  Package
} from 'lucide-react';
import { toast } from 'sonner';

export default function AdminPaymentApprovals() {
  const [user, setUser] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const userData = await response.json();
          if (userData.role !== 'ADMIN') {
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
      fetchPendingPayments();
    }
  }, [user]);

  const fetchPendingPayments = async () => {
    try {
      const response = await fetch('/api/admin/payment-approvals');
      if (response.ok) {
        const data = await response.json();
        const processedOrders = data.orders.map((order: any) => ({
          ...order,
          paymentDetails: order.paymentDetails || null,
          paymentPhone: order.paymentDetails?.phone || null,
          paymentReference: order.paymentDetails?.reference || null
        }));
        setOrders(processedOrders);
      }
    } catch (error) {
      console.error('Failed to fetch pending payments:', error);
      toast.error('Failed to load payment approvals');
    }
  };

  const handlePaymentApproval = async (orderId: string, action: 'APPROVE' | 'REJECT') => {
    setIsLoading(true);

    try {
      const response = await fetch(`/api/admin/payment-approvals/${orderId}`, {
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
        fetchPendingPayments();
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

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'SUBMITTED': return 'bg-blue-100 text-blue-800';
      case 'APPROVED': return 'bg-green-100 text-green-800';
      case 'REJECTED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const filteredOrders = orders.filter(order =>
    order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (order.paymentDetails?.phone && order.paymentDetails.phone.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (order.paymentDetails?.reference && order.paymentDetails.reference.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <DashboardLayout user={user}>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Payment Approvals</h1>
          <p className="text-gray-600 mt-2">Review and approve customer payments</p>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="p-6">
            <div className="relative">
              <Input
                placeholder="Search by order ID, customer name, phone, or reference..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-4"
              />
            </div>
          </CardContent>
        </Card>

        {/* Pending Payments */}
        <div className="space-y-6">
          {filteredOrders.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <CreditCard className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No pending payments</h3>
                <p className="mt-1 text-sm text-gray-500">
                  All payments have been processed.
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredOrders.map((order) => (
              <Card key={order.id} className="overflow-hidden">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-xl">Order #{order.id.slice(-8)}</CardTitle>
                      <CardDescription>
                        Customer: {order.customer?.name} • {new Date(order.createdAt).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <Badge className={getPaymentStatusColor(order.paymentStatus)}>
                      {order.paymentStatus}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Order Summary */}
                    <div>
                      <h4 className="font-semibold mb-3 flex items-center">
                        <Package className="h-4 w-4 mr-2" />
                        Order Summary
                      </h4>
                      <div className="space-y-2">
                        {order.items.map((item: any) => (
                          <div key={item.id} className="flex justify-between text-sm">
                            <span>{item.product.name} x{item.quantity}</span>
                            <span>{formatCurrency(item.price * item.quantity)}</span>
                          </div>
                        ))}
                        <div className="border-t pt-2">
                          <div className="flex justify-between text-sm">
                            <span>Subtotal:</span>
                            <span>{formatCurrency(order.subtotal)}</span>
                          </div>
                          {order.discountAmount > 0 && (
                            <div className="flex justify-between text-sm text-green-600">
                              <span>Discount:</span>
                              <span>-{formatCurrency(order.discountAmount)}</span>
                            </div>
                          )}
                          <div className="flex justify-between font-semibold">
                            <span>Total:</span>
                            <span>{formatCurrency(order.total)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Payment Information */}
                    <div>
                      <h4 className="font-semibold mb-3 flex items-center">
                        <CreditCard className="h-4 w-4 mr-2" />
                        Payment Information
                      </h4>
                      <div className="space-y-3">
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-sm font-medium">Payment Method: {order.paymentType}</p>
                          {order.paymentDetails?.phone && (
                            <p className="text-sm text-gray-600 flex items-center">
                              <Phone className="h-3 w-3 mr-1" />
                              {order.paymentDetails.phone}
                            </p>
                          )}
                          {order.paymentDetails?.reference && (
                            <p className="text-sm text-gray-600">
                              Reference: {order.paymentDetails.reference}
                            </p>
                          )}
                          {order.paymentDetails?.message && (
                            <p className="text-sm text-gray-600">
                              Message: {order.paymentDetails.message}
                            </p>
                          )}
                          {order.paymentDetails?.code && (
                            <p className="text-sm text-gray-600">
                              Transaction Code: {order.paymentDetails.code}
                            </p>
                          )}
                        </div>

                        <div className="bg-blue-50 p-3 rounded-lg">
                          <h5 className="font-medium text-sm mb-1 flex items-center">
                            <User className="h-3 w-3 mr-1" />
                            Customer Information
                          </h5>
                          <p className="text-sm">{order.customer?.name}</p>
                          <p className="text-sm text-gray-600">{order.customer?.email}</p>
                          <p className="text-sm text-gray-600">{order.customer?.phone}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-6 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            onClick={() => setSelectedOrder(order)}
                            variant="outline"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Review Payment
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle>Review Payment</DialogTitle>
                            <DialogDescription>
                              Review and approve/reject payment for order #{order.id.slice(-8)}
                            </DialogDescription>
                          </DialogHeader>
                          
                          <div className="space-y-4">
                            <div className="p-4 bg-gray-50 rounded-lg">
                              <h4 className="font-medium mb-2">Payment Details</h4>
                              <p className="text-sm"><strong>Amount:</strong> {formatCurrency(order.total)}</p>
                              <p className="text-sm"><strong>Method:</strong> {order.paymentType}</p>
                              {order.paymentDetails?.phone && (
                                <p className="text-sm"><strong>Phone:</strong> {order.paymentDetails.phone}</p>
                              )}
                              {order.paymentDetails?.reference && (
                                <p className="text-sm"><strong>Reference:</strong> {order.paymentDetails.reference}</p>
                              )}
                              {order.paymentDetails?.code && (
                                <p className="text-sm"><strong>Transaction Code:</strong> {order.paymentDetails.code}</p>
                              )}
                            </div>

                            <div>
                              <Label htmlFor="approvalNotes">Notes (Optional)</Label>
                              <Textarea
                                id="approvalNotes"
                                placeholder="Add any notes about this payment approval..."
                                value={approvalNotes}
                                onChange={(e) => setApprovalNotes(e.target.value)}
                                className="mt-1"
                              />
                            </div>

                            <div className="flex space-x-2">
                              <Button
                                onClick={() => handlePaymentApproval(order.id, 'APPROVE')}
                                disabled={isLoading}
                                className="flex-1 bg-green-600 hover:bg-green-700"
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Approve
                              </Button>
                              <Button
                                onClick={() => handlePaymentApproval(order.id, 'REJECT')}
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
                    <div className="text-sm text-gray-500">
                      Submitted: {new Date(order.createdAt).toLocaleString()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}