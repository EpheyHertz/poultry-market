'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Smile, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MessageReaction } from '@/types/chat';

interface MessageReactionsProps {
  reactions: MessageReaction[];
  onReact: (emoji: string) => void;
  onRemoveReaction: (emoji: string) => void;
  currentUserId: string;
  className?: string;
}

const COMMON_EMOJIS = [
  '👍', '👎', '❤️', '😂', '😢', '😮', '😡', '🎉', '👏', '🔥',
  '💯', '✅', '❌', '🤔', '😊', '😍', '🤩', '😭', '🙌', '💪'
];

export default function MessageReactions({
  reactions,
  onReact,
  onRemoveReaction,
  currentUserId,
  className
}: MessageReactionsProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleReactionClick = (emoji: string) => {
    const existingReaction = reactions.find(r => r.emoji === emoji);
    const userHasReacted = existingReaction?.users.includes(currentUserId);

    if (userHasReacted) {
      onRemoveReaction(emoji);
    } else {
      onReact(emoji);
    }
  };

  const hasReactions = reactions.length > 0;

  return (
    <div className={cn('flex items-center space-x-1', className)}>
      {/* Existing reactions */}
      {hasReactions && (
        <div className="flex flex-wrap gap-1">
          {reactions.map((reaction) => {
            const userHasReacted = reaction.users.includes(currentUserId);
            return (
              <Badge
                key={reaction.emoji}
                variant={userHasReacted ? "default" : "secondary"}
                className={cn(
                  "text-xs px-2 py-1 cursor-pointer hover:bg-gray-200 transition-colors",
                  userHasReacted && "bg-blue-100 text-blue-700 border-blue-200"
                )}
                onClick={() => handleReactionClick(reaction.emoji)}
              >
                <span className="mr-1">{reaction.emoji}</span>
                <span>{reaction.count}</span>
              </Badge>
            );
          })}
        </div>
      )}

      {/* Add reaction button */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          >
            {hasReactions ? <Plus className="h-3 w-3" /> : <Smile className="h-3 w-3" />}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-2" align="start">
          <div className="grid grid-cols-5 gap-2">
            {COMMON_EMOJIS.map((emoji) => (
              <Button
                key={emoji}
                variant="ghost"
                className="h-8 w-8 p-0 text-lg hover:bg-gray-100"
                onClick={() => {
                  handleReactionClick(emoji);
                  setIsOpen(false);
                }}
              >
                {emoji}
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
