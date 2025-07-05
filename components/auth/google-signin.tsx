
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Chrome } from 'lucide-react'

interface GoogleSignInProps {
  onSuccess?: (user: any) => void
  onError?: (error: string) => void
}

export default function GoogleSignIn({ onSuccess, onError }: GoogleSignInProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleGoogleSignIn = async () => {
    setIsLoading(true)
    
    try {
      // Load Google API
      if (!window.google) {
        const script = document.createElement('script')
        script.src = 'https://accounts.google.com/gsi/client'
        script.async = true
        script.defer = true
        document.head.appendChild(script)
        
        await new Promise((resolve) => {
          script.onload = resolve
        })
      }

      // Initialize Google Sign-In
      window.google.accounts.id.initialize({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse,
      })

      // Prompt for sign-in
      window.google.accounts.id.prompt()
    } catch (error) {
      console.error('Google Sign-In error:', error)
      onError?.('Failed to initialize Google Sign-In')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCredentialResponse = async (response: any) => {
    try {
      // Decode JWT token to get user info
      const payload = JSON.parse(atob(response.credential.split('.')[1]))
      
      const googleAuthResponse = await fetch('/api/auth/google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          googleId: payload.sub,
          email: payload.email,
          name: payload.name,
          avatar: payload.picture,
        }),
      })

      if (googleAuthResponse.ok) {
        const user = await googleAuthResponse.json()
        onSuccess?.(user)
        window.location.href = '/dashboard'
      } else {
        const error = await googleAuthResponse.json()
        onError?.(error.error || 'Authentication failed')
      }
    } catch (error) {
      console.error('Authentication error:', error)
      onError?.('Authentication failed')
    }
  }

  return (
    <Button
      onClick={handleGoogleSignIn}
      disabled={isLoading}
      variant="outline"
      className="w-full"
    >
      <Chrome className="w-4 h-4 mr-2" />
      {isLoading ? 'Signing in...' : 'Continue with Google'}
    </Button>
  )
}

declare global {
  interface Window {
    google: any
  }
}
