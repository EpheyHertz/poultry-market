'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Camera,
  Eye,
  Download,
  Trash2,
  Search,
  Filter,
  Calendar,
  User,
  Package,
  Truck,
  CheckCircle,
  AlertTriangle,
  MessageCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import Image from 'next/image';
import { format } from 'date-fns';

interface DeliveryPhoto {
  id: string;
  photoUrl: string;
  caption?: string;
  photoType: 'DELIVERY_PROOF' | 'DAMAGE_REPORT' | 'CUSTOMER_SATISFACTION' | 'PICKUP_CONFIRMATION';
  createdAt: string;
  uploader: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  delivery: {
    id: string;
    trackingId: string;
    status: string;
    order: {
      id: string;
      customer: {
        id: string;
        name: string;
        email: string;
      };
      items: Array<{
        product: {
          name: string;
          seller: {
            id: string;
            name: string;
            email: string;
          };
        };
      }>;
    };
    agent?: {
      id: string;
      name: string;
      email: string;
      phone?: string;
    };
  };
}

interface AdminDeliveryPhotosProps {
  className?: string;
}

const photoTypeLabels = {
  DELIVERY_PROOF: 'Delivery Proof',
  DAMAGE_REPORT: 'Damage Report',
  CUSTOMER_SATISFACTION: 'Customer Feedback',
  PICKUP_CONFIRMATION: 'Pickup Confirmation'
};

const photoTypeIcons = {
  DELIVERY_PROOF: CheckCircle,
  DAMAGE_REPORT: AlertTriangle,
  CUSTOMER_SATISFACTION: MessageCircle,
  PICKUP_CONFIRMATION: Package
};

const photoTypeColors = {
  DELIVERY_PROOF: 'bg-green-100 text-green-800',
  DAMAGE_REPORT: 'bg-red-100 text-red-800',
  CUSTOMER_SATISFACTION: 'bg-blue-100 text-blue-800',
  PICKUP_CONFIRMATION: 'bg-orange-100 text-orange-800'
};

