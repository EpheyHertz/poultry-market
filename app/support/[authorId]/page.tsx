'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Heart, 
  Coffee,
  Star,
  Gift,
  Loader2,
  Phone,
  Mail,
  User,
  MessageSquare,
  CheckCircle,
  AlertCircle,
  CreditCard,
  Smartphone,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { formatCurrency } from '@/lib/formatCurrency';

interface AuthorInfo {
  authorName: string;
  authorBio?: string;
  authorImage?: string;
  recentSupporters: number;
  totalSupport?: string;
}

const PRESET_AMOUNTS = [10, 20, 30, 50, 100, 200, 500, 1000];

const AMOUNT_ICONS: Record<number, React.ReactNode> = {
  10: <Coffee className="h-4 w-4" />,
  20: <Coffee className="h-4 w-4" />,
  30: <Coffee className="h-4 w-4" />,
  50: <Star className="h-4 w-4" />,
  100: <Star className="h-4 w-4" />,
  200: <Heart className="h-4 w-4" />,
  500: <Gift className="h-4 w-4" />,
  1000: <Sparkles className="h-4 w-4" />,
};

export default function SupportAuthorPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const authorId = params?.authorId as string;

  const [isLoading, setIsLoading] = useState(true);
  const [authorInfo, setAuthorInfo] = useState<AuthorInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [selectedAmount, setSelectedAmount] = useState<number | null>(50);
  const [customAmount, setCustomAmount] = useState('');
  const [supporterName, setSupporterName] = useState('');
  const [supporterEmail, setSupporterEmail] = useState('');
  const [supporterPhone, setSupporterPhone] = useState('');
  const [message, setMessage] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'MPESA_STK' | 'CARD_CHECKOUT'>('MPESA_STK');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'pending' | 'success' | 'failed'>('idle');

  const fetchAuthorInfo = useCallback(async () => {
    try {
      const response = await fetch(`/api/support/${authorId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('Author not found or has not enabled support');
        } else {
          throw new Error('Failed to load author info');
        }
        return;
      }

      const data = await response.json();
      setAuthorInfo(data);
    } catch (err) {
      setError('Failed to load author information');
    } finally {
      setIsLoading(false);
    }
  }, [authorId]);

  useEffect(() => {
    fetchAuthorInfo();
  }, [fetchAuthorInfo]);

  // Poll for payment status
  useEffect(() => {
    if (!transactionId || paymentStatus !== 'pending') return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/support/webhook?transactionId=${transactionId}`);
        const data = await response.json();

        if (data.status === 'COMPLETED') {
          setPaymentStatus('success');
          clearInterval(pollInterval);
        } else if (data.status === 'FAILED' || data.status === 'CANCELLED') {
          setPaymentStatus('failed');
          clearInterval(pollInterval);
        }
      } catch (err) {
        console.error('Error polling status:', err);
      }
    }, 3000);

    // Stop polling after 2 minutes
    const timeout = setTimeout(() => {
      clearInterval(pollInterval);
      if (paymentStatus === 'pending') {
        setPaymentStatus('failed');
      }
    }, 120000);

    return () => {
      clearInterval(pollInterval);
      clearTimeout(timeout);
    };
  }, [transactionId, paymentStatus]);

  const getFinalAmount = () => {
    if (customAmount) {
      return parseFloat(customAmount) || 0;
    }
    return selectedAmount || 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const amount = getFinalAmount();
    if (amount < 10) {
      toast({
        title: 'Error',
        description: 'Minimum support amount is KES 10',
        variant: 'destructive',
      });
      return;
    }

    if (paymentMethod === 'MPESA_STK' && !supporterPhone) {
      toast({
        title: 'Error',
        description: 'Phone number is required for M-Pesa payment',
        variant: 'destructive',
      });
      return;
    }

    if (paymentMethod === 'CARD_CHECKOUT' && !supporterEmail) {
      toast({
        title: 'Error',
        description: 'Email is required for card payment',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/support/${authorId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          name: supporterName || undefined,
          email: supporterEmail || undefined,
          phoneNumber: supporterPhone || undefined,
          message: message || undefined,
          paymentMethod,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initiate payment');
      }

      setTransactionId(data.transactionId);

      if (paymentMethod === 'MPESA_STK') {
        setPaymentStatus('pending');
        toast({
          title: 'Check Your Phone',
          description: 'An M-Pesa prompt has been sent to your phone. Please enter your PIN to complete.',
        });
      } else if (data.checkoutUrl) {
        // Redirect to card checkout
        window.location.href = data.checkoutUrl;
      }

    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to process payment',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setPaymentStatus('idle');
    setTransactionId(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
      </div>
    );
  }

  if (error || !authorInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Author Not Found</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {error || 'This author has not enabled reader support yet.'}
            </p>
            <Button onClick={() => router.push('/')}>
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  if (paymentStatus === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        >
          <Card className="max-w-md w-full text-center">
            <CardContent className="p-8">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-500 flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="h-10 w-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Thank You! 🎉
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Your support of <span className="font-semibold text-emerald-600">{formatCurrency(getFinalAmount())}</span> has been sent to {authorInfo.authorName}!
              </p>
              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={() => router.push('/')}>
                  Go Home
                </Button>
                <Button onClick={handleReset}>
                  Support Again
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // Pending state (M-Pesa STK Push)
  if (paymentStatus === 'pending') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="p-8">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-green-500 flex items-center justify-center mx-auto mb-6 animate-pulse">
              <Smartphone className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Check Your Phone
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              An M-Pesa prompt has been sent to <span className="font-semibold">{supporterPhone}</span>
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mb-6">
              Enter your M-Pesa PIN to complete the payment of {formatCurrency(getFinalAmount())}
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Waiting for confirmation...
            </div>
            <Button variant="ghost" onClick={handleReset} className="mt-6">
              Cancel
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Failed state
  if (paymentStatus === 'failed') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="p-8">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-red-400 to-red-500 flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Payment Failed
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              The payment could not be completed. Please try again.
            </p>
            <Button onClick={handleReset} className="bg-gradient-to-r from-pink-500 to-purple-500">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-8 sm:py-12 max-w-lg">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Author Header */}
          <div className="text-center mb-8">
            <div className="relative inline-block mb-4">
              {authorInfo.authorImage ? (
                <Image
                  src={authorInfo.authorImage}
                  alt={authorInfo.authorName}
                  width={96}
                  height={96}
                  className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center border-4 border-white shadow-lg">
                  <span className="text-3xl font-bold text-white">
                    {authorInfo.authorName[0].toUpperCase()}
                  </span>
                </div>
              )}
              <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-pink-500 flex items-center justify-center">
                <Heart className="h-4 w-4 text-white" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Support {authorInfo.authorName}
            </h1>
            {authorInfo.authorBio && (
              <p className="text-gray-600 dark:text-gray-400 mt-2 max-w-sm mx-auto">
                {authorInfo.authorBio}
              </p>
            )}
            {authorInfo.recentSupporters > 0 && (
              <Badge variant="secondary" className="mt-3">
                {authorInfo.recentSupporters} supporters this month
              </Badge>
            )}
          </div>

          {/* Support Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-pink-500" />
                Choose an amount
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Amount Selection */}
                <div className="grid grid-cols-4 gap-2">
                  {PRESET_AMOUNTS.map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => {
                        setSelectedAmount(amount);
                        setCustomAmount('');
                      }}
                      className={`p-3 rounded-lg border-2 transition-all flex flex-col items-center gap-1
                        ${selectedAmount === amount && !customAmount
                          ? 'border-pink-500 bg-pink-50 dark:bg-pink-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-pink-300'
                        }`}
                    >
                      {AMOUNT_ICONS[amount]}
                      <span className="text-sm font-semibold">{amount}</span>
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white dark:bg-gray-800 px-2 text-gray-500">or</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customAmount">Custom Amount (KES)</Label>
                  <Input
                    id="customAmount"
                    type="number"
                    min="10"
                    placeholder="Enter custom amount"
                    value={customAmount}
                    onChange={(e) => {
                      setCustomAmount(e.target.value);
                      setSelectedAmount(null);
                    }}
                  />
                </div>

                {/* Payment Method */}
                <div className="space-y-3">
                  <Label>Payment Method</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('MPESA_STK')}
                      className={`p-4 rounded-lg border-2 transition-all flex items-center gap-3
                        ${paymentMethod === 'MPESA_STK'
                          ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-green-300'
                        }`}
                    >
                      <Smartphone className="h-5 w-5 text-green-600" />
                      <span className="font-medium">M-Pesa</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('CARD_CHECKOUT')}
                      className={`p-4 rounded-lg border-2 transition-all flex items-center gap-3
                        ${paymentMethod === 'CARD_CHECKOUT'
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
                        }`}
                    >
                      <CreditCard className="h-5 w-5 text-blue-600" />
                      <span className="font-medium">Card</span>
                    </button>
                  </div>
                </div>

                {/* Supporter Info */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Your Name (Optional)
                    </Label>
                    <Input
                      id="name"
                      placeholder="Anonymous"
                      value={supporterName}
                      onChange={(e) => setSupporterName(e.target.value)}
                    />
                  </div>

                  {paymentMethod === 'MPESA_STK' && (
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        M-Pesa Phone Number *
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="e.g. 0712345678"
                        required
                        value={supporterPhone}
                        onChange={(e) => setSupporterPhone(e.target.value)}
                      />
                    </div>
                  )}

                  {paymentMethod === 'CARD_CHECKOUT' && (
                    <div className="space-y-2">
                      <Label htmlFor="email" className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Email Address *
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="your@email.com"
                        required
                        value={supporterEmail}
                        onChange={(e) => setSupporterEmail(e.target.value)}
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="message" className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Leave a Message (Optional)
                    </Label>
                    <Textarea
                      id="message"
                      placeholder="Say something nice..."
                      rows={3}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      maxLength={200}
                    />
                  </div>
                </div>

                {/* Summary */}
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">You&apos;re sending</span>
                    <span className="text-2xl font-bold text-pink-600 dark:text-pink-400">
                      {formatCurrency(getFinalAmount())}
                    </span>
                  </div>
                </div>

                <Button
                  type="submit"
                  size="lg"
                  disabled={isSubmitting || getFinalAmount() < 10}
                  className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Heart className="mr-2 h-5 w-5" />
                      Support with {formatCurrency(getFinalAmount())}
                    </>
                  )}
                </Button>

                <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                  Secure payment powered by IntaSend. 5% goes to platform fees.
                </p>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
