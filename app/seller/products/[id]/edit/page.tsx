'use client';

import { useState, useEffect, Suspense, useRef, ChangeEvent } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { toast } from '@/hooks/use-toast';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, Loader2, Upload, X } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';


type ImagePreview = {
  url: string;
  name: string;
  size: number;
};

function EditProductContent() {
  const params = useParams();
  const id = typeof params?.id === 'string' ? params.id : '';
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Constants for image handling
  const MAX_IMAGES = 5;
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    price: '',
    stock: '',
    description: '',
    customType: '',
    images: [] as string[]
  });

  // Image previews state
  const [imagePreviews, setImagePreviews] = useState<ImagePreview[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // const response = await fetch('/api/auth/me');
        const userResponse = await fetch('/api/auth/me');
        if (!userResponse.ok) throw new Error('Failed to fetch user');
        const userData = await userResponse.json();
        setUser(userData);

        if (!userData || userData.role !== 'SELLER') {
          router.push('/auth/login');
          return;
        }

        const productResponse = await fetch(`/api/products/${id}?sellerId=${userData.id}`);
        if (!productResponse.ok) throw new Error('Failed to fetch product');
        const productData = await productResponse.json();

        if (!productData) {
          setError('Product not found');
          return;
        }

        setProduct(productData);
        
        // Initialize form data with product data
        setFormData({
          name: productData.name || '',
          type: productData.type || '',
          price: productData.price?.toString() || '',
          stock: productData.stock?.toString() || '',
          description: productData.description || '',
          customType: productData.customType || '',
          images: productData.images || []
        });

        // Initialize image previews
        if (productData.images && productData.images.length > 0) {
          setImagePreviews(
            productData.images.map((url: string, index: number) => ({
              url,
              name: `Existing image ${index + 1}`,
              size: 0 // We don't know the original size
            }))
          );
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, router]);

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle select changes
  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value,
      ...(name === 'type' && value !== 'CUSTOM' ? { customType: '' } : {})
    }));
  };

  // Handle file change with compression
  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Check if we're exceeding the max number of images
    if (imagePreviews.length + files.length > MAX_IMAGES) {
      toast({
        title: "Too many images",
        description: `You can only upload up to ${MAX_IMAGES} images`,
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Check file size
        if (file.size > MAX_FILE_SIZE) {
          toast({
            title: "File too large",
            description: `Image ${file.name} is too large (max 10MB)`,
            variant: "destructive"
          });
          continue;
        }

        // Compress image (client-side)
        const compressedFile = await compressImage(file);

        const formData = new FormData();
        formData.append('file', compressedFile);

        const response = await fetch('/api/upload/cloudinary', {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          const data = await response.json();
          setImagePreviews(prev => [
            ...prev,
            {
              url: data.url,
              name: file.name,
              size: file.size,
            }
          ]);
        } else {
          toast({
            title: "Upload failed",
            description: `Failed to upload ${file.name}`,
            variant: "destructive"
          });
        }
      }
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Failed to upload images",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const compressImage = async (file: File): Promise<File> => {
    return new Promise((resolve) => {
      // Skip compression for non-image files
      if (!file.type.match('image.*')) {
        resolve(file);
        return;
      }

      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new window.Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          // Set maximum dimensions
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 1200;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          ctx?.drawImage(img, 0, 0, width, height);

          canvas.toBlob((blob) => {
            if (!blob) {
              resolve(file);
              return;
            }
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          }, 'image/jpeg', 0.7);
        };
      };
    });
  };

  const removeImage = (index: number) => {
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // Handle image upload
  const handleImageUpload = (images: string[]) => {
    setFormData(prev => ({
      ...prev,
      images
    }));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.type || !formData.price || !formData.stock || !formData.description.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    if (formData.type === 'CUSTOM' && !formData.customType.trim()) {
      toast({
        title: "Custom type name required",
        description: "Please provide a label for your custom product type",
        variant: "destructive"
      });
      return;
    }

    if (parseFloat(formData.price) <= 0) {
      toast({
        title: "Validation Error", 
        description: "Price must be greater than 0",
        variant: "destructive"
      });
      return;
    }

    if (parseInt(formData.stock) < 0) {
      toast({
        title: "Validation Error",
        description: "Stock quantity cannot be negative", 
        variant: "destructive"
      });
      return;
    }

    setSaving(true);

    try {
      const updateData = {
        name: formData.name.trim(),
        type: formData.type,
        customType: formData.type === 'CUSTOM' ? formData.customType.trim() : undefined,
        price: parseFloat(formData.price),
        stock: parseInt(formData.stock),
        description: formData.description.trim(),
        images: imagePreviews.map(img => img.url)
      };

      const response = await fetch(`/api/products/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update product');
      }

      const updatedProduct = await response.json();

      toast({
        title: "Success!",
        description: "Product updated successfully. Email notification sent.",
        variant: "default"
      });

      // Update local state
      setProduct(updatedProduct);
      
      // Redirect to products page after a short delay
      setTimeout(() => {
        router.push('/seller/products');
      }, 2000);

    } catch (err) {
      console.error('Error updating product:', err);
      let errorMessage = 'Failed to update product';
      
      if (err instanceof Error) {
        if (err.message.includes('fetch')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else {
          errorMessage = err.message;
        }
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout user={undefined}>
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex items-center justify-center h-64">
            <p>Loading product data...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout user={user}>
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex items-center justify-center h-64">
            <p className="text-red-500">{error}</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!product) {
    return (
      <DashboardLayout user={user}>
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex items-center justify-center h-64">
            <p>Product not found</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={user}>
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center gap-4">
          <Link href="/seller/products">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Products
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Edit Product</h1>
            <p className="text-gray-600 mt-2">Update your product information</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Product Information</CardTitle>
            <CardDescription>Update your product details below.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Product Name *</Label>
                  <Input 
                    id="name" 
                    name="name" 
                    value={formData.name}
                    onChange={handleInputChange}
                    required 
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Product Type *</Label>
                  <Select 
                    name="type" 
                    value={formData.type}
                    onValueChange={(value) => handleSelectChange('type', value)}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select product type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EGGS">Eggs</SelectItem>
                      <SelectItem value="CHICKEN_MEAT">Chicken Meat</SelectItem>
                      <SelectItem value="CUSTOM">Custom type</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.type === 'CUSTOM' && (
                  <div className="space-y-2">
                    <Label htmlFor="customType">Custom Product Type *</Label>
                    <Input
                      id="customType"
                      name="customType"
                      value={formData.customType}
                      onChange={handleInputChange}
                      placeholder="e.g., Specialty Marinades"
                      maxLength={60}
                      required
                    />
                    <p className="text-xs text-gray-500">This label appears to customers on listings and detailed product views.</p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="price">Price (Kes) *</Label>
                  <Input
                    id="price"
                    name="price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stock">Stock Quantity *</Label>
                  <Input
                    id="stock"
                    name="stock"
                    type="number"
                    min="0"
                    value={formData.stock}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  name="description"
                  rows={4}
                  value={formData.description}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Product Images</Label>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  multiple
                  className="hidden"
                />

                <div className="flex flex-col gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={triggerFileInput}
                    disabled={imagePreviews.length >= MAX_IMAGES || isUploading}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {isUploading ? 'Uploading...' : 'Upload Images'}
                    <span className="ml-2 text-xs text-gray-500">
                      ({imagePreviews.length}/{MAX_IMAGES})
                    </span>
                  </Button>
                  <p className="text-sm text-gray-500">
                    Upload up to {MAX_IMAGES} images (max 10MB each). High-quality images help sell your products better.
                  </p>
                </div>

                {imagePreviews.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                    {imagePreviews.map((image, index) => (
                      <div key={index} className="relative group">
                        <div className="aspect-square overflow-hidden rounded-lg border-2 border-gray-200 hover:border-blue-300 transition-colors">
                          <Image
                            src={image.url}
                            alt={`Preview ${index + 1}`}
                            width={200}
                            height={200}
                            className="object-cover w-full h-full"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 hover:bg-white"
                          onClick={() => removeImage(index)}
                        >
                          <X className="h-4 w-4 text-red-500" />
                        </Button>
                        <div className="text-xs text-gray-500 mt-1 truncate">
                          {image.name}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-4">
                <Link href="/seller/products">
                  <Button type="button" variant="outline" disabled={saving}>
                    Cancel
                  </Button>
                </Link>
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Update Product
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

export default function EditProduct() {
  return (
    <Suspense fallback={<div className="text-center py-12">Loading...</div>}>
      <EditProductContent />
    </Suspense>
  );
}
