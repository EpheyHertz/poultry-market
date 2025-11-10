'use client';

import { Suspense, useMemo, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import GoogleSignIn from '@/components/auth/google-signin';
import Link from 'next/link';
import { ArrowLeft, Eye, EyeOff, Zap, Shield, LogIn } from 'lucide-react';
import { toast } from 'sonner';
import { sanitizeNextRedirect } from '@/lib/utils';

function LoginPageContent() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawNext = searchParams?.get('next');
  const nextPath = useMemo(() => sanitizeNextRedirect(rawNext), [rawNext]);
  const registerHref = nextPath ? `/auth/register?next=${encodeURIComponent(nextPath)}` : '/auth/register';
  const forgotPasswordHref = nextPath ? `/auth/forgot-password?next=${encodeURIComponent(nextPath)}` : '/auth/forgot-password';

  const redirectToRoleDashboard = (role?: string | null) => {
    switch (role) {
      case 'ADMIN':
        router.push('/admin/dashboard');
        return;
      case 'SELLER':
        router.push('/seller/dashboard');
        return;
      case 'COMPANY':
        router.push('/company/dashboard');
        return;
      case 'STAKEHOLDER':
        router.push('/stakeholder/dashboard');
        return;
      case 'DELIVERY_AGENT':
        router.push('/delivery-agent/dashboard');
        return;
      default:
        router.push('/customer/dashboard');
    }
  };

  const redirectAfterLogin = (role?: string | null) => {
    if (nextPath) {
      router.push(nextPath);
      return;
    }

    redirectToRoleDashboard(role);
  };

  useEffect(() => {
    setIsVisible(true);
  }, []);

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
        redirectAfterLogin(data?.user?.role);
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (error) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async (user) => {
    setIsGoogleLoading(true);
    setError('');

    try {
      const googleUser={
        googleId:'google_' + Date.now(),
        email: user.email,
        name: user.name,
        avatar: user.avatar || 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=100'
      }

      const response = await fetch('/api/auth/google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(googleUser),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Google login successful!');
        redirectAfterLogin(data?.user?.role ?? 'CUSTOMER');
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
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-yellow-50 to-orange-50 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 right-20 w-32 h-32 bg-gradient-to-r from-green-400 to-yellow-400 rounded-full opacity-10 animate-bounce"></div>
        <div className="absolute bottom-20 left-20 w-24 h-24 bg-gradient-to-r from-orange-400 to-red-400 rounded-full opacity-10 animate-bounce delay-300"></div>
        <div className="absolute top-1/2 left-10 w-16 h-16 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full opacity-10 animate-pulse"></div>
        <div className="absolute top-10 left-1/2 w-20 h-20 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full opacity-10 animate-pulse delay-500"></div>
      </div>

      {/* Back to home button */}
      <div className="absolute top-6 left-6 z-10">
        <Link href="/">
          <Button variant="ghost" className="text-gray-600 hover:text-green-600 hover:bg-white/50 transition-all duration-300">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </Link>
      </div>

      <div className="min-h-screen flex items-center justify-center p-4 relative">
        <div className="grid lg:grid-cols-2 gap-12 max-w-6xl w-full items-center">
          
          {/* Left side - Welcome content */}
          <div className={`hidden lg:block space-y-8 transition-all duration-1000 ${isVisible ? 'translate-x-0 opacity-100' : '-translate-x-20 opacity-0'}`}>
            <div className="space-y-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-yellow-500 rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold text-2xl">🐔</span>
                </div>
                <span className="text-3xl font-bold bg-gradient-to-r from-green-600 to-yellow-600 bg-clip-text text-transparent">
                  PoultryMarket
                </span>
              </div>
              
              <h1 className="text-4xl lg:text-5xl font-bold text-gray-800 leading-tight">
                Welcome Back to
                <span className="bg-gradient-to-r from-green-600 to-yellow-600 bg-clip-text text-transparent"> Your Marketplace</span>
              </h1>
              
              <p className="text-xl text-gray-600 leading-relaxed">
                Continue your journey with fresh poultry products, trusted suppliers, and seamless delivery experience.
              </p>
            </div>

            <div className="space-y-4">
              {[
                { icon: Shield, text: "Secure and trusted platform" },
                { icon: Zap, text: "Fast and reliable service" },
                { icon: LogIn, text: "Quick access to your dashboard" }
              ].map((feature, index) => (
                <div key={index} className={`flex items-center space-x-3 transition-all duration-700 delay-${index * 200} ${isVisible ? 'translate-x-0 opacity-100' : '-translate-x-10 opacity-0'}`}>
                  <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-yellow-500 rounded-lg flex items-center justify-center">
                    <feature.icon className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-gray-700 font-medium">{feature.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right side - Login form */}
          <div className={`w-full max-w-md mx-auto transition-all duration-1000 delay-300 ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-20 opacity-0'}`}>
            <Card className="bg-white/80 backdrop-blur-lg shadow-2xl border-0 hover:shadow-3xl transition-all duration-500">
              <CardHeader className="text-center space-y-4 pb-8">
                <div className="flex justify-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-yellow-500 rounded-2xl flex items-center justify-center animate-pulse">
                    <LogIn className="h-8 w-8 text-white" />
                  </div>
                </div>
                <CardTitle className="text-3xl font-bold bg-gradient-to-r from-green-600 to-yellow-600 bg-clip-text text-transparent">
                  Welcome Back
                </CardTitle>
                <CardDescription className="text-gray-600 text-lg">
                  Sign in to access your account
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6">
                {/* Google Login Button */}
                <GoogleSignIn
                  onSuccess={(user) => handleGoogleLogin(user)}
                  onError={(error) => setError(error)}
                />

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <Separator className="w-full" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-4 text-gray-500 font-medium">Or continue with email</span>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {error && (
                    <Alert variant="destructive" className="animate-shake">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-gray-700 font-medium">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="Enter your email"
                      className="h-12 border-2 border-gray-200 focus:border-green-500 transition-colors duration-300"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-gray-700 font-medium">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        placeholder="Enter your password"
                        className="h-12 border-2 border-gray-200 focus:border-green-500 transition-colors duration-300 pr-12"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-gray-100 transition-colors duration-300"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-gray-500" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-500" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="text-right">
                    <Link href={forgotPasswordHref} className="text-green-600 hover:text-green-700 font-medium transition-colors duration-300 hover:underline">
                      Forgot password?
                    </Link>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full h-12 bg-gradient-to-r from-green-500 to-yellow-500 hover:from-green-600 hover:to-yellow-600 text-white font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300" 
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Signing in...</span>
                      </div>
                    ) : (
                      <>
                        <LogIn className="mr-2 h-5 w-5" />
                        Sign In
                      </>
                    )}
                  </Button>
                </form>

                <div className="text-center">
                  <p className="text-gray-600">
                    Don&apos;t have an account?{' '}
                    <Link href={registerHref} className="text-green-600 hover:text-green-700 font-semibold transition-colors duration-300 hover:underline">
                      Sign up here
                    </Link>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-yellow-50 to-orange-50">
          <div className="text-center space-y-3">
            <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-sm text-gray-600">Loading sign-in experience…</p>
          </div>
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}