'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Wallet, 
  Gift, 
  TrendingUp, 
  Shield, 
  CheckCircle, 
  Phone,
  ArrowRight,
  Loader2,
  Heart,
  DollarSign,
  Users
} from 'lucide-react';

export default function AuthorSupportSetupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [mpesaNumber, setMpesaNumber] = useState('');
  const [step, setStep] = useState(1);

  const handleSetupWallet = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/author/wallet/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mpesaNumber: mpesaNumber || undefined }),
      });

      const data = await response.json();

      // Handle wallet already exists (409 Conflict)
      if (response.status === 409 && data.alreadyExists) {
        toast({
          title: '💼 Wallet Already Exists',
          description: 'You already have a support wallet set up. Redirecting to your dashboard...',
        });
        
        // Redirect to dashboard after a short delay
        setTimeout(() => {
          router.push('/author/support/dashboard');
        }, 1500);
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create wallet');
      }

      toast({
        title: '🎉 Wallet Created!',
        description: 'Your support wallet is now active. Readers can start supporting you!',
      });

      router.push('/author/support/dashboard');

    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create wallet',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const benefits = [
    {
      icon: Gift,
      title: 'Receive Support',
      description: 'Let your readers show appreciation with tips starting from KES 10',
    },
    {
      icon: DollarSign,
      title: 'Instant M-Pesa Withdrawals',
      description: 'Withdraw your earnings directly to M-Pesa anytime (min KES 200)',
    },
    {
      icon: TrendingUp,
      title: 'Track Everything',
      description: 'See who supported you, messages they left, and your earnings analytics',
    },
    {
      icon: Shield,
      title: 'Secure & Transparent',
      description: 'Powered by IntaSend with 5% platform fee only on successful payments',
    },
  ];

  return (
    <div className="py-6">
      <div className="px-4 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 mb-4">
              <Wallet className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-3">
              Enable Reader Support
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Let your readers support your work with tips. Set up takes less than a minute.
            </p>
          </div>

          {step === 1 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {/* Benefits */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                {benefits.map((benefit, index) => (
                  <motion.div
                    key={benefit.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * index }}
                  >
                    <Card className="h-full border-emerald-100 dark:border-gray-700 hover:shadow-lg transition-shadow">
                      <CardContent className="p-5">
                        <div className="flex items-start gap-4">
                          <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                            <benefit.icon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                              {benefit.title}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {benefit.description}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>

              {/* How it works */}
              <Card className="mb-8 border-blue-100 dark:border-gray-700">
                <CardHeader>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Heart className="h-5 w-5 text-red-500" />
                    How Reader Support Works
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col sm:flex-row gap-4 sm:gap-8">
                    <div className="flex-1 text-center p-4">
                      <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-3">
                        <span className="text-blue-600 dark:text-blue-400 font-bold">1</span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        A &ldquo;Support&rdquo; button appears on all your blog posts
                      </p>
                    </div>
                    <div className="flex-1 text-center p-4">
                      <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-3">
                        <span className="text-blue-600 dark:text-blue-400 font-bold">2</span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Readers can send KES 10, 20, 30, 50, 100+ via M-Pesa or Card
                      </p>
                    </div>
                    <div className="flex-1 text-center p-4">
                      <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-3">
                        <span className="text-blue-600 dark:text-blue-400 font-bold">3</span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Funds go to your wallet, withdraw to M-Pesa anytime
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Pricing info */}
              <Card className="mb-8 bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-900/20 dark:to-blue-900/20 border-0">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                        Simple, Transparent Pricing
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Only 5% platform fee on successful payments. No setup fees, no monthly charges.
                      </p>
                    </div>
                    <Badge variant="outline" className="text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700 px-4 py-2">
                      5% Fee
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <div className="text-center">
                <Button
                  size="lg"
                  onClick={() => setStep(2)}
                  className="bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white px-8"
                >
                  Get Started
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="max-w-lg mx-auto">
                <CardHeader>
                  <CardTitle>Set Up Your Wallet</CardTitle>
                  <CardDescription>
                    We&apos;ll create a secure wallet where your support earnings will be stored.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="mpesa" className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      M-Pesa Number for Withdrawals (Optional)
                    </Label>
                    <Input
                      id="mpesa"
                      type="tel"
                      placeholder="e.g. 0712345678"
                      value={mpesaNumber}
                      onChange={(e) => setMpesaNumber(e.target.value)}
                      className="text-lg"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      You can add or change this later in your dashboard
                    </p>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-emerald-500" />
                      What happens next
                    </h4>
                    <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        We create your secure IntaSend wallet
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        &ldquo;Support&rdquo; buttons appear on your posts
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Start receiving support from readers!
                      </li>
                    </ul>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setStep(1)}
                      className="flex-1"
                    >
                      Back
                    </Button>
                    <Button
                      onClick={handleSetupWallet}
                      disabled={isLoading}
                      className="flex-1 bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Wallet className="mr-2 h-4 w-4" />
                          Create Wallet
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
