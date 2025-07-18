'use client';

import { useState, useRef, ChangeEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Upload, X } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import Image from 'next/image';

type ImagePreview = {
  url: string;
  name: string;
  size: number;
};

export default function NewProduct() {
  const [user, setUser] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    stock: '',
    type: '',
  });
  const [imagePreviews, setImagePreviews] = useState<ImagePreview[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const MAX_IMAGES = 5;
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const userData = await response.json();
          if (userData.role !== 'SELLER') {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (imagePreviews.length === 0) {
      setError('Please upload at least one image');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          images: imagePreviews.map(img => img.url)
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Product created successfully!');
        router.push('/seller/products');
      } else {
        setError(data.error || 'Failed to create product');
      }
    } catch (error) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Check if we're exceeding the max number of images
    if (imagePreviews.length + files.length > MAX_IMAGES) {
      toast.error(`You can only upload up to ${MAX_IMAGES} images`);
      return;
    }

    setIsUploading(true);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Check file size
        if (file.size > MAX_FILE_SIZE) {
          toast.error(`Image ${file.name} is too large (max 10MB)`);
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
          toast.error(`Failed to upload ${file.name}`);
        }
      }
    } catch (error) {
      toast.error('Upload failed');
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

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <DashboardLayout user={user}>
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Link href="/seller/products">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Add New Product</h1>
            <p className="text-gray-600 mt-2">Create a new product listing</p>
          </div>
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>Product Details</CardTitle>
            <CardDescription>
              Fill in the information about your product. As a seller, you can only sell eggs and chicken meat.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="name">Product Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="e.g., Fresh Farm Eggs"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                  placeholder="Describe your product..."
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Price (Ksh)</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    required
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stock">Stock Quantity</Label>
                  <Input
                    id="stock"
                    type="number"
                    min="0"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    required
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Product Type</Label>
                <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select product type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EGGS">Eggs</SelectItem>
                    <SelectItem value="CHICKEN_MEAT">Chicken Meat</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
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
                    Upload up to {MAX_IMAGES} images (max 10MB each)
                  </p>
                </div>

                {imagePreviews.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                    {imagePreviews.map((image, index) => (
                      <div key={index} className="relative group">
                        <div className="aspect-square overflow-hidden rounded-lg border">
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

              <div className="flex space-x-4">
                <Button type="submit" disabled={isLoading || isUploading} className="flex-1">
                  {isLoading ? 'Creating...' : 'Create Product'}
                </Button>
                <Link href="/seller/products">
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
// import { redirect } from 'next/navigation';
// import { getCurrentUser } from '@/lib/auth';
// import DashboardLayout from '@/components/layout/dashboard-layout';
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
// import { Button } from '@/components/ui/button';
// import { Input } from '@/components/ui/input';
// import { Label } from '@/components/ui/label';
// import { Textarea } from '@/components/ui/textarea';
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// import ImageUpload from '@/components/ui/image-upload';
// import { ArrowLeft } from 'lucide-react';
// import Link from 'next/link';

// export default async function NewSellerProduct() {
//   const user = await getCurrentUser();
  
//   if (!user || user.role !== 'SELLER') {
//     redirect('/auth/login');
//   }

//   return (
//     <DashboardLayout user={user}>
//       <div className="max-w-4xl mx-auto space-y-8">
//         {/* Header */}
//         <div className="flex items-center gap-4">
//           <Link href="/seller/products">
//             <Button variant="outline" size="sm">
//               <ArrowLeft className="h-4 w-4 mr-2" />
//               Back to Products
//             </Button>
//           </Link>
//           <div>
//             <h1 className="text-3xl font-bold text-gray-900">Add New Product</h1>
//             <p className="text-gray-600 mt-2">Create a new product listing for your store</p>
//           </div>
//         </div>

//         {/* Product Form */}
//         <Card>
//           <CardHeader>
//             <CardTitle>Product Information</CardTitle>
//             <CardDescription>
//               Fill in the details for your new product. All fields marked with * are required.
//             </CardDescription>
//           </CardHeader>
//           <CardContent>
//             <form className="space-y-6" action="/api/products" method="POST">
//               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                 <div className="space-y-2">
//                   <Label htmlFor="name">Product Name *</Label>
//                   <Input
//                     id="name"
//                     name="name"
//                     placeholder="e.g., Fresh Farm Eggs"
//                     required
//                   />
//                 </div>

//                 <div className="space-y-2">
//                   <Label htmlFor="type">Product Type *</Label>
//                   <Select name="type" required>
//                     <SelectTrigger>
//                       <SelectValue placeholder="Select product type" />
//                     </SelectTrigger>
//                     <SelectContent>
//                       <SelectItem value="EGGS">Eggs</SelectItem>
//                       <SelectItem value="CHICKEN_MEAT">Chicken Meat</SelectItem>
//                     </SelectContent>
//                   </Select>
//                 </div>

//                 <div className="space-y-2">
//                   <Label htmlFor="price">Price (USD) *</Label>
//                   <Input
//                     id="price"
//                     name="price"
//                     type="number"
//                     step="0.01"
//                     min="0"
//                     placeholder="0.00"
//                     required
//                   />
//                 </div>

//                 <div className="space-y-2">
//                   <Label htmlFor="stock">Stock Quantity *</Label>
//                   <Input
//                     id="stock"
//                     name="stock"
//                     type="number"
//                     min="0"
//                     placeholder="0"
//                     required
//                   />
//                 </div>
//               </div>

//               <div className="space-y-2">
//                 <Label htmlFor="description">Description *</Label>
//                 <Textarea
//                   id="description"
//                   name="description"
//                   rows={4}
//                   placeholder="Describe your product in detail..."
//                   required
//                 />
//               </div>

//               <div className="space-y-2">
//                 <Label>Product Images</Label>
//                 <ImageUpload
//                   name="images"
//                   multiple={true}
//                   maxFiles={5}
//                   accept="image/*"
//                 />
//                 <p className="text-sm text-gray-500">
//                   Upload up to 5 high-quality images of your product. The first image will be used as the main product image.
//                 </p>
//               </div>

//               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                 <div className="space-y-2">
//                   <Label htmlFor="unit">Unit of Measurement</Label>
//                   <Select name="unit">
//                     <SelectTrigger>
//                       <SelectValue placeholder="Select unit" />
//                     </SelectTrigger>
//                     <SelectContent>
//                       <SelectItem value="pieces">Pieces</SelectItem>
//                       <SelectItem value="dozen">Dozen</SelectItem>
//                       <SelectItem value="kg">Kilograms</SelectItem>
//                       <SelectItem value="lb">Pounds</SelectItem>
//                       <SelectItem value="tray">Tray</SelectItem>
//                     </SelectContent>
//                   </Select>
//                 </div>

//                 <div className="space-y-2">
//                   <Label htmlFor="minOrder">Minimum Order Quantity</Label>
//                   <Input
//                     id="minOrder"
//                     name="minOrder"
//                     type="number"
//                     min="1"
//                     placeholder="1"
//                   />
//                 </div>
//               </div>

//               <div className="space-y-2">
//                 <Label htmlFor="tags">Product Tags</Label>
//                 <Input
//                   id="tags"
//                   name="tags"
//                   placeholder="organic, free-range, local (separate with commas)"
//                 />
//                 <p className="text-sm text-gray-500">
//                   Add relevant tags to help customers find your product
//                 </p>
//               </div>

//               <div className="flex justify-end space-x-4">
//                 <Link href="/seller/products">
//                   <Button type="button" variant="outline">
//                     Cancel
//                   </Button>
//                 </Link>
//                 <Button type="submit">
//                   Create Product
//                 </Button>
//               </div>
//             </form>
//           </CardContent>
//         </Card>
//       </div>
//     </DashboardLayout>
//   );
// }
