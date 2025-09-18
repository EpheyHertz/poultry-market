'use client';

import { useState, useRef, ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import Image from 'next/image';
import {
  Upload,
  X,
  ImageIcon,
  Loader2
} from 'lucide-react';

type ImagePreview = {
  url: string;
  name: string;
  size: number;
};

interface BlogImageUploadProps {
  images: ImagePreview[];
  onImagesChange: (images: ImagePreview[]) => void;
  maxImages?: number;
  maxFileSize?: number; // in bytes
  className?: string;
  disabled?: boolean;
}

export default function BlogImageUpload({
  images,
  onImagesChange,
  maxImages = 3,
  maxFileSize = 10 * 1024 * 1024, // 10MB
  className = '',
  disabled = false
}: BlogImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
          }, 'image/jpeg', 0.8);
        };
      };
    });
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Check if we're exceeding the max number of images
    if (images.length + files.length > maxImages) {
      toast.error(`You can only upload up to ${maxImages} images`);
      return;
    }

    setIsUploading(true);

    try {
      const newImages: ImagePreview[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Check file size
        if (file.size > maxFileSize) {
          toast.error(`Image ${file.name} is too large (max ${Math.round(maxFileSize / (1024 * 1024))}MB)`);
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
          newImages.push({
            url: data.url,
            name: file.name,
            size: file.size,
          });
        } else {
          toast.error(`Failed to upload ${file.name}`);
        }
      }

      if (newImages.length > 0) {
        onImagesChange([...images, ...newImages]);
        toast.success(`Successfully uploaded ${newImages.length} image${newImages.length > 1 ? 's' : ''}`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Upload failed');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    onImagesChange(newImages);
    toast.success('Image removed');
  };

  const triggerFileInput = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        multiple
        className="hidden"
        disabled={disabled}
      />

      {/* Upload Button */}
      <div className="flex flex-col gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={triggerFileInput}
          disabled={images.length >= maxImages || isUploading || disabled}
          className="border-dashed border-2 h-auto py-8 hover:bg-emerald-50 hover:border-emerald-300 transition-colors"
        >
          <div className="flex flex-col items-center gap-2">
            {isUploading ? (
              <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            ) : (
              <ImageIcon className="h-8 w-8 text-emerald-600" />
            )}
            <div className="text-center">
              <div className="font-medium text-gray-900">
                {isUploading ? 'Uploading...' : 'Upload Images'}
              </div>
              <div className="text-sm text-gray-500">
                {images.length}/{maxImages} images • Max {Math.round(maxFileSize / (1024 * 1024))}MB each
              </div>
            </div>
          </div>
        </Button>

        {images.length > 0 && (
          <div className="text-sm text-gray-600">
            {maxImages === 3 ? 'Blog post images (up to 3)' : `Images (${images.length}/${maxImages})`}
          </div>
        )}
      </div>

      {/* Image Previews */}
      {images.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {images.map((image, index) => (
            <Card key={index} className="relative group overflow-hidden">
              <CardContent className="p-0">
                <div className="relative aspect-video">
                  <Image
                    src={image.url}
                    alt={`Upload ${index + 1}`}
                    fill
                    className="object-cover"
                  />
                  
                  {/* Remove button */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 hover:bg-white shadow-sm"
                    onClick={() => removeImage(index)}
                    disabled={disabled}
                  >
                    <X className="h-4 w-4 text-red-500" />
                  </Button>

                  {/* Image info overlay */}
                  <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="truncate font-medium">{image.name}</div>
                    <div className="text-white/80">{formatFileSize(image.size)}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Helper text */}
      <div className="text-xs text-gray-500 space-y-1">
        <div>• Supported formats: JPG, PNG, GIF, WebP</div>
        <div>• Images will be automatically compressed and optimized</div>
        {maxImages === 3 && (
          <div>• Blog posts can have up to 3 images for optimal loading performance</div>
        )}
      </div>
    </div>
  );
}