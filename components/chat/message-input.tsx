'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Send, 
  Paperclip, 
  Image as ImageIcon,
  Smile,
  X,
  File
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { Message, MessageFile } from '@/types/chat';

interface MessageInputProps {
  onSend: (content: string, images?: string[], files?: MessageFile[]) => void;
  onTyping: (isTyping: boolean) => void;
  editingMessage?: Message | null;
  onEditCancel: () => void;
  onEditSave: (messageId: string, newContent: string) => void;
}

export default function MessageInput({
  onSend,
  onTyping,
  editingMessage,
  onEditCancel,
  onEditSave
}: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<{
    images: { file: File; preview: string; url?: string }[];
    files: { file: File; name: string; size: number; type: string; url?: string }[];
  }>({
    images: [],
    files: []
  });
  const [uploading, setUploading] = useState(false);
  const [typingTimer, setTypingTimer] = useState<NodeJS.Timeout | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Set editing message content
  useEffect(() => {
    if (editingMessage) {
      setMessage(editingMessage.content);
      textareaRef.current?.focus();
    } else {
      setMessage('');
    }
  }, [editingMessage]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  // Handle typing indicator
  const handleInputChange = (value: string) => {
    setMessage(value);

    // Clear existing timer
    if (typingTimer) {
      clearTimeout(typingTimer);
    }

    // Start typing
    onTyping(true);

    // Set timer to stop typing indicator
    const timer = setTimeout(() => {
      onTyping(false);
    }, 1000);
    setTypingTimer(timer);
  };

  // Upload files to server
  const uploadFile = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/upload/cloudinary', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error('Upload failed');
    }

    const data = await response.json();
    return data.url;
  };

  // Handle image selection
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    files.forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setAttachments(prev => ({
            ...prev,
            images: [...prev.images, {
              file,
              preview: e.target?.result as string
            }]
          }));
        };
        reader.readAsDataURL(file);
      }
    });

    // Reset input
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    files.forEach(file => {
      setAttachments(prev => ({
        ...prev,
        files: [...prev.files, {
          file,
          name: file.name,
          size: file.size,
          type: file.type
        }]
      }));
    });

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Remove attachment
  const removeAttachment = (type: 'images' | 'files', index: number) => {
    setAttachments(prev => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== index)
    }));
  };

  // Handle send message
  const handleSend = async () => {
    if (!message.trim() && attachments.images.length === 0 && attachments.files.length === 0) {
      return;
    }

    try {
      setUploading(true);

      // Upload attachments
      const imageUrls: string[] = [];
      const messageFiles: MessageFile[] = [];

      // Upload images
      for (const imageAttachment of attachments.images) {
        try {
          const url = await uploadFile(imageAttachment.file);
          imageUrls.push(url);
        } catch (error) {
          console.error('Error uploading image:', error);
          toast.error(`Failed to upload image: ${imageAttachment.file.name}`);
        }
      }

      // Upload files
      for (const fileAttachment of attachments.files) {
        try {
          const url = await uploadFile(fileAttachment.file);
          messageFiles.push({
            id: `${Date.now()}-${Math.random()}`, // Temporary ID, server will assign proper ID
            name: fileAttachment.name,
            url: url,
            type: fileAttachment.type,
            size: fileAttachment.size,
            mimeType: fileAttachment.type
          });
        } catch (error) {
          console.error('Error uploading file:', error);
          toast.error(`Failed to upload file: ${fileAttachment.name}`);
        }
      }

      // Send message
      if (editingMessage) {
        await onEditSave(editingMessage.id, message.trim());
      } else {
        await onSend(message.trim(), imageUrls, messageFiles);
      }

      // Reset form
      setMessage('');
      setAttachments({ images: [], files: [] });
      onTyping(false);

    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setUploading(false);
    }
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="space-y-3">
      {/* Editing indicator */}
      {editingMessage && (
        <div className="flex items-center justify-between bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <div>
            <p className="text-sm font-medium text-yellow-800">Editing message</p>
            <p className="text-xs text-yellow-600">Press Enter to save, Escape to cancel</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onEditCancel}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Image previews */}
      {attachments.images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attachments.images.map((image, index) => (
            <div key={index} className="relative group">
              <Image
                src={image.preview}
                alt={`Preview ${index + 1}`}
                width={80}
                height={80}
                className="object-cover rounded-lg border"
              />
              <Button
                variant="destructive"
                size="icon"
                className="absolute -top-2 -right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => removeAttachment('images', index)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* File previews */}
      {attachments.files.length > 0 && (
        <div className="space-y-2">
          {attachments.files.map((file, index) => (
            <div key={index} className="flex items-center justify-between bg-gray-50 rounded-lg p-2">
              <div className="flex items-center space-x-2">
                <File className="h-4 w-4 text-gray-500" />
                <span className="text-sm truncate">{file.name}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => removeAttachment('files', index)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Input area */}
      <div className="flex items-end space-x-2">
        {/* Attachment buttons */}
        <div className="flex space-x-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => imageInputRef.current?.click()}
            disabled={uploading}
          >
            <ImageIcon className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <Paperclip className="h-4 w-4" />
          </Button>
        </div>

        {/* Text input */}
        <div className="flex-1">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={editingMessage ? "Edit your message..." : "Type a message..."}
            className="min-h-[40px] max-h-32 resize-none"
            disabled={uploading}
          />
        </div>

        {/* Send button */}
        <Button
          onClick={handleSend}
          disabled={(!message.trim() && attachments.images.length === 0 && attachments.files.length === 0) || uploading}
          className="h-10 w-10 rounded-full"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>

      {/* Hidden file inputs */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleImageSelect}
      />
      
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />
    </div>
  );
}
