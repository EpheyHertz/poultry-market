'use client';

import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Calendar, Eye, MoreHorizontal, Edit, Trash2, ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import Image from 'next/image';
import { Announcement, ANNOUNCEMENT_TYPES, ANNOUNCEMENT_STATUSES, AVAILABLE_REACTIONS } from '@/types/announcement';

interface AnnouncementCardProps {
  announcement: Announcement;
  onReaction: (announcementId: string, reaction: string) => void;
  canEdit?: boolean;
}

export default function AnnouncementCard({ 
  announcement, 
  onReaction, 
  canEdit = false 
}: AnnouncementCardProps) {
  const [showFullContent, setShowFullContent] = useState(false);

  const typeConfig = ANNOUNCEMENT_TYPES[announcement.type];
  const statusConfig = ANNOUNCEMENT_STATUSES[announcement.status];

  const isExpired = announcement.expiresAt && new Date(announcement.expiresAt) < new Date();
  const isScheduled = announcement.publishAt && new Date(announcement.publishAt) > new Date();

  const handleReaction = (reaction: string) => {
    if (announcement.userReaction === reaction) {
      // Remove reaction if clicking the same one
      onReaction(announcement.id, '');
    } else {
      onReaction(announcement.id, reaction);
    }
  };

  const contentPreview = announcement.content.length > 300 
    ? announcement.content.slice(0, 300) + '...'
    : announcement.content;

  return (
    <Card className={`transition-all duration-200 hover:shadow-md ${
      announcement.type === 'URGENT' ? 'border-red-500 shadow-red-100' : ''
    } ${isExpired ? 'opacity-75' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={announcement.author.avatar} alt={announcement.author.name} />
              <AvatarFallback>
                {announcement.author.name.split(' ').map(n => n[0]).join('').toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <h3 className="font-semibold text-lg text-gray-900">
                  {announcement.title}
                </h3>
                <Badge className={typeConfig.color}>
                  {typeConfig.icon} {typeConfig.label}
                </Badge>
                {announcement.status !== 'PUBLISHED' && (
                  <Badge variant="outline" className={statusConfig.color}>
                    {statusConfig.label}
                  </Badge>
                )}
                {isExpired && (
                  <Badge variant="destructive">Expired</Badge>
                )}
                {isScheduled && (
                  <Badge variant="secondary">Scheduled</Badge>
                )}
              </div>
              
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <span>By {announcement.author.name}</span>
                <Badge variant="outline" className="text-xs">
                  {announcement.author.role}
                </Badge>
                <div className="flex items-center space-x-1">
                  <Calendar className="h-3 w-3" />
                  <span>{formatDistanceToNow(new Date(announcement.createdAt), { addSuffix: true })}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Eye className="h-3 w-3" />
                  <span>{announcement.viewCount} views</span>
                </div>
              </div>
            </div>
          </div>
          
          {canEdit && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem className="text-red-600">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {/* Image */}
        {announcement.imageUrl && (
          <div className="mb-4">
            <Image
              src={announcement.imageUrl}
              alt={announcement.title}
              width={600}
              height={300}
              className="rounded-lg object-cover w-full h-48"
            />
          </div>
        )}

        {/* Content */}
        <div className="mb-4">
          <p className="text-gray-700 whitespace-pre-wrap">
            {showFullContent ? announcement.content : contentPreview}
          </p>
          {announcement.content.length > 300 && (
            <Button
              variant="link"
              className="p-0 h-auto text-blue-600"
              onClick={() => setShowFullContent(!showFullContent)}
            >
              {showFullContent ? 'Show less' : 'Read more'}
            </Button>
          )}
        </div>

        {/* Product Association */}
        {announcement.product && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              {announcement.product.images && announcement.product.images.length > 0 && (
                <Image
                  src={announcement.product.images[0]}
                  alt={announcement.product.name}
                  width={40}
                  height={40}
                  className="rounded object-cover"
                />
              )}
              <div className="flex-1">
                <p className="font-medium text-gray-900">{announcement.product.name}</p>
                <p className="text-sm text-gray-600">Related Product</p>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/product/${announcement.product.slug}`}>
                  <ExternalLink className="h-3 w-3 mr-1" />
                  View
                </Link>
              </Button>
            </div>
          </div>
        )}

        {/* Attachment */}
        {announcement.attachmentUrl && (
          <div className="mb-4">
            <Button variant="outline" asChild>
              <a href={announcement.attachmentUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                View Attachment
              </a>
            </Button>
          </div>
        )}

        {/* Expiry */}
        {announcement.expiresAt && (
          <div className="mb-4 text-sm text-gray-600">
            <Calendar className="h-4 w-4 inline mr-1" />
            Expires {formatDistanceToNow(new Date(announcement.expiresAt), { addSuffix: true })}
          </div>
        )}

        {/* Reactions */}
        <div className="flex items-center justify-between pt-3 border-t">
          <div className="flex items-center space-x-2">
            {AVAILABLE_REACTIONS.map((reaction) => {
              const count = announcement.reactionCounts?.[reaction] || 0;
              const isActive = announcement.userReaction === reaction;
              
              return (
                <Button
                  key={reaction}
                  variant={isActive ? "default" : "ghost"}
                  size="sm"
                  onClick={() => handleReaction(reaction)}
                  className={`h-8 px-2 ${isActive ? 'bg-blue-100 text-blue-700' : ''}`}
                >
                  <span className="mr-1">{reaction}</span>
                  {count > 0 && <span className="text-xs">{count}</span>}
                </Button>
              );
            })}
          </div>

          {/* Target Audience */}
          {!announcement.isGlobal && announcement.targetRoles.length > 0 && (
            <div className="text-xs text-gray-500">
              Target: {announcement.targetRoles.join(', ')}
            </div>
          )}
          {announcement.isGlobal && (
            <div className="text-xs text-gray-500">
              Global announcement
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
