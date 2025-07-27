'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Lock, Eye, EyeOff, CheckCircle, XCircle, Shield, Key } from 'lucide-react';
import { toast } from 'sonner';
import { Suspense } from 'react';

function ResetPasswordContent() {
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [isSuccess, setIsSuccess] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams?.get('token');

  useEffect(() => {
    setIsVisible(true);
    if (!token) {
      toast.error('Invalid reset link');
      router.push('/auth/forgot-password');
    }
  }, [token, router]);

  useEffect(() => {
    // Calculate password strength
    const calculateStrength = (password: string) => {
      let strength = 0;
      if (password.length >= 8) strength++;
      if (/[A-Z]/.test(password)) strength++;
      if (/[a-z]/.test(password)) strength++;
      if (/[0-9]/.test(password)) strength++;
      if (/[^A-Za-z0-9]/.test(password)) strength++;
      return strength;
    };

    setPasswordStrength(calculateStrength(formData.password));
  }, [formData.password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (passwordStrength < 3) {
      toast.error('Password is too weak. Please choose a stronger password.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setIsSuccess(true);
        toast.success('Password reset successfully!');
        setTimeout(() => {
          router.push('/auth/login');
        }, 3000);
      } else {
        toast.error(data.error || 'Failed to reset password');
      }
    } catch (error) {
      toast.error('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const getStrengthColor = () => {
    if (passwordStrength <= 1) return 'bg-red-500';
    if (passwordStrength <= 2) return 'bg-orange-500';
    if (passwordStrength <= 3) return 'bg-yellow-500';
    if (passwordStrength <= 4) return 'bg-green-500';
    return 'bg-emerald-500';
  };

  const getStrengthText = () => {
    if (passwordStrength <= 1) return 'Very Weak';
    if (passwordStrength <= 2) return 'Weak';
    if (passwordStrength <= 3) return 'Fair';
    if (passwordStrength <= 4) return 'Good';
    return 'Strong';
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-yellow-50 to-orange-50 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0">
          <div className="absolute top-20 right-20 w-32 h-32 bg-gradient-to-r from-green-400 to-yellow-400 rounded-full opacity-10 animate-bounce"></div>
          <div className="absolute bottom-20 left-20 w-24 h-24 bg-gradient-to-r from-orange-400 to-red-400 rounded-full opacity-10 animate-bounce delay-300"></div>
          <div className="absolute top-1/2 left-10 w-16 h-16 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full opacity-10 animate-pulse"></div>
        </div>

        <div className="min-h-screen flex items-center justify-center p-4 relative">
          <Card className="w-full max-w-md bg-white/80 backdrop-blur-lg shadow-2xl border-0 animate-fade-in">
            <CardContent className="text-center p-8 space-y-6">
              <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto animate-bounce">
                <CheckCircle className="h-12 w-12 text-white" />
              </div>
              <div className="space-y-3">
                <h2 className="text-2xl font-bold text-green-600">Password Reset Successful!</h2>
                <p className="text-gray-600">
                  Your password has been updated successfully. You will be redirected to login shortly.
                </p>
              </div>
              <Link href="/auth/login">
                <Button className="w-full h-12 bg-gradient-to-r from-green-500 to-yellow-500 hover:from-green-600 hover:to-yellow-600 text-white font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300">
                  Continue to Login
                </Button>
              </Link>
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

      {/* Back to login button */}
      <div className="absolute top-6 left-6 z-10">
        <Link href="/auth/login">
          <Button variant="ghost" className="text-gray-600 hover:text-green-600 hover:bg-white/50 transition-all duration-300">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Login
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
                Create a new secure password for your account. Make sure it&apos;s strong and unique to keep your poultry business safe.
              </p>
            </div>

            <div className="space-y-4">
              {[
                { icon: Shield, text: "Secure password protection" },
                { icon: Key, text: "Encrypted storage" },
                { icon: Lock, text: "Account security verified" }
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

          {/* Right side - Reset form */}
          <div className={`w-full max-w-md mx-auto transition-all duration-1000 delay-300 ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-20 opacity-0'}`}>
            <Card className="bg-white/80 backdrop-blur-lg shadow-2xl border-0 hover:shadow-3xl transition-all duration-500">
              <CardHeader className="space-y-4 pb-8">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-yellow-500 rounded-xl flex items-center justify-center">
                    <Lock className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl font-bold bg-gradient-to-r from-green-600 to-yellow-600 bg-clip-text text-transparent">
                      Reset Password
                    </CardTitle>
                    <CardDescription className="text-gray-600">
                      Enter your new password below
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-gray-700 font-medium">New Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={handleInputChange}
                        required
                        placeholder="Enter your new password"
                        className="h-12 pr-12 border-2 border-gray-200 focus:border-green-500 transition-colors duration-300"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    
                    {/* Password Strength Indicator */}
                    {formData.password && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Password Strength:</span>
                          <span className={`font-medium ${passwordStrength >= 3 ? 'text-green-600' : 'text-orange-600'}`}>
                            {getStrengthText()}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all duration-300 ${getStrengthColor()}`}
                            style={{ width: `${(passwordStrength / 5) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-gray-700 font-medium">Confirm New Password</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        required
                        placeholder="Confirm your new password"
                        className="h-12 pr-12 border-2 border-gray-200 focus:border-green-500 transition-colors duration-300"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                      >
                        {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                      <p className="text-red-500 text-sm">Passwords do not match</p>
                    )}
                  </div>

                  {/* Password Requirements */}
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200">
                    <p className="text-sm font-medium text-gray-700 mb-2">Password must contain:</p>
                    <div className="space-y-1">
                      {[
                        { check: formData.password.length >= 8, text: "At least 8 characters" },
                        { check: /[A-Z]/.test(formData.password), text: "One uppercase letter" },
                        { check: /[a-z]/.test(formData.password), text: "One lowercase letter" },
                        { check: /[0-9]/.test(formData.password), text: "One number" },
                      ].map((req, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          {req.check ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-gray-300" />
                          )}
                          <span className={`text-sm ${req.check ? 'text-green-700' : 'text-gray-500'}`}>
                            {req.text}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    disabled={isLoading || formData.password !== formData.confirmPassword || passwordStrength < 3}
                    className="w-full h-12 bg-gradient-to-r from-green-500 to-yellow-500 hover:from-green-600 hover:to-yellow-600 text-white font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {isLoading ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Updating Password...</span>
                      </div>
                    ) : (
                      'Update Password'
                    )}
                  </Button>
                </form>

                <div className="mt-6 text-center">
                  <p className="text-sm text-gray-600">
                    Remember your password?{' '}
                    <Link href="/auth/login" className="text-green-600 hover:text-green-700 font-medium transition-colors">
                      Sign in instead
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-yellow-50 to-orange-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-white/80 backdrop-blur-lg shadow-2xl border-0">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-yellow-500 rounded-2xl flex items-center justify-center animate-pulse">
                <Lock className="h-8 w-8 text-white" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-green-600 to-yellow-600 bg-clip-text text-transparent">
              Reset Password
            </CardTitle>
            <CardDescription className="text-gray-600 text-lg">Loading...</CardDescription>
          </CardHeader>
        </Card>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
