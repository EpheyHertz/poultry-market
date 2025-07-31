'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bell, Megaphone, ChevronRight, Eye } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { Announcement, ANNOUNCEMENT_TYPES } from '@/types/announcement';

interface AnnouncementWidgetProps {
  maxItems?: number;
  showViewAll?: boolean;
  className?: string;
}

export default function AnnouncementWidget({ 
  maxItems = 5, 
  showViewAll = true,
  className = ""
}: AnnouncementWidgetProps) {
  const [user, setUser] = useState<any>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch user data
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      }
    };

    fetchUser();
  }, []);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/announcements?limit=${maxItems + 2}`);
        if (response.ok) {
          const data = await response.json();
          setAnnouncements(data.announcements.slice(0, maxItems));
        }
      } catch (error) {
        console.error('Error fetching announcements:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnnouncements();
  }, [maxItems]);

  const markAsViewed = async (announcementId: string) => {
    try {
      await fetch(`/api/announcements/${announcementId}`, {
        method: 'GET'
      });
      // Update local state to mark as viewed
      setAnnouncements(prev => 
        prev.map(announcement => 
          announcement.id === announcementId 
            ? { ...announcement, isViewed: true }
            : announcement
        )
      );
    } catch (error) {
      console.error('Error marking announcement as viewed:', error);
    }
  };

  const unviewedCount = announcements.filter(a => !a.isViewed).length;

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center space-x-2 text-lg">
            <Bell className="h-5 w-5" />
            <span>Announcements</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2 text-lg">
            <Bell className="h-5 w-5" />
            <span>Announcements</span>
            {unviewedCount > 0 && (
              <Badge variant="destructive" className="h-5 w-5 flex items-center justify-center p-0 text-xs">
                {unviewedCount}
              </Badge>
            )}
          </CardTitle>
          {showViewAll && (
            <Button variant="ghost" size="sm" asChild>
              <Link href="/announcements">
                <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        {announcements.length === 0 ? (
          <div className="text-center py-6">
            <Megaphone className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600">No announcements yet</p>
          </div>
        ) : (
          <ScrollArea className="h-64">
            <div className="space-y-3">
              {announcements.map((announcement) => {
                const typeConfig = ANNOUNCEMENT_TYPES[announcement.type];
                const isExpired = announcement.expiresAt && new Date(announcement.expiresAt) < new Date();
                
                return (
                  <div
                    key={announcement.id}
                    className={`p-3 rounded-lg border transition-colors cursor-pointer hover:bg-gray-50 ${
                      !announcement.isViewed ? 'bg-blue-50 border-blue-200' : 'bg-white'
                    } ${isExpired ? 'opacity-60' : ''}`}
                    onClick={() => markAsViewed(announcement.id)}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="font-medium text-sm text-gray-900 truncate">
                            {announcement.title}
                          </h4>
                          <Badge className={`${typeConfig.color} text-xs`}>
                            {typeConfig.icon}
                          </Badge>
                          {!announcement.isViewed && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          )}
                        </div>
                        
                        <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                          {announcement.content.substring(0, 80)}
                          {announcement.content.length > 80 && '...'}
                        </p>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2 text-xs text-gray-500">
                            <span>{announcement.author.name}</span>
                            <span>•</span>
                            <span>{formatDistanceToNow(new Date(announcement.createdAt), { addSuffix: true })}</span>
                          </div>
                          
                          {announcement.viewCount > 0 && (
                            <div className="flex items-center space-x-1 text-xs text-gray-500">
                              <Eye className="h-3 w-3" />
                              <span>{announcement.viewCount}</span>
                            </div>
                          )}
                        </div>

                        {isExpired && (
                          <Badge variant="destructive" className="text-xs mt-1">
                            Expired
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
        
        {showViewAll && announcements.length > 0 && (
          <div className="mt-4 pt-3 border-t">
            <Button variant="outline" size="sm" className="w-full" asChild>
              <Link href="/announcements">
                View All Announcements
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
