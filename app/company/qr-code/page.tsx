
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { QrCode, Download, Share, Copy, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

export default function CompanyQRCode() {
  const [user, setUser] = useState<any>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [customData, setCustomData] = useState({
    title: '',
    description: '',
    contactInfo: '',
    promotionalText: ''
  });
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const userData = await response.json();
          if (userData.role !== 'COMPANY') {
            router.push('/auth/login');
            return;
          }
          setUser(userData);
          setCustomData(prev => ({
            ...prev,
            title: userData.name,
            description: `Visit ${userData.name} - Your trusted poultry supplier`,
            contactInfo: userData.email
          }));
        } else {
          router.push('/auth/login');
        }
      } catch (error) {
        router.push('/auth/login');
      }
    };

    fetchUser();
  }, [router]);

  const generateQRCode = async () => {
    if (!user) return;

    setIsGenerating(true);
    try {
      const companyUrl = `${window.location.origin}/company/${user.dashboardSlug}`;
      
      const qrData = {
        url: companyUrl,
        type: 'company',
        data: {
          name: user.name,
          slug: user.dashboardSlug,
          ...customData
        }
      };

      const response = await fetch('/api/qr-code/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: JSON.stringify(qrData),
          size: 256,
          errorCorrectionLevel: 'M'
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setQrCodeUrl(url);
        toast.success('QR code generated successfully!');
      } else {
        toast.error('Failed to generate QR code');
      }
    } catch (error) {
      toast.error('An error occurred while generating QR code');
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadQRCode = () => {
    if (!qrCodeUrl) return;

    const link = document.createElement('a');
    link.href = qrCodeUrl;
    link.download = `${user.name.replace(/\s+/g, '-')}-qr-code.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('QR code downloaded!');
  };

  const copyCompanyUrl = async () => {
    if (!user) return;
    
    const companyUrl = `${window.location.origin}/company/${user.dashboardSlug}`;
    try {
      await navigator.clipboard.writeText(companyUrl);
      toast.success('Company URL copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy URL');
    }
  };

  const shareQRCode = async () => {
    if (!qrCodeUrl || !navigator.share) {
      toast.error('Sharing not supported on this device');
      return;
    }

    try {
      const response = await fetch(qrCodeUrl);
      const blob = await response.blob();
      const file = new File([blob], `${user.name}-qr-code.png`, { type: 'image/png' });

      await navigator.share({
        title: `${user.name} - Company QR Code`,
        text: `Visit ${user.name} by scanning this QR code`,
        files: [file]
      });
    } catch (error) {
      toast.error('Failed to share QR code');
    }
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  const companyUrl = `${window.location.origin}/company/${user.dashboardSlug}`;

  return (
    <DashboardLayout user={user}>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">QR Code Generator</h1>
          <p className="text-gray-600 mt-2">Generate and customize QR codes for your company</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* QR Code Generation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <QrCode className="h-5 w-5" />
                <span>Company QR Code</span>
              </CardTitle>
              <CardDescription>
                Generate a QR code that links to your company page
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label>Company URL</Label>
                  <div className="flex items-center space-x-2 mt-1">
                    <Input 
                      value={companyUrl} 
                      readOnly 
                      className="flex-1"
                    />
                    <Button size="sm" variant="outline" onClick={copyCompanyUrl}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <a href={companyUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="title">Display Title</Label>
                  <Input
                    id="title"
                    value={customData.title}
                    onChange={(e) => setCustomData({ ...customData, title: e.target.value })}
                    placeholder="Your company name"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={customData.description}
                    onChange={(e) => setCustomData({ ...customData, description: e.target.value })}
                    placeholder="Brief description of your company"
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="contactInfo">Contact Information</Label>
                  <Input
                    id="contactInfo"
                    value={customData.contactInfo}
                    onChange={(e) => setCustomData({ ...customData, contactInfo: e.target.value })}
                    placeholder="Email or phone number"
                  />
                </div>

                <div>
                  <Label htmlFor="promotionalText">Promotional Text</Label>
                  <Input
                    id="promotionalText"
                    value={customData.promotionalText}
                    onChange={(e) => setCustomData({ ...customData, promotionalText: e.target.value })}
                    placeholder="Special offers or promotions"
                  />
                </div>
              </div>

              <Button 
                onClick={generateQRCode} 
                disabled={isGenerating}
                className="w-full"
              >
                {isGenerating ? 'Generating...' : 'Generate QR Code'}
              </Button>
            </CardContent>
          </Card>

          {/* QR Code Display */}
          <Card>
            <CardHeader>
              <CardTitle>Generated QR Code</CardTitle>
              <CardDescription>
                Scan this code to visit your company page
              </CardDescription>
            </CardHeader>
            <CardContent>
              {qrCodeUrl ? (
                <div className="space-y-6">
                  <div className="flex justify-center">
                    <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
                      <img 
                        src={qrCodeUrl} 
                        alt="Company QR Code" 
                        className="w-64 h-64"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Button onClick={downloadQRCode} className="w-full">
                      <Download className="mr-2 h-4 w-4" />
                      Download QR Code
                    </Button>
                    
                    {navigator.share && (
                      <Button onClick={shareQRCode} variant="outline" className="w-full">
                        <Share className="mr-2 h-4 w-4" />
                        Share QR Code
                      </Button>
                    )}
                  </div>

                  <div className="text-center text-sm text-gray-600">
                    <p>Use this QR code on:</p>
                    <ul className="mt-1 space-y-1">
                      <li>• Business cards</li>
                      <li>• Product packaging</li>
                      <li>• Marketing materials</li>
                      <li>• Store displays</li>
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <QrCode className="mx-auto h-16 w-16 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No QR code generated</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Click "Generate QR Code" to create your company QR code
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Usage Tips */}
        <Card>
          <CardHeader>
            <CardTitle>QR Code Usage Tips</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-2">Best Practices</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Ensure good contrast between QR code and background</li>
                  <li>• Test the QR code with multiple devices before printing</li>
                  <li>• Include a brief call-to-action near the QR code</li>
                  <li>• Make sure the QR code is large enough to scan easily</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Placement Ideas</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Product packaging and labels</li>
                  <li>• Business cards and brochures</li>
                  <li>• Store windows and displays</li>
                  <li>• Social media posts and websites</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
