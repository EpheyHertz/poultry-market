'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import GoogleSignIn from '@/components/auth/google-signin';
import Link from 'next/link';
import { Bird, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Login successful!');

        // Redirect based on user role
        switch (data.user.role) {
          case 'ADMIN':
            router.push('/admin/dashboard');
            break;
          case 'SELLER':
            router.push('/seller/dashboard');
            break;
          case 'COMPANY':
            router.push('/company/dashboard');
            break;
          case 'STAKEHOLDER':
            router.push('/stakeholder/dashboard');
            break;
          case 'DELIVERY_AGENT':
            router.push('/delivery-agent/dashboard');
            break;
          default:
            router.push('/customer/dashboard');
        }
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (error) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    setError('');

    try {
      // In a real implementation, you would use Google OAuth
      // For demo purposes, we'll simulate Google login
      const mockGoogleUser = {
        googleId: 'google_' + Date.now(),
        email: 'demo@google.com',
        name: 'Google User',
        avatar: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=100'
      };

      const response = await fetch('/api/auth/google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mockGoogleUser),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Google login successful!');
        router.push('/customer/dashboard');
      } else {
        setError(data.error || 'Google login failed');
      }
    } catch (error) {
      setError('Google login failed. Please try again.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Bird className="h-12 w-12 text-green-600" />
          </div>
          <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
          <CardDescription>Sign in to your PoultryMarket account</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Google Login Button */}
          <GoogleSignIn
            onSuccess={(user) => {
              console.log('Google sign-in successful:', user)
            }}
            onError={(error) => {
              setError(error)
            }}
          />

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-muted-foreground">Or continue with email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Enter your email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter your password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="text-right">
              <Link href="/auth/forgot-password" className="text-sm text-green-600 hover:underline">
                Forgot password?
              </Link>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <p className="text-gray-600">
              Don&apos;t have an account?{' '}
              <Link href="/auth/register" className="text-green-600 hover:underline font-medium">
                Sign up
              </Link>
            </p>
          </div>

          {/* <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium text-gray-700 mb-2">Demo Accounts:</p>
            <div className="space-y-1 text-xs text-gray-600">
              <p><strong>Admin:</strong> admin@poultry.com / password123</p>
              <p><strong>Company:</strong> company@poultry.com / password123</p>
              <p><strong>Seller:</strong> seller@poultry.com / password123</p>
              <p><strong>Customer:</strong> customer@poultry.com / password123</p>
            </div>
          </div> */}
        </CardContent>
      </Card>
    </div>
  );
}