export default function AdminDeliveryPhotos({ className = '' }: AdminDeliveryPhotosProps) {
  const [photos, setPhotos] = useState<DeliveryPhoto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<DeliveryPhoto | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statistics, setStatistics] = useState<any>({});
  const { toast } = useToast();

  useEffect(() => {
    loadPhotos();
  }, [currentPage, filterType]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadPhotos = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '12'
      });

      if (filterType) {
        params.append('photoType', filterType);
      }

      const response = await fetch(`/api/admin/delivery-photos?${params}`);
      const data = await response.json();

      if (data.success) {
        setPhotos(data.photos);
        setTotalPages(data.pagination.totalPages);
        setStatistics(data.statistics);
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to load photos",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error loading photos:', error);
      toast({
        title: "Error",
        description: "Failed to load delivery photos",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (!confirm('Are you sure you want to delete this photo? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch('/api/admin/delivery-photos', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ photoId }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Success",
          description: "Photo deleted successfully",
        });
        loadPhotos();
        setSelectedPhoto(null);
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to delete photo",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "Error",
        description: "An error occurred while deleting the photo",
        variant: "destructive",
      });
    }
  };

  const handleDownload = async (photoUrl: string, photoId: string) => {
    try {
      const response = await fetch(photoUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `delivery-photo-${photoId}.jpg`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Failed to download the photo",
        variant: "destructive",
      });
    }
  };

  const filteredPhotos = photos.filter(photo => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      photo.uploader.name.toLowerCase().includes(query) ||
      photo.delivery.trackingId.toLowerCase().includes(query) ||
      photo.delivery.order.customer.name.toLowerCase().includes(query) ||
      photo.caption?.toLowerCase().includes(query) ||
      photo.delivery.order.items.some(item => 
        item.product.seller.name.toLowerCase().includes(query)
      )
    );
  });

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Delivery Photos</h1>
          <p className="text-gray-600">Monitor all delivery photos uploaded by agents and customers</p>
        </div>
        
        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{statistics.totalPhotos || 0}</div>
              <div className="text-sm text-gray-500">Total Photos</div>
            </CardContent>
          </Card>
          {Object.entries(statistics.photoTypeCounts || {}).map(([type, count]) => (
            <Card key={type}>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{count as number}</div>
                <div className="text-sm text-gray-500">{photoTypeLabels[type as keyof typeof photoTypeLabels]}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by customer, tracking ID, uploader, or caption..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Types</SelectItem>
                  {Object.entries(photoTypeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery('');
                  setFilterType('');
                  setCurrentPage(1);
                  loadPhotos();
                }}
              >
                Clear
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Photos Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Camera className="h-5 w-5" />
            <span>Photos ({filteredPhotos.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredPhotos.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Camera className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No photos found</p>
              <p>Try adjusting your filters or search terms</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredPhotos.map((photo) => {
                  const TypeIcon = photoTypeIcons[photo.photoType];
                  return (
                    <div key={photo.id} className="group relative">
                      <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                        <div className="relative h-48 bg-gray-100">
                          <Image
                            src={photo.photoUrl}
                            alt={photo.caption || 'Delivery photo'}
                            fill
                            className="object-cover"
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200" />
                          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 space-x-1">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => setSelectedPhoto(photo)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleDownload(photo.photoUrl, photo.id)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeletePhoto(photo.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <Badge className={photoTypeColors[photo.photoType]}>
                                <TypeIcon className="h-3 w-3 mr-1" />
                                {photoTypeLabels[photo.photoType]}
                              </Badge>
                              <span className="text-xs text-gray-500">
                                {format(new Date(photo.createdAt), 'MMM d, HH:mm')}
                              </span>
                            </div>
                            
                            <div className="space-y-2 text-sm">
                              <div className="flex items-center space-x-2">
                                <User className="h-3 w-3 text-gray-400" />
                                <span className="font-medium">{photo.uploader.name}</span>
                                <Badge variant="outline" className="text-xs">
                                  {photo.uploader.role.replace('_', ' ')}
                                </Badge>
                              </div>
                              
                              <div className="flex items-center space-x-2 text-gray-600">
                                <Truck className="h-3 w-3" />
                                <span>#{photo.delivery.trackingId}</span>
                              </div>
                              
                              <div className="flex items-center space-x-2 text-gray-600">
                                <Package className="h-3 w-3" />
                                <span>{photo.delivery.order.customer.name}</span>
                              </div>
                            </div>
                            
                            {photo.caption && (
                              <p className="text-sm text-gray-700 line-clamp-2 border-t pt-2">
                                {photo.caption}
                              </p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center space-x-2 mt-8">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  
                  <span className="text-sm text-gray-600">
                    Page {currentPage} of {totalPages}
                  </span>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Photo Modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-6xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b">
              <div className="flex items-center space-x-4">
                <Badge className={photoTypeColors[selectedPhoto.photoType]}>
                  {photoTypeLabels[selectedPhoto.photoType]}
                </Badge>
                <div className="text-sm text-gray-600">
                  <span className="font-medium">{selectedPhoto.uploader.name}</span>
                  <span className="mx-2">•</span>
                  <span>{format(new Date(selectedPhoto.createdAt), 'MMM d, yyyy HH:mm')}</span>
                  <span className="mx-2">•</span>
                  <span>#{selectedPhoto.delivery.trackingId}</span>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownload(selectedPhoto.photoUrl, selectedPhoto.id)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDeletePhoto(selectedPhoto.id)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedPhoto(null)}
                >
                  ×
                </Button>
              </div>
            </div>
            
            <div className="flex">
              <div className="flex-1">
                <Image
                  src={selectedPhoto.photoUrl}
                  alt={selectedPhoto.caption || 'Delivery photo'}
                  width={800}
                  height={600}
                  className="max-h-[60vh] object-contain"
                />
              </div>
              
              <div className="w-80 p-6 bg-gray-50 space-y-4">
                <div>
                  <h3 className="font-semibold text-lg mb-2">Photo Details</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Uploaded by:</span>
                      <span className="font-medium">{selectedPhoto.uploader.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Role:</span>
                      <span>{selectedPhoto.uploader.role.replace('_', ' ')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Date:</span>
                      <span>{format(new Date(selectedPhoto.createdAt), 'MMM d, yyyy')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Time:</span>
                      <span>{format(new Date(selectedPhoto.createdAt), 'HH:mm')}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Delivery Info</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Tracking ID:</span>
                      <span className="font-medium">#{selectedPhoto.delivery.trackingId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Status:</span>
                      <span>{selectedPhoto.delivery.status.replace('_', ' ')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Customer:</span>
                      <span>{selectedPhoto.delivery.order.customer.name}</span>
                    </div>
                    {selectedPhoto.delivery.agent && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Agent:</span>
                        <span>{selectedPhoto.delivery.agent.name}</span>
                      </div>
                    )}
                  </div>
                </div>

                {selectedPhoto.caption && (
                  <div>
                    <h4 className="font-semibold mb-2">Caption</h4>
                    <p className="text-sm text-gray-700 bg-white p-3 rounded border">
                      {selectedPhoto.caption}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
