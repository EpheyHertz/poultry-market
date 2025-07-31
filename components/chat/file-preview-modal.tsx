'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  X, 
  FileText, 
  Image as ImageIcon, 
  Video, 
  Music, 
  Archive,
  File as FileIcon,
  ExternalLink
} from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import type { MessageFile } from '@/types/chat';

interface FilePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: MessageFile | string | null;
  files?: MessageFile[];
  currentIndex?: number;
  onNavigate?: (direction: 'prev' | 'next') => void;
}

export default function FilePreviewModal({
  isOpen,
  onClose,
  file,
  files = [],
  currentIndex = 0,
  onNavigate
}: FilePreviewModalProps) {
  const [isLoading, setIsLoading] = useState(false);

  if (!file) return null;

  const isSimpleImage = typeof file === 'string';
  const fileData = isSimpleImage ? null : file as MessageFile;

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return ImageIcon;
    if (mimeType.startsWith('video/')) return Video;
    if (mimeType.startsWith('audio/')) return Music;
    if (mimeType.includes('pdf')) return FileText;
    if (mimeType.includes('zip') || mimeType.includes('rar')) return Archive;
    return FileIcon;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDownload = async () => {
    if (isSimpleImage) {
      const link = document.createElement('a');
      link.href = file as string;
      link.download = 'image.jpg';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    if (!fileData) return;

    setIsLoading(true);
    try {
      const response = await fetch(fileData.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileData.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenExternal = () => {
    const url = isSimpleImage ? file as string : fileData?.url;
    if (url) {
      window.open(url, '_blank');
    }
  };

  const canNavigate = files.length > 1;
  const canShowPrev = canNavigate && currentIndex > 0;
  const canShowNext = canNavigate && currentIndex < files.length - 1;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="p-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {!isSimpleImage && fileData && (
                <>
                  {React.createElement(getFileIcon(fileData.mimeType), {
                    className: "h-6 w-6 text-gray-600"
                  })}
                  <div>
                    <DialogTitle className="text-left">{fileData.name}</DialogTitle>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        {fileData.mimeType.split('/')[1]?.toUpperCase()}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {formatFileSize(fileData.size)}
                      </span>
                    </div>
                  </div>
                </>
              )}
              {isSimpleImage && (
                <>
                  <ImageIcon className="h-6 w-6 text-gray-600" />
                  <DialogTitle>Image Preview</DialogTitle>
                </>
              )}
            </div>

            <div className="flex items-center space-x-2">
              {/* Navigation buttons */}
              {canNavigate && (
                <div className="flex items-center space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onNavigate?.('prev')}
                    disabled={!canShowPrev}
                  >
                    ←
                  </Button>
                  <span className="text-sm text-gray-500">
                    {currentIndex + 1} / {files.length}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onNavigate?.('next')}
                    disabled={!canShowNext}
                  >
                    →
                  </Button>
                </div>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={handleOpenExternal}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleDownload}
                disabled={isLoading}
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 flex items-center justify-center p-4 bg-gray-50">
          {isSimpleImage && (
            <div className="relative max-w-full max-h-full">
              <Image
                src={file as string}
                alt="Preview"
                width={800}
                height={600}
                className="max-w-full max-h-[60vh] object-contain rounded-lg"
                unoptimized
              />
            </div>
          )}

          {!isSimpleImage && fileData && (
            <div className="text-center">
              {fileData.mimeType.startsWith('image/') && (
                <div className="relative max-w-full max-h-full">
                  <Image
                    src={fileData.url}
                    alt={fileData.name}
                    width={800}
                    height={600}
                    className="max-w-full max-h-[60vh] object-contain rounded-lg"
                    unoptimized
                  />
                </div>
              )}

              {fileData.mimeType.startsWith('video/') && (
                <video
                  src={fileData.url}
                  controls
                  className="max-w-full max-h-[60vh] rounded-lg"
                >
                  Your browser does not support the video tag.
                </video>
              )}

              {fileData.mimeType.startsWith('audio/') && (
                <div className="p-8">
                  <Music className="h-20 w-20 text-gray-400 mx-auto mb-4" />
                  <audio src={fileData.url} controls className="w-full">
                    Your browser does not support the audio tag.
                  </audio>
                </div>
              )}

              {!fileData.mimeType.startsWith('image/') && 
               !fileData.mimeType.startsWith('video/') && 
               !fileData.mimeType.startsWith('audio/') && (
                <div className="p-8 text-center">
                  {React.createElement(getFileIcon(fileData.mimeType), {
                    className: "h-20 w-20 text-gray-400 mx-auto mb-4"
                  })}
                  <p className="text-gray-600 mb-4">
                    Preview not available for this file type
                  </p>
                  <p className="text-sm text-gray-500">
                    Click the download button to view the file
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
