
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { QrCode, Download, Share2, Copy } from 'lucide-react'
import { generateQRCode } from '@/lib/qr-code'

export default function SellerQRCode() {
  const [user, setUser] = useState<any>(null)
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('')
  const [customSlug, setCustomSlug] = useState<string>('')
  const [storeUrl, setStoreUrl] = useState<string>('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [message, setMessage] = useState<string>('')
  const router = useRouter()

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/auth/me')
        if (response.ok) {
          const userData = await response.json()
          if (userData.role !== 'SELLER') {
            router.push('/auth/login')
            return
          }
          setUser(userData)
          setCustomSlug(userData.dashboardSlug || '')
          setStoreUrl(`${window.location.origin}/store/${userData.dashboardSlug || userData.id}`)
          
          // Generate QR code if slug exists
          if (userData.dashboardSlug) {
            generateQRCodeForStore(userData.dashboardSlug)
          }
        } else {
          router.push('/auth/login')
        }
      } catch (error) {
        router.push('/auth/login')
      }
    }

    fetchUser()
  }, [router])

  const generateQRCodeForStore = async (slug: string) => {
    try {
      setIsGenerating(true)
      const storeUrl = `${window.location.origin}/store/${slug}`
      const qrCode = await generateQRCode(storeUrl)
      setQrCodeUrl(qrCode)
      setStoreUrl(storeUrl)
    } catch (error) {
      console.error('QR code generation error:', error)
      setMessage('Failed to generate QR code')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleUpdateSlug = async () => {
    if (!customSlug.trim()) {
      setMessage('Please enter a custom slug')
      return
    }

    try {
      setIsGenerating(true)
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dashboardSlug: customSlug.toLowerCase().replace(/[^a-z0-9-]/g, '-')
        }),
      })

      if (response.ok) {
        const updatedUser = await response.json()
        setUser(updatedUser)
        await generateQRCodeForStore(updatedUser.dashboardSlug)
        setMessage('QR code updated successfully!')
      } else {
        const error = await response.json()
        setMessage(error.error || 'Failed to update slug')
      }
    } catch (error) {
      setMessage('Failed to update slug')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(storeUrl)
    setMessage('Store URL copied to clipboard!')
  }

  const handleDownloadQR = () => {
    if (!qrCodeUrl) return
    
    const link = document.createElement('a')
    link.download = `${user.name}-store-qr.png`
    link.href = qrCodeUrl
    link.click()
  }

  if (!user) {
    return <div>Loading...</div>
  }

  return (
    <DashboardLayout user={user}>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Store QR Code</h1>
          <p className="text-gray-600 mt-2">Generate and share your store QR code</p>
        </div>

        {message && (
          <Alert>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* QR Code Display */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                Your Store QR Code
              </CardTitle>
              <CardDescription>
                Customers can scan this to access your store directly
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {qrCodeUrl ? (
                <div className="flex flex-col items-center space-y-4">
                  <img 
                    src={qrCodeUrl} 
                    alt="Store QR Code"
                    className="w-64 h-64 border rounded-lg"
                  />
                  <div className="flex gap-2">
                    <Button onClick={handleDownloadQR} variant="outline">
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                    <Button onClick={handleCopyUrl} variant="outline">
                      <Copy className="h-4 w-4 mr-2" />
                      Copy URL
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg">
                  <QrCode className="h-12 w-12 text-gray-400" />
                  <p className="text-gray-500 mt-2">No QR code generated yet</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Store URL Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Store URL Settings</CardTitle>
              <CardDescription>
                Customize your store URL and generate QR code
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="slug">Custom Store Slug</Label>
                <Input
                  id="slug"
                  value={customSlug}
                  onChange={(e) => setCustomSlug(e.target.value)}
                  placeholder="my-store-name"
                />
                <p className="text-sm text-gray-500">
                  URL will be: {window.location.origin}/store/{customSlug || 'your-slug'}
                </p>
              </div>

              <Button 
                onClick={handleUpdateSlug}
                disabled={isGenerating}
                className="w-full"
              >
                {isGenerating ? 'Generating...' : 'Update & Generate QR Code'}
              </Button>

              {storeUrl && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium">Your Store URL:</p>
                  <p className="text-sm text-blue-600 break-all">{storeUrl}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
