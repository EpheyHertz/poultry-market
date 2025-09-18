'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import {
  Share2,
  Facebook,
  Twitter,
  Linkedin,
  Copy,
  MessageCircle,
  Mail,
  ExternalLink
} from 'lucide-react';

interface SocialShareProps {
  url: string;
  title: string;
  description?: string;
  image?: string;
  className?: string;
}

export default function SocialShare({ 
  url, 
  title, 
  description = '', 
  image = '',
  className = '' 
}: SocialShareProps) {
  const [sharing, setSharing] = useState(false);

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  const encodedDescription = encodeURIComponent(description);

  const shareLinks = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    whatsapp: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
    email: `mailto:?subject=${encodedTitle}&body=${encodedDescription}%0A%0A${encodedUrl}`,
  };

  const handleShare = async (platform: string) => {
    setSharing(true);

    try {
      if (platform === 'copy') {
        await navigator.clipboard.writeText(url);
        toast.success('Link copied to clipboard!');
      } else if (platform === 'native' && navigator.share) {
        await navigator.share({
          title,
          text: description,
          url,
        });
      } else {
        const shareUrl = shareLinks[platform as keyof typeof shareLinks];
        if (shareUrl) {
          window.open(shareUrl, '_blank', 'width=600,height=400');
        }
      }
    } catch (error) {
      console.error('Error sharing:', error);
      toast.error('Failed to share. Please try again.');
    } finally {
      setSharing(false);
    }
  };

  const shareButtons = [
    {
      platform: 'facebook',
      label: 'Facebook',
      icon: Facebook,
      color: 'bg-blue-600 hover:bg-blue-700 text-white',
    },
    {
      platform: 'twitter',
      label: 'Twitter',
      icon: Twitter,
      color: 'bg-sky-500 hover:bg-sky-600 text-white',
    },
    {
      platform: 'linkedin',
      label: 'LinkedIn',
      icon: Linkedin,
      color: 'bg-blue-700 hover:bg-blue-800 text-white',
    },
    {
      platform: 'whatsapp',
      label: 'WhatsApp',
      icon: MessageCircle,
      color: 'bg-green-600 hover:bg-green-700 text-white',
    },
    {
      platform: 'email',
      label: 'Email',
      icon: Mail,
      color: 'bg-gray-600 hover:bg-gray-700 text-white',
    },
    {
      platform: 'copy',
      label: 'Copy Link',
      icon: Copy,
      color: 'bg-gray-500 hover:bg-gray-600 text-white',
    },
  ];

  return (
    <Card className={`${className}`}>
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Share2 className="h-5 w-5 text-emerald-600" />
          <h3 className="font-semibold text-gray-900">Share this article</h3>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {shareButtons.map(({ platform, label, icon: Icon, color }) => (
            <Button
              key={platform}
              variant="outline"
              size="sm"
              className={`${color} border-0 justify-start`}
              onClick={() => handleShare(platform)}
              disabled={sharing}
            >
              <Icon className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">{label}</span>
            </Button>
          ))}
        </div>

        {/* Native share button for mobile */}
        {typeof window !== 'undefined' && typeof navigator.share === 'function' && (
          <Button
            variant="outline"
            className="w-full mt-3 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
            onClick={() => handleShare('native')}
            disabled={sharing}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Share via...
          </Button>
        )}

        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <div className="text-sm text-gray-600 mb-2">Share URL:</div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={url}
              readOnly
              className="flex-1 text-sm bg-white border border-gray-200 rounded px-3 py-2"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleShare('copy')}
              disabled={sharing}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}