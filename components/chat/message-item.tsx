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
  Copy
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
import type { Message } from '@/types/chat';

interface MessageItemProps {
  message: Message;
  isOwn: boolean;
  showAvatar: boolean;
  onReply: (message: Message) => void;
  onEdit: (message: Message) => void;
  onDelete: (messageId: string) => void;
}

export default function MessageItem({
  message,
  isOwn,
  showAvatar,
  onReply,
  onEdit,
  onDelete
}: MessageItemProps) {
  const [showActions, setShowActions] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    toast.success('Message copied to clipboard');
  };

  const handleDownload = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
                message.images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'
              )}>
                {message.images.map((image, index) => (
                  <div key={index} className="relative group/image">
                    <Image
                      src={image}
                      alt={`Image ${index + 1}`}
                      width={200}
                      height={200}
                      className="rounded-lg object-cover cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => {
                        // Open image in modal/lightbox
                        window.open(image, '_blank');
                      }}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 opacity-0 group-hover/image:opacity-100 transition-opacity bg-black/50 text-white hover:bg-black/70"
                      onClick={() => handleDownload(image, `image-${index + 1}.jpg`)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Files */}
            {message.files.length > 0 && (
              <div className="space-y-2 mt-2">
                {message.files.map((file, index) => (
                  <div 
                    key={index}
                    className={cn(
                      'flex items-center space-x-2 p-2 rounded border cursor-pointer hover:bg-opacity-80',
                      isOwn ? 'bg-blue-400 border-blue-300' : 'bg-white border-gray-200'
                    )}
                    onClick={() => handleDownload(file, `file-${index + 1}`)}
                  >
                    <Download className="h-4 w-4" />
                    <span className="text-sm truncate">
                      File {index + 1}
                    </span>
                  </div>
                ))}
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
        </div>
      </div>
    </div>
  );
}
