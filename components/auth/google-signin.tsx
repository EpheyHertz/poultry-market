
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Chrome } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface GoogleSignInProps {
  onSuccess?: (user: any) => void
  onError?: (error: string) => void
  redirectTo?: string
}

export default function GoogleSignIn({ onSuccess, onError, redirectTo }: GoogleSignInProps) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleGoogleSignIn = async () => {
    setIsLoading(true)
    
    try {
      // Load Google API if not already loaded
      if (!window.google) {
        const script = document.createElement('script')
        script.src = 'https://accounts.google.com/gsi/client'
        script.async = true
        script.defer = true
        document.head.appendChild(script)
        
        await new Promise((resolve, reject) => {
          script.onload = resolve
          script.onerror = reject
        })
      }

      // Initialize Google Sign-In
      window.google.accounts.id.initialize({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '785519424538-dre6f9o1rrkq4g8v4nofg6o7s7t8l1qr.apps.googleusercontent.com',
        callback: handleCredentialResponse,
        auto_select: false,
        cancel_on_tap_outside: true
      })

      // Prompt for sign-in
      window.google.accounts.id.prompt((notification: any) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          // Fallback to renderButton if prompt fails
          renderGoogleButton()
        }
      })
    } catch (error) {
      console.error('Google Sign-In error:', error)
      onError?.('Failed to initialize Google Sign-In')
      setIsLoading(false)
    }
  }

  const renderGoogleButton = () => {
    const buttonDiv = document.createElement('div')
    buttonDiv.id = 'google-signin-button'
    document.body.appendChild(buttonDiv)

    window.google.accounts.id.renderButton(
      buttonDiv,
      {
        theme: 'outline',
        size: 'large',
        width: 300,
        text: 'signin_with'
      }
    )

    // Click the rendered button programmatically
    setTimeout(() => {
      const googleButton = buttonDiv.querySelector('div[role="button"]') as HTMLElement
      if (googleButton) {
        googleButton.click()
      }
      // Clean up
      setTimeout(() => {
        if (buttonDiv.parentNode) {
          buttonDiv.parentNode.removeChild(buttonDiv)
        }
      }, 1000)
    }, 100)
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
          emailVerified: payload.email_verified,
        }),
      })

      const result = await googleAuthResponse.json()

      if (googleAuthResponse.ok) {
        onSuccess?.(result.user)
        
        // Redirect based on user role or provided redirect path
        const destination = redirectTo || getDashboardPath(result.user.role)
        router.push(destination)
      } else {
        onError?.(result.error || 'Authentication failed')
      }
    } catch (error) {
      console.error('Authentication error:', error)
      onError?.('Authentication failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const getDashboardPath = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return '/admin/dashboard'
      case 'SELLER':
        return '/seller/dashboard'
      case 'COMPANY':
        return '/company/dashboard'
      case 'DELIVERY_AGENT':
        return '/delivery-agent/dashboard'
      case 'STAKEHOLDER':
        return '/stakeholder/dashboard'
      default:
        return '/customer/dashboard'
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
