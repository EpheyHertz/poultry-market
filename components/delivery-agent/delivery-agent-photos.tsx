'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { 
  Camera,
  Package,
  CheckCircle,
  Clock,
  Eye,
  Upload,
  Image as ImageIcon,
  MapPin,
  Calendar,
  Truck
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { format } from 'date-fns';
import DeliveryPhotoManager from '@/components/delivery/delivery-photo-manager';

interface DeliveryWithPhotos {
  id: string;
  trackingId: string;
  status: string;
  address: string;
  estimatedDelivery?: string;
  actualDelivery?: string;
  order: {
    id: string;
    total: number;
    customer: {
      name: string;
      phone?: string;
    };
    items: {
      product: {
        name: string;
      };
      quantity: number;
    }[];
  };
  deliveryPhotos: {
    id: string;
    photoUrl: string;
    photoType: string;
    createdAt: string;
  }[];
}

export default function DeliveryAgentPhotos() {
  const [deliveries, setDeliveries] = useState<DeliveryWithPhotos[]>([]);
  const [selectedDelivery, setSelectedDelivery] = useState<DeliveryWithPhotos | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalDeliveries: 0,
    totalPhotos: 0,
    completedDeliveries: 0,
    pendingDeliveries: 0
  });
  const { toast } = useToast();
    const fetchDeliveries = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/delivery-agent/deliveries');
      const data = await response.json();

      if (data.success) {
        setDeliveries(data.deliveries);
        calculateStats(data.deliveries);
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to load deliveries",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error fetching deliveries:', error);
      toast({
        title: "Error",
        description: "Failed to load deliveries",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchDeliveries();
  }, [fetchDeliveries]);



  const calculateStats = (deliveries: DeliveryWithPhotos[]) => {
    const totalPhotos = deliveries.reduce((sum, delivery) => sum + delivery.deliveryPhotos.length, 0);
    const completedDeliveries = deliveries.filter(d => d.status === 'DELIVERED').length;
    const pendingDeliveries = deliveries.filter(d => ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'].includes(d.status)).length;

    setStats({
      totalDeliveries: deliveries.length,
      totalPhotos,
      completedDeliveries,
      pendingDeliveries
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ASSIGNED': return 'bg-blue-100 text-blue-800';
      case 'PICKED_UP': return 'bg-yellow-100 text-yellow-800';
      case 'IN_TRANSIT': return 'bg-orange-100 text-orange-800';
      case 'OUT_FOR_DELIVERY': return 'bg-purple-100 text-purple-800';
      case 'DELIVERED': return 'bg-green-100 text-green-800';
      case 'FAILED': return 'bg-red-100 text-red-800';
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-600">Loading your deliveries...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Deliveries & Photos</h1>
        <p className="text-gray-600 mt-1">Manage your delivery photos and track your deliveries</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Deliveries</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalDeliveries}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Photos Uploaded</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalPhotos}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Camera className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-3xl font-bold text-gray-900">{stats.completedDeliveries}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-3xl font-bold text-gray-900">{stats.pendingDeliveries}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Clock className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Deliveries List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {deliveries.map((delivery) => (
          <Card key={delivery.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">#{delivery.trackingId}</CardTitle>
                <Badge className={getStatusColor(delivery.status)}>
                  {delivery.status.replace('_', ' ')}
                </Badge>
              </div>
              <CardDescription>
                Order value: {formatCurrency(delivery.order.total)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Customer Info */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{delivery.order.customer.name}</p>
                    {delivery.order.customer.phone && (
                      <p className="text-sm text-gray-600">{delivery.order.customer.phone}</p>
                    )}
                  </div>
                  <Link href={`/order/${delivery.order.id}`}>
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-1" />
                      View Order
                    </Button>
                  </Link>
                </div>

                {/* Address */}
                <div className="flex items-start space-x-2">
                  <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-gray-600">{delivery.address}</p>
                </div>

                {/* Items */}
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Items:</p>
                  <div className="space-y-1">
                    {delivery.order.items.slice(0, 2).map((item, index) => (
                      <p key={index} className="text-sm text-gray-600">
                        {item.quantity}x {item.product.name}
                      </p>
                    ))}
                    {delivery.order.items.length > 2 && (
                      <p className="text-sm text-gray-500">
                        +{delivery.order.items.length - 2} more items
                      </p>
                    )}
                  </div>
                </div>

                {/* Delivery Times */}
                {(delivery.estimatedDelivery || delivery.actualDelivery) && (
                  <div className="space-y-1">
                    {delivery.estimatedDelivery && (
                      <div className="flex items-center space-x-2 text-sm">
                        <Calendar className="h-3 w-3 text-gray-400" />
                        <span className="text-gray-600">
                          Est: {format(new Date(delivery.estimatedDelivery), 'MMM d, HH:mm')}
                        </span>
                      </div>
                    )}
                    {delivery.actualDelivery && (
                      <div className="flex items-center space-x-2 text-sm">
                        <CheckCircle className="h-3 w-3 text-green-500" />
                        <span className="text-gray-600">
                          Delivered: {format(new Date(delivery.actualDelivery), 'MMM d, HH:mm')}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Photos Summary */}
                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="flex items-center space-x-2">
                    <ImageIcon className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      {delivery.deliveryPhotos.length} photo{delivery.deliveryPhotos.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedDelivery(delivery)}
                  >
                    <Camera className="h-4 w-4 mr-1" />
                    Manage Photos
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {deliveries.length === 0 && !isLoading && (
        <Card>
          <CardContent className="text-center py-12">
            <Truck className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No deliveries yet</h3>
            <p className="text-gray-600">
              Your assigned deliveries will appear here.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Photo Management Modal */}
      {selectedDelivery && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto w-full">
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="text-xl font-bold">Delivery Photos</h2>
                <p className="text-gray-600">#{selectedDelivery.trackingId} - {selectedDelivery.order.customer.name}</p>
              </div>
              <Button
                variant="ghost"
                onClick={() => setSelectedDelivery(null)}
              >
                ×
              </Button>
            </div>
            <div className="p-6">
              <DeliveryPhotoManager
                deliveryId={selectedDelivery.id}
                orderId={selectedDelivery.order.id}
                userRole="DELIVERY_AGENT"
                canUpload={selectedDelivery.status !== 'FAILED'}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
