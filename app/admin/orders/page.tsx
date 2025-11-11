'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OrderList } from '@/components/orders/order-list';
import { OrderDetailsCard } from '@/components/orders/order-details-card';
import { OrderTimeline } from '@/components/orders/order-timeline';
import { ConfirmPaymentModal } from '@/components/orders/order-action-modals';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Package, 
  DollarSign, 
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  Loader2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface OrderStats {
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  totalRevenue: number;
  pendingPayments: number;
  confirmedPayments: number;
}

export default function AdminOrdersPage() {
  const [user, setUser] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [stats, setStats] = useState<OrderStats>({
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    totalRevenue: 0,
    pendingPayments: 0,
    confirmedPayments: 0,
  });
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showTimelineModal, setShowTimelineModal] = useState(false);
  const [showConfirmPaymentModal, setShowConfirmPaymentModal] = useState(false);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const userData = await response.json();
          if (userData.role !== 'ADMIN') {
            router.push('/');
            return;
          }
          setUser(userData);
        } else {
          router.push('/auth/signin');
        }
      } catch (error) {
        console.error('Failed to fetch user:', error);
        router.push('/auth/signin');
      }
    };

    fetchUser();
  }, [router]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/orders');
      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }
      const data = await response.json();
      setOrders(data.orders || []);
      setStats(data.stats || stats);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch orders',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchOrders();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchTimeline = async (orderId: string) => {
    try {
      setTimelineLoading(true);
      const response = await fetch(`/api/orders/${orderId}/timeline`);
      if (!response.ok) {
        throw new Error('Failed to fetch timeline');
      }
      const data = await response.json();
      setTimeline(data.timeline || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch timeline',
        variant: 'destructive',
      });
    } finally {
      setTimelineLoading(false);
    }
  };

  const handleViewDetails = (order: any) => {
    setSelectedOrder(order);
    setShowDetailsModal(true);
  };

  const handleViewTimeline = () => {
    if (selectedOrder) {
      fetchTimeline(selectedOrder.id);
      setShowTimelineModal(true);
    }
  };

  const handleConfirmPayment = () => {
    setShowConfirmPaymentModal(true);
  };

  const handlePaymentConfirmed = () => {
    fetchOrders();
    setShowConfirmPaymentModal(false);
    setShowDetailsModal(false);
    toast({
      title: 'Success',
      description: 'Payment has been confirmed successfully',
    });
  };

  const handleCloseDetails = () => {
    setShowDetailsModal(false);
    setSelectedOrder(null);
  };

  const pendingOrders = orders.filter((o) => o.status === 'PENDING' || o.status === 'PAID');
  const approvedOrders = orders.filter((o) => o.status === 'APPROVED' || o.status === 'PACKED' || o.status === 'READY_FOR_DELIVERY');
  const inTransitOrders = orders.filter((o) => o.status === 'IN_TRANSIT' || o.status === 'DELIVERED');
  const completedOrders = orders.filter((o) => o.status === 'COMPLETED');

  if (!user) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={user}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Orders Management</h1>
          <p className="text-muted-foreground mt-2">
            View and manage all orders across the platform
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Total Orders
              </CardDescription>
              <CardTitle className="text-3xl">{stats.totalOrders}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Pending
              </CardDescription>
              <CardTitle className="text-3xl text-amber-600">{stats.pendingOrders}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Completed
              </CardDescription>
              <CardTitle className="text-3xl text-emerald-600">{stats.completedOrders}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Total Revenue
              </CardDescription>
              <CardTitle className="text-2xl text-emerald-600">
                KES {stats?.totalRevenue?.toLocaleString()}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Pending Payments
              </CardDescription>
              <CardTitle className="text-3xl text-amber-600">{stats.pendingPayments}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Confirmed Payments
              </CardDescription>
              <CardTitle className="text-3xl text-emerald-600">{stats.confirmedPayments}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Orders List with Tabs */}
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5 lg:w-auto">
            <TabsTrigger value="all">
              All ({orders.length})
            </TabsTrigger>
            <TabsTrigger value="pending">
              Pending ({pendingOrders.length})
            </TabsTrigger>
            <TabsTrigger value="approved">
              Processing ({approvedOrders.length})
            </TabsTrigger>
            <TabsTrigger value="transit">
              In Transit ({inTransitOrders.length})
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completed ({completedOrders.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <OrderList
              orders={orders}
              onViewDetails={handleViewDetails}
              showCustomer={true}
              loading={loading}
            />
          </TabsContent>

          <TabsContent value="pending">
            <OrderList
              orders={pendingOrders}
              onViewDetails={handleViewDetails}
              showCustomer={true}
              loading={loading}
            />
          </TabsContent>

          <TabsContent value="approved">
            <OrderList
              orders={approvedOrders}
              onViewDetails={handleViewDetails}
              showCustomer={true}
              loading={loading}
            />
          </TabsContent>

          <TabsContent value="transit">
            <OrderList
              orders={inTransitOrders}
              onViewDetails={handleViewDetails}
              showCustomer={true}
              loading={loading}
            />
          </TabsContent>

          <TabsContent value="completed">
            <OrderList
              orders={completedOrders}
              onViewDetails={handleViewDetails}
              showCustomer={true}
              loading={loading}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Order Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={handleCloseDetails}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <OrderDetailsCard
              order={selectedOrder}
              showActions={true}
              onViewTimeline={handleViewTimeline}
              onConfirmPayment={
                selectedOrder.paymentStatus === 'SUBMITTED' || selectedOrder.paymentStatus === 'PENDING'
                  ? handleConfirmPayment
                  : undefined
              }
              userRole="ADMIN"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Timeline Modal */}
      <Dialog open={showTimelineModal} onOpenChange={setShowTimelineModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order Timeline</DialogTitle>
          </DialogHeader>
          {timelineLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <OrderTimeline events={timeline} />
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm Payment Modal */}
      {selectedOrder && (
        <ConfirmPaymentModal
          isOpen={showConfirmPaymentModal}
          onClose={() => setShowConfirmPaymentModal(false)}
          orderId={selectedOrder.id}
          onSuccess={handlePaymentConfirmed}
        />
      )}
    </DashboardLayout>
  );
}
