'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, X, Image, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ImageUploadProps {
  name: string;
  multiple?: boolean;
  maxFiles?: number;
  accept?: string;
  onUpload?: (urls: string[]) => void;
  defaultImages?: string[];
}

export default function ImageUpload({
  name,
  multiple = false,
  maxFiles = 1,
  accept = 'image/*',
  onUpload,
  defaultImages = []
}: ImageUploadProps) {
  const [images, setImages] = useState<string[]>(defaultImages);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);

    if (files.length === 0) return;

    if (images.length + files.length > maxFiles) {
      toast.error(`Maximum ${maxFiles} images allowed`);
      return;
    }

    // Validate file sizes (max 5MB per file)
    const maxSize = 5 * 1024 * 1024; // 5MB
    const oversizedFiles = files.filter(file => file.size > maxSize);
    if (oversizedFiles.length > 0) {
      toast.error('Some files are too large. Maximum size is 5MB per image.');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const uploadPromises = files.map(async (file, index) => {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/upload/cloudinary', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Upload failed');
        }

        const data = await response.json();
        setUploadProgress(((index + 1) / files.length) * 100);
        return data.url;
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      const newImages = [...images, ...uploadedUrls];
      setImages(newImages);
      onUpload?.(newImages);
      toast.success(`${uploadedUrls.length} image(s) uploaded successfully`);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload images. Please try again.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    setImages(newImages);
    onUpload?.(newImages);
    toast.success('Image removed');
  };

  const moveImage = (fromIndex: number, toIndex: number) => {
    const newImages = [...images];
    const [movedImage] = newImages.splice(fromIndex, 1);
    newImages.splice(toIndex, 0, movedImage);
    setImages(newImages);
    onUpload?.(newImages);
  };

  return (
    <div className="space-y-4">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        name={name}
        multiple={multiple}
        accept={accept}
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Upload button */}
      <Button
        type="button"
        variant="outline"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading || images.length >= maxFiles}
        className="w-full"
      >
        {uploading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Uploading... {Math.round(uploadProgress)}%
          </>
        ) : (
          <>
            <Upload className="mr-2 h-4 w-4" />
            Upload Images
          </>
        )}
      </Button>

      {/* Upload help text */}
      <p className="text-sm text-gray-500">
        {multiple 
          ? `Upload up to ${maxFiles} images. Maximum 5MB per image.` 
          : 'Upload 1 image. Maximum 5MB.'
        }
        <br />
        Supported formats: JPG, PNG, WebP, GIF
      </p>

      {/* Image preview grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((image, index) => (
            <div key={index} className="relative group">
              <div className="aspect-square rounded-lg overflow-hidden border-2 border-gray-200 hover:border-blue-300 transition-colors">
                <img
                  src={image}
                  alt={`Upload ${index + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>

              {/* Remove button */}
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                onClick={() => removeImage(index)}
              >
                <X className="h-3 w-3" />
              </Button>

              {/* Main image indicator */}
              {index === 0 && (
                <div className="absolute bottom-2 left-2">
                  <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded font-medium">
                    Main
                  </span>
                </div>
              )}

              {/* Image order indicator */}
              <div className="absolute top-2 left-2">
                <span className="bg-black bg-opacity-75 text-white text-xs px-1.5 py-0.5 rounded">
                  {index + 1}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Image URLs as hidden inputs for form submission */}
      {images.map((image, index) => (
        <input
          key={index}
          type="hidden"
          name={`${name}[]`}
          value={image}
        />
      ))}

      {/* Upload status */}
      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>{images.length}/{maxFiles} images uploaded</span>
        {images.length > 0 && (
          <span className="text-blue-600">
            Drag images to reorder • First image will be the main display
          </span>
        )}
      </div>
    </div>
  );
}