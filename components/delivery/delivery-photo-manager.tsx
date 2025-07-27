'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Camera, 
  Upload, 
  Image as ImageIcon, 
  X, 
  Eye,
  Download,
  User,
  Calendar,
  MessageCircle,
  CheckCircle,
  AlertTriangle,
  Truck,
  Package
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
    role: string;
  };
}

interface DeliveryPhotoManagerProps {
  deliveryId: string;
  orderId: string;
  userRole: 'CUSTOMER' | 'DELIVERY_AGENT' | 'SELLER' | 'ADMIN';
  canUpload?: boolean;
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

export default function DeliveryPhotoManager({ 
  deliveryId, 
  orderId, 
  userRole, 
  canUpload = true,
  className = '' 
}: DeliveryPhotoManagerProps) {
  const [photos, setPhotos] = useState<DeliveryPhoto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [photoType, setPhotoType] = useState<string>('DELIVERY_PROOF');
  const [selectedPhoto, setSelectedPhoto] = useState<DeliveryPhoto | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Load photos on component mount
  useState(() => {
    loadPhotos();
  });

  const loadPhotos = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/delivery/photos?deliveryId=${deliveryId}`);
      const data = await response.json();

      if (data.success) {
        setPhotos(data.photos);
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

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid File",
          description: "Please select an image file",
          variant: "destructive",
        });
        return;
      }

      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Please select an image smaller than 5MB",
          variant: "destructive",
        });
        return;
      }

      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('photo', selectedFile);
      formData.append('deliveryId', deliveryId);
      formData.append('caption', caption);
      formData.append('photoType', photoType);

      const response = await fetch('/api/delivery/photos', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Success",
          description: "Photo uploaded successfully",
        });
        
        // Reset form
        setSelectedFile(null);
        setPreview(null);
        setCaption('');
        setPhotoType('DELIVERY_PROOF');
        
        // Reload photos
        loadPhotos();
      } else {
        toast({
          title: "Upload Failed",
          description: data.error || "Failed to upload photo",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Failed",
        description: "An error occurred while uploading the photo",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
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

  const clearSelection = () => {
    setSelectedFile(null);
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Upload Section */}
      {canUpload && (userRole === 'CUSTOMER' || userRole === 'DELIVERY_AGENT') && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Camera className="h-5 w-5" />
              <span>Upload Delivery Photo</span>
            </CardTitle>
            <CardDescription>
              Share photos related to this delivery for transparency and record keeping
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* File Selection */}
            <div className="space-y-2">
              <Label>Select Photo</Label>
              <div className="flex items-center space-x-4">
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center space-x-2"
                >
                  <Upload className="h-4 w-4" />
                  <span>Browse</span>
                </Button>
              </div>
            </div>

            {/* Preview */}
            {preview && (
              <div className="relative">
                <div className="relative w-full h-48 bg-gray-100 rounded-lg overflow-hidden">
                  <Image
                    src={preview}
                    alt="Preview"
                    fill
                    className="object-cover"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={clearSelection}
                    className="absolute top-2 right-2"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Photo Type */}
            <div className="space-y-2">
              <Label>Photo Type</Label>
              <Select value={photoType} onValueChange={setPhotoType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(photoTypeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Caption */}
            <div className="space-y-2">
              <Label>Caption (Optional)</Label>
              <Textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Add a description or note about this photo..."
                rows={3}
              />
            </div>

            {/* Upload Button */}
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || isUploading}
              className="w-full"
            >
              {isUploading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Uploading...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Upload className="h-4 w-4" />
                  <span>Upload Photo</span>
                </div>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Photos Gallery */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <ImageIcon className="h-5 w-5" />
            <span>Delivery Photos ({photos.length})</span>
          </CardTitle>
          <CardDescription>
            Photos uploaded by delivery agent and customer for this delivery
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : photos.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No photos uploaded yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {photos.map((photo) => {
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
                        </div>
                      </div>
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Badge className={photoTypeColors[photo.photoType]}>
                              <TypeIcon className="h-3 w-3 mr-1" />
                              {photoTypeLabels[photo.photoType]}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              {format(new Date(photo.createdAt), 'MMM d, HH:mm')}
                            </span>
                          </div>
                          
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <User className="h-3 w-3" />
                            <span>{photo.uploader.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {photo.uploader.role.replace('_', ' ')}
                            </Badge>
                          </div>
                          
                          {photo.caption && (
                            <p className="text-sm text-gray-700 line-clamp-2">
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
          )}
        </CardContent>
      </Card>

      {/* Photo Modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center space-x-3">
                <Badge className={photoTypeColors[selectedPhoto.photoType]}>
                  {photoTypeLabels[selectedPhoto.photoType]}
                </Badge>
                <span className="text-sm text-gray-600">
                  by {selectedPhoto.uploader.name}
                </span>
                <span className="text-sm text-gray-500">
                  {format(new Date(selectedPhoto.createdAt), 'MMM d, yyyy HH:mm')}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedPhoto(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="relative">
              <Image
                src={selectedPhoto.photoUrl}
                alt={selectedPhoto.caption || 'Delivery photo'}
                width={800}
                height={600}
                className="max-h-[60vh] object-contain"
              />
            </div>
            {selectedPhoto.caption && (
              <div className="p-4 border-t">
                <p className="text-gray-700">{selectedPhoto.caption}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
