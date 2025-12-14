'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import FollowButton from '@/components/blog/follow-button';
import {
  User,
  MapPin,
  Globe,
  Calendar,
  BookOpen,
  Users,
  Twitter,
  Linkedin,
  ExternalLink,
  ShieldCheck,
  Verified
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Author {
  id: string;
  name: string;
  avatar?: string | null;
  bio?: string | null;
  location?: string | null;
  website?: string | null;
  createdAt?: string | Date;
  isVerified?: boolean;
  authorProfile?: {
    username?: string;
    displayName?: string;
    isVerified?: boolean;
    socialLinks?: {
      twitter?: string;
      linkedin?: string;
      github?: string;
    };
  } | null;
  _count?: {
    blogPosts?: number;
    followers?: number;
    following?: number;
  };
}

interface AuthorCardProps {
  author: Author;
  currentUserId?: string | null;
  variant?: 'default' | 'compact' | 'inline';
  showFollowButton?: boolean;
  showStats?: boolean;
  className?: string;
}

export default function AuthorCard({
  author,
  currentUserId,
  variant = 'default',
  showFollowButton = true,
  showStats = true,
  className
}: AuthorCardProps) {
  const [isFollowing, setIsFollowing] = useState(false);

  const authorUsername = author.authorProfile?.username;
  const displayName = author.authorProfile?.displayName || author.name;
  const isVerified = author.authorProfile?.isVerified || author.isVerified;
  const socialLinks = author.authorProfile?.socialLinks;

  const authorUrl = authorUsername 
    ? `/author/${authorUsername}` 
    : `/blog/author/${author.id}`;

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric'
    });
  };

  // Inline variant - minimal display
  if (variant === 'inline') {
    return (
      <Link 
        href={authorUrl}
        className={cn(
          'inline-flex items-center gap-2 hover:opacity-80 transition-opacity',
          className
        )}
      >
        <Avatar className="h-6 w-6">
          <AvatarImage src={author.avatar || undefined} alt={displayName} />
          <AvatarFallback className="text-xs bg-emerald-100 text-emerald-700">
            {displayName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <span className="font-medium text-sm">{displayName}</span>
        {isVerified && (
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
        )}
      </Link>
    );
  }

  // Compact variant - small card
  if (variant === 'compact') {
    return (
      <div className={cn(
        'flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50',
        className
      )}>
        <Link href={authorUrl}>
          <Avatar className="h-10 w-10">
            <AvatarImage src={author.avatar || undefined} alt={displayName} />
            <AvatarFallback className="bg-emerald-100 text-emerald-700">
              {displayName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </Link>
        
        <div className="flex-1 min-w-0">
          <Link href={authorUrl} className="hover:underline">
            <h4 className="font-medium text-sm flex items-center gap-1.5 truncate">
              {displayName}
              {isVerified && (
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
              )}
            </h4>
          </Link>
          {author._count?.blogPosts !== undefined && (
            <p className="text-xs text-muted-foreground">
              {author._count.blogPosts} articles
            </p>
          )}
        </div>

        {showFollowButton && currentUserId && currentUserId !== author.id && (
          <FollowButton
            userId={author.id}
            initialFollowing={isFollowing}
          />
        )}
      </div>
    );
  }

  // Default variant - full card
  return (
    <Card className={cn(
      'overflow-hidden border dark:border-gray-700',
      className
    )}>
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-start gap-4">
          <Link href={authorUrl}>
            <Avatar className="h-16 w-16 ring-2 ring-offset-2 ring-emerald-500/20">
              <AvatarImage src={author.avatar || undefined} alt={displayName} />
              <AvatarFallback className="text-xl bg-emerald-100 text-emerald-700">
                {displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </Link>

          <div className="flex-1 min-w-0">
            <Link href={authorUrl} className="hover:underline">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                {displayName}
                {isVerified && (
                  <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                    <ShieldCheck className="h-3 w-3 mr-1" />
                    Verified
                  </Badge>
                )}
              </h3>
            </Link>

            {authorUsername && (
              <p className="text-sm text-muted-foreground">@{authorUsername}</p>
            )}

            {author.location && (
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                <MapPin className="h-3.5 w-3.5" />
                {author.location}
              </p>
            )}
          </div>

          {showFollowButton && currentUserId && currentUserId !== author.id && (
            <FollowButton
              userId={author.id}
              initialFollowing={isFollowing}
            />
          )}
        </div>

        {/* Bio */}
        {author.bio && (
          <p className="mt-4 text-sm text-muted-foreground line-clamp-3">
            {author.bio}
          </p>
        )}

        {/* Stats */}
        {showStats && author._count && (
          <div className="mt-4 flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <BookOpen className="h-4 w-4" />
              <span className="font-medium text-foreground">{author._count.blogPosts || 0}</span>
              <span>articles</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Users className="h-4 w-4" />
              <span className="font-medium text-foreground">{author._count.followers || 0}</span>
              <span>followers</span>
            </div>
          </div>
        )}

        {/* Links & Social */}
        <div className="mt-4 flex items-center gap-2 flex-wrap">
          {author.website && (
            <Button
              variant="outline"
              size="sm"
              asChild
              className="h-8 text-xs"
            >
              <a href={author.website} target="_blank" rel="noopener noreferrer">
                <Globe className="h-3.5 w-3.5 mr-1.5" />
                Website
                <ExternalLink className="h-3 w-3 ml-1 opacity-50" />
              </a>
            </Button>
          )}

          {socialLinks?.twitter && (
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              asChild
            >
              <a 
                href={`https://twitter.com/${socialLinks.twitter}`} 
                target="_blank" 
                rel="noopener noreferrer"
                title="Twitter"
              >
                <Twitter className="h-3.5 w-3.5" />
              </a>
            </Button>
          )}

          {socialLinks?.linkedin && (
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              asChild
            >
              <a 
                href={`https://linkedin.com/in/${socialLinks.linkedin}`} 
                target="_blank" 
                rel="noopener noreferrer"
                title="LinkedIn"
              >
                <Linkedin className="h-3.5 w-3.5" />
              </a>
            </Button>
          )}
        </div>

        {/* Join Date */}
        {author.createdAt && (
          <p className="mt-4 pt-4 border-t dark:border-gray-700 text-xs text-muted-foreground flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            Member since {formatDate(author.createdAt)}
          </p>
        )}

        {/* View Profile Link */}
        <div className="mt-4">
          <Button
            variant="ghost"
            className="w-full justify-center text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-900/20"
            asChild
          >
            <Link href={authorUrl}>
              View Full Profile
              <ExternalLink className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Simple Author Byline for post headers
export function AuthorByline({ 
  author, 
  date,
  readingTime,
  className 
}: { 
  author: Author; 
  date?: string | Date;
  readingTime?: number;
  className?: string;
}) {
  const authorUsername = author.authorProfile?.username;
  const displayName = author.authorProfile?.displayName || author.name;
  const isVerified = author.authorProfile?.isVerified || author.isVerified;

  const authorUrl = authorUsername 
    ? `/author/${authorUsername}` 
    : `/blog/author/${author.id}`;

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <Link href={authorUrl}>
        <Avatar className="h-10 w-10">
          <AvatarImage src={author.avatar || undefined} alt={displayName} />
          <AvatarFallback className="bg-emerald-100 text-emerald-700">
            {displayName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </Link>

      <div className="flex flex-col">
        <Link href={authorUrl} className="hover:underline">
          <span className="font-medium text-sm flex items-center gap-1.5">
            {displayName}
            {isVerified && (
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            )}
          </span>
        </Link>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {date && (
            <time dateTime={new Date(date).toISOString()}>
              {new Date(date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              })}
            </time>
          )}
          {date && readingTime && <span>·</span>}
          {readingTime && <span>{readingTime} min read</span>}
        </div>
      </div>
    </div>
  );
}
