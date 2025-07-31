'use client';

import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  MoreVertical,
  Reply,
  Edit3,
  Trash2,
  Download,
  Check,
  CheckCheck,
  Copy,
  FileText,
  FileIcon,
  Image as ImageIconLucide,
  Video,
  Music,
  Archive,
  ExternalLink
} from 'lucide-react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { formatDistanceToNow, format } from 'date-fns';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { toast } from 'sonner';
import FilePreviewModal from './file-preview-modal';
import MessageReactions from './message-reactions';
import type { Message, MessageFile } from '@/types/chat';

interface MessageItemProps {
  message: Message;
  isOwn: boolean;
  showAvatar: boolean;
  currentUserId: string;
  onReply: (message: Message) => void;
  onEdit: (message: Message) => void;
  onDelete: (messageId: string) => void;
  onReact: (messageId: string, emoji: string) => void;
  onRemoveReaction: (messageId: string, emoji: string) => void;
}

export default function MessageItem({
  message,
  isOwn,
  showAvatar,
  currentUserId,
  onReply,
  onEdit,
  onDelete,
  onReact,
  onRemoveReaction
}: MessageItemProps) {
  const [showActions, setShowActions] = useState(false);
  const [previewFile, setPreviewFile] = useState<MessageFile | string | null>(null);
  const [previewIndex, setPreviewIndex] = useState(0);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    toast.success('Message copied to clipboard');
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return ImageIconLucide;
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

  const handleImageClick = (imageUrl: string, index?: number) => {
    setPreviewFile(imageUrl);
    setPreviewIndex(index || 0);
  };

  const handleFileClick = (file: MessageFile, index: number) => {
    setPreviewFile(file);
    setPreviewIndex(index);
  };

  const handleNavigatePreview = (direction: 'prev' | 'next') => {
    if (typeof previewFile === 'string') {
      // Handle image navigation
      const currentImageIndex = message.images.findIndex(img => img === previewFile);
      if (direction === 'prev' && currentImageIndex > 0) {
        setPreviewFile(message.images[currentImageIndex - 1]);
        setPreviewIndex(currentImageIndex - 1);
      } else if (direction === 'next' && currentImageIndex < message.images.length - 1) {
        setPreviewFile(message.images[currentImageIndex + 1]);
        setPreviewIndex(currentImageIndex + 1);
      }
    } else {
      // Handle file navigation
      if (direction === 'prev' && previewIndex > 0) {
        setPreviewIndex(previewIndex - 1);
        setPreviewFile(message.files[previewIndex - 1]);
      } else if (direction === 'next' && previewIndex < message.files.length - 1) {
        setPreviewIndex(previewIndex + 1);
        setPreviewFile(message.files[previewIndex + 1]);
      }
    }
  };

  if (message.isDeleted) {
    return (
      <div className={cn(
        'flex',
        isOwn ? 'justify-end' : 'justify-start'
      )}>
        <div className={cn(
          'max-w-xs lg:max-w-md px-4 py-2 rounded-lg',
          isOwn 
            ? 'bg-gray-100 text-gray-500' 
            : 'bg-gray-100 text-gray-500'
        )}>
          <p className="text-sm italic">This message was deleted</p>
          <div className="flex items-center justify-end space-x-1 mt-1">
            <span className="text-xs text-gray-400">
              {format(new Date(message.createdAt), 'HH:mm')}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={cn(
        'flex',
        isOwn ? 'justify-end' : 'justify-start'
      )}>
        <div className={cn(
          'flex space-x-2 max-w-xs lg:max-w-md',
          isOwn && 'flex-row-reverse space-x-reverse'
        )}>
          {/* Avatar */}
          {showAvatar && !isOwn && (
            <Avatar className="h-8 w-8 mt-1">
              <AvatarImage src={message.sender.avatar} alt={message.sender.name} />
              <AvatarFallback className="text-xs">
                {message.sender.name.split(' ').map(n => n[0]).join('').toUpperCase()}
              </AvatarFallback>
            </Avatar>
          )}

          {/* Message bubble */}
          <div
            className="group"
            onMouseEnter={() => setShowActions(true)}
            onMouseLeave={() => setShowActions(false)}
          >
            {/* Sender name for non-own messages */}
            {!isOwn && showAvatar && (
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-xs font-medium text-gray-600">
                  {message.sender.name}
                </span>
                <Badge variant="outline" className="text-xs px-1 py-0">
                  {message.sender.role}
                </Badge>
              </div>
            )}

            {/* Reply reference */}
            {message.replyTo && (
              <div className="bg-gray-100 border-l-4 border-gray-300 p-2 mb-2 rounded">
                <p className="text-xs text-gray-600 font-medium">
                  {message.replyTo.sender.name}
                </p>
                <p className="text-xs text-gray-800 truncate">
                  {message.replyTo.content}
                </p>
              </div>
            )}

            <div className={cn(
              'relative px-4 py-2 rounded-lg',
              isOwn 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-100 text-gray-900'
            )}>
              {/* Message content */}
              {message.content && (
                <p className="text-sm whitespace-pre-wrap break-words">
                  {message.content}
                  {message.isEdited && (
                    <span className={cn(
                      'text-xs ml-2 opacity-70',
                      isOwn ? 'text-blue-100' : 'text-gray-500'
                    )}>
                      (edited)
                    </span>
                  )}
                </p>
              )}

              {/* Images */}
              {message.images.length > 0 && (
                <div className={cn(
                  'grid gap-2 mt-2',
                  message.images.length === 1 ? 'grid-cols-1' : 
                  message.images.length === 2 ? 'grid-cols-2' :
                  'grid-cols-2'
                )}>
                  {message.images.map((image, index) => (
                    <div key={index} className="relative group/image">
                      <div className="relative overflow-hidden rounded-lg">
                        <Image
                          src={image}
                          alt={`Image ${index + 1}`}
                          width={200}
                          height={200}
                          className={cn(
                            "object-cover cursor-pointer hover:opacity-90 transition-opacity",
                            message.images.length === 1 ? "max-w-full max-h-64" : "w-full h-32"
                          )}
                          onClick={() => handleImageClick(image, index)}
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center opacity-0 hover:opacity-100">
                          <div className="bg-white bg-opacity-90 rounded-full p-2">
                            <ExternalLink className="h-4 w-4 text-gray-700" />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Files */}
              {message.files.length > 0 && (
                <div className="space-y-2 mt-2">
                  {message.files.map((file, index) => {
                    const FileIconComponent = getFileIcon(file.mimeType);
                    return (
                      <div 
                        key={index}
                        className={cn(
                          'flex items-center space-x-3 p-3 rounded border cursor-pointer hover:bg-opacity-80 transition-all',
                          isOwn ? 'bg-blue-400 border-blue-300' : 'bg-white border-gray-200'
                        )}
                        onClick={() => handleFileClick(file, index)}
                      >
                        <div className={cn(
                          'p-2 rounded',
                          isOwn ? 'bg-blue-300' : 'bg-gray-100'
                        )}>
                          <FileIconComponent className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            'text-sm font-medium truncate',
                            isOwn ? 'text-white' : 'text-gray-900'
                          )}>
                            {file.name}
                          </p>
                          <div className="flex items-center space-x-2">
                            <span className={cn(
                              'text-xs',
                              isOwn ? 'text-blue-100' : 'text-gray-500'
                            )}>
                              {formatFileSize(file.size)}
                            </span>
                            <Badge 
                              variant="secondary" 
                              className={cn(
                                'text-xs',
                                isOwn ? 'bg-blue-300 text-blue-800' : ''
                              )}
                            >
                              {file.mimeType.split('/')[1]?.toUpperCase()}
                            </Badge>
                          </div>
                        </div>
                        <ExternalLink className={cn(
                          'h-4 w-4',
                          isOwn ? 'text-blue-100' : 'text-gray-400'
                        )} />
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Message info */}
              <div className="flex items-center justify-end space-x-1 mt-1">
                <span className={cn(
                  'text-xs',
                  isOwn ? 'text-blue-100' : 'text-gray-500'
                )}>
                  {format(new Date(message.createdAt), 'HH:mm')}
                </span>
                
                {isOwn && (
                  <div className="flex items-center">
                    {message.deliveredAt ? (
                      message.isRead ? (
                        <CheckCheck className="h-3 w-3 text-blue-100" />
                      ) : (
                        <CheckCheck className="h-3 w-3 text-blue-200" />
                      )
                    ) : (
                      <Check className="h-3 w-3 text-blue-200" />
                    )}
                  </div>
                )}
              </div>

              {/* Actions menu */}
              {showActions && (
                <div className={cn(
                  'absolute top-0 flex items-center space-x-1',
                  isOwn ? '-left-20' : '-right-20'
                )}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 bg-white shadow-md hover:bg-gray-50"
                    onClick={() => onReply(message)}
                  >
                    <Reply className="h-3 w-3" />
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 bg-white shadow-md hover:bg-gray-50"
                      >
                        <MoreVertical className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align={isOwn ? 'end' : 'start'}>
                      <DropdownMenuItem onClick={handleCopy}>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy
                      </DropdownMenuItem>
                      
                      {isOwn && (
                        <>
                          <DropdownMenuItem onClick={() => onEdit(message)}>
                            <Edit3 className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => onDelete(message.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </div>

            {/* Reactions */}
            <MessageReactions
              reactions={message.reactions}
              onReact={(emoji) => onReact(message.id, emoji)}
              onRemoveReaction={(emoji) => onRemoveReaction(message.id, emoji)}
              currentUserId={currentUserId}
              className="mt-1"
            />
          </div>
        </div>
      </div>

      {/* File Preview Modal */}
      <FilePreviewModal
        isOpen={!!previewFile}
        onClose={() => setPreviewFile(null)}
        file={previewFile}
        files={typeof previewFile === 'string' ? [] : message.files}
        currentIndex={previewIndex}
        onNavigate={handleNavigatePreview}
      />
    </>
  );
}
