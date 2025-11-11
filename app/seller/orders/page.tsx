'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OrderList } from '@/components/orders/order-list';
import { OrderDetailsCard } from '@/components/orders/order-details-card';
import { OrderTimeline } from '@/components/orders/order-timeline';
import {
  ApproveOrderModal,
  UpdateStatusModal,
} from '@/components/orders/order-action-modals';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Package, 
  Clock,
  CheckCircle,
  Truck,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface OrderStats {
  totalOrders: number;
  pendingApproval: number;
  inProgress: number;
  completed: number;
  totalRevenue: number;
}

export default function SellerOrdersPage() {
  const [user, setUser] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [stats, setStats] = useState<OrderStats>({
    totalOrders: 0,
    pendingApproval: 0,
    inProgress: 0,
    completed: 0,
    totalRevenue: 0,
  });
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showTimelineModal, setShowTimelineModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showUpdateStatusModal, setShowUpdateStatusModal] = useState(false);
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
          if (userData.role !== 'SELLER' && userData.role !== 'COMPANY') {
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
      const response = await fetch('/api/seller/orders');
      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }
      const data = await response.json();
      setOrders(data.orders || []);
      
      // Calculate stats
      const totalOrders = data.orders.length;
      const pendingApproval = data.orders.filter((o: any) => 
        o.status === 'PAID' && o.paymentStatus === 'CONFIRMED'
      ).length;
      const inProgress = data.orders.filter((o: any) => 
        ['APPROVED', 'PACKED', 'READY_FOR_DELIVERY', 'IN_TRANSIT', 'DELIVERED'].includes(o.status)
      ).length;
      const completed = data.orders.filter((o: any) => o.status === 'COMPLETED').length;
      const totalRevenue = data.orders
        .filter((o: any) => o.status === 'COMPLETED')
        .reduce((sum: number, o: any) => sum + o.total, 0);

      setStats({
        totalOrders,
        pendingApproval,
        inProgress,
        completed,
        totalRevenue,
      });
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

  const handleApprove = () => {
    setShowApproveModal(true);
  };

  const handleUpdateStatus = () => {
    setShowUpdateStatusModal(true);
  };

  const handleActionSuccess = () => {
    fetchOrders();
    setShowApproveModal(false);
    setShowUpdateStatusModal(false);
    setShowDetailsModal(false);
  };

  const handleCloseDetails = () => {
    setShowDetailsModal(false);
    setSelectedOrder(null);
  };

  const pendingApprovalOrders = orders.filter((o) => 
    o.status === 'PAID' && o.paymentStatus === 'CONFIRMED'
  );
  const inProgressOrders = orders.filter((o) => 
    ['APPROVED', 'PACKED', 'READY_FOR_DELIVERY', 'IN_TRANSIT'].includes(o.status)
  );
  const deliveredOrders = orders.filter((o) => o.status === 'DELIVERED');
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
          <h1 className="text-3xl font-bold">My Orders</h1>
          <p className="text-muted-foreground mt-2">
            Manage orders for your products
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
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
                <AlertCircle className="h-4 w-4" />
                Pending Approval
              </CardDescription>
              <CardTitle className="text-3xl text-amber-600">{stats.pendingApproval}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <Truck className="h-4 w-4" />
                In Progress
              </CardDescription>
              <CardTitle className="text-3xl text-blue-600">{stats.inProgress}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Completed
              </CardDescription>
              <CardTitle className="text-3xl text-emerald-600">{stats.completed}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Total Revenue
              </CardDescription>
              <CardTitle className="text-2xl text-emerald-600">
                KES {stats.totalRevenue.toLocaleString()}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Orders List with Tabs */}
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5 lg:w-auto">
            <TabsTrigger value="all">
              All ({orders.length})
            </TabsTrigger>
            <TabsTrigger value="approval">
              Needs Approval ({pendingApprovalOrders.length})
            </TabsTrigger>
            <TabsTrigger value="progress">
              In Progress ({inProgressOrders.length})
            </TabsTrigger>
            <TabsTrigger value="delivered">
              Delivered ({deliveredOrders.length})
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

          <TabsContent value="approval">
            <OrderList
              orders={pendingApprovalOrders}
              onViewDetails={handleViewDetails}
              showCustomer={true}
              loading={loading}
            />
          </TabsContent>

          <TabsContent value="progress">
            <OrderList
              orders={inProgressOrders}
              onViewDetails={handleViewDetails}
              showCustomer={true}
              loading={loading}
            />
          </TabsContent>

          <TabsContent value="delivered">
            <OrderList
              orders={deliveredOrders}
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
              onApprove={
                selectedOrder.status === 'PAID' && selectedOrder.paymentStatus === 'CONFIRMED'
                  ? handleApprove
                  : undefined
              }
              onUpdateStatus={
                ['APPROVED', 'PACKED', 'READY_FOR_DELIVERY', 'IN_TRANSIT'].includes(selectedOrder.status)
                  ? handleUpdateStatus
                  : undefined
              }
              userRole={user?.role === 'COMPANY' ? 'COMPANY' : 'SELLER'}
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

      {/* Action Modals */}
      {selectedOrder && (
        <>
          <ApproveOrderModal
            isOpen={showApproveModal}
            onClose={() => setShowApproveModal(false)}
            orderId={selectedOrder.id}
            onSuccess={handleActionSuccess}
          />
          <UpdateStatusModal
            isOpen={showUpdateStatusModal}
            onClose={() => setShowUpdateStatusModal(false)}
            orderId={selectedOrder.id}
            currentStatus={selectedOrder.status}
            onSuccess={handleActionSuccess}
          />
        </>
      )}
    </DashboardLayout>
  );
}
