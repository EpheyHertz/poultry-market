'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Mail, Lock, Send, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setIsSubmitted(true);
        toast.success('Reset link sent to your email!');
      } else {
        setError(data.error || 'Failed to send reset email');
      }
    } catch (error) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-yellow-50 to-orange-50 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0">
          <div className="absolute top-20 right-20 w-32 h-32 bg-gradient-to-r from-green-400 to-yellow-400 rounded-full opacity-10 animate-bounce"></div>
          <div className="absolute bottom-20 left-20 w-24 h-24 bg-gradient-to-r from-orange-400 to-red-400 rounded-full opacity-10 animate-bounce delay-300"></div>
        </div>

        <div className="min-h-screen flex items-center justify-center p-4 relative">
          <Card className="w-full max-w-md bg-white/80 backdrop-blur-lg shadow-2xl border-0 animate-fade-in">
            <CardHeader className="text-center space-y-4 pb-8">
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-yellow-500 rounded-2xl flex items-center justify-center animate-pulse">
                  <CheckCircle className="h-8 w-8 text-white" />
                </div>
              </div>
              <CardTitle className="text-3xl font-bold bg-gradient-to-r from-green-600 to-yellow-600 bg-clip-text text-transparent">
                Check Your Email
              </CardTitle>
              <CardDescription className="text-gray-600 text-lg">
                We&apos;ve sent you a password reset link
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-6">
              <div className="p-6 bg-green-50 rounded-2xl border border-green-200">
                <Mail className="h-12 w-12 text-green-600 mx-auto mb-4" />
                <p className="text-gray-700 leading-relaxed">
                  If an account with <strong className="text-green-600">{email}</strong> exists, we&apos;ve sent a password reset link to that email address.
                </p>
              </div>
              
              <p className="text-sm text-gray-500 bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                ⏰ The link will expire in 1 hour for security reasons.
              </p>
              
              <div className="space-y-3">
                <Link href="/auth/login">
                  <Button className="w-full h-12 bg-gradient-to-r from-green-500 to-yellow-500 hover:from-green-600 hover:to-yellow-600 text-white font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300">
                    <ArrowLeft className="mr-2 h-5 w-5" />
                    Back to Login
                  </Button>
                </Link>
                <Button 
                  variant="ghost" 
                  className="w-full h-12 text-green-600 hover:text-green-700 hover:bg-green-50 transition-all duration-300"
                  onClick={() => {
                    setIsSubmitted(false);
                    setEmail('');
                  }}
                >
                  <Send className="mr-2 h-4 w-4" />
                  Send Another Email
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-yellow-50 to-orange-50 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 right-20 w-32 h-32 bg-gradient-to-r from-green-400 to-yellow-400 rounded-full opacity-10 animate-bounce"></div>
        <div className="absolute bottom-20 left-20 w-24 h-24 bg-gradient-to-r from-orange-400 to-red-400 rounded-full opacity-10 animate-bounce delay-300"></div>
        <div className="absolute top-1/2 left-10 w-16 h-16 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full opacity-10 animate-pulse"></div>
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
          
          {/* Left side - Information */}
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
                Reset Your
                <span className="bg-gradient-to-r from-green-600 to-yellow-600 bg-clip-text text-transparent"> Password</span>
              </h1>
              
              <p className="text-xl text-gray-600 leading-relaxed">
                Don&apos;t worry! It happens to the best of us. Enter your email address and we&apos;ll send you a secure link to reset your password.
              </p>
            </div>

            <div className="space-y-4">
              {[
                { icon: Mail, text: "Secure email verification" },
                { icon: Lock, text: "Protected password reset" },
                { icon: CheckCircle, text: "Quick and easy process" }
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

          {/* Right side - Form */}
          <div className={`w-full max-w-md mx-auto transition-all duration-1000 delay-300 ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-20 opacity-0'}`}>
            <Card className="bg-white/80 backdrop-blur-lg shadow-2xl border-0 hover:shadow-3xl transition-all duration-500">
              <CardHeader className="text-center space-y-4 pb-8">
                <div className="flex justify-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-yellow-500 rounded-2xl flex items-center justify-center animate-pulse">
                    <Lock className="h-8 w-8 text-white" />
                  </div>
                </div>
                <CardTitle className="text-3xl font-bold bg-gradient-to-r from-green-600 to-yellow-600 bg-clip-text text-transparent">
                  Forgot Password?
                </CardTitle>
                <CardDescription className="text-gray-600 text-lg">
                  Enter your email to receive a reset link
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {error && (
                    <Alert variant="destructive" className="animate-shake">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-gray-700 font-medium">Email Address</Label>
                    <div className="relative">
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        placeholder="Enter your email address"
                        className="h-12 border-2 border-gray-200 focus:border-green-500 transition-colors duration-300 pl-12"
                      />
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full h-12 bg-gradient-to-r from-green-500 to-yellow-500 hover:from-green-600 hover:to-yellow-600 text-white font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300" 
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Sending...</span>
                      </div>
                    ) : (
                      <>
                        <Send className="mr-2 h-5 w-5" />
                        Send Reset Link
                      </>
                    )}
                  </Button>
                </form>
                
                <div className="text-center">
                  <Link href="/auth/login" className="inline-flex items-center text-green-600 hover:text-green-700 font-medium transition-colors duration-300 hover:underline">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Login
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}