
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { MessageCircle, HelpCircle } from 'lucide-react'
import ChatWidget from '@/components/chat/chat-widget'

export default function AdminSupportChat() {
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <ChatWidget
        participantId="admin-support"
        participantName="Customer Support"
        participantAvatar="/images/support-avatar.png"
        triggerButton={
          <Button 
            size="lg" 
            className="rounded-full shadow-lg bg-blue-600 hover:bg-blue-700"
          >
            <HelpCircle className="h-5 w-5 mr-2" />
            Support
          </Button>
        }
      />
    </div>
  )
}
