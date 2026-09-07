'use client';

import { useState, useEffect, useCallback } from 'react';

import { useParams, useRouter } from 'next/navigation';

import { motion } from 'framer-motion';
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
  ArrowLeft,
  Sparkles
} from 'lucide-react';
import { formatCurrency } from '@/lib/formatCurrency';
import { IntaSendPayButton } from '@/components/blog/intasend-pay-button';
import type { IntaSendPayButtonPayload } from '@/lib/intasend-checkout';

interface AuthorInfo {
  authorName: string;
  authorBio?: string;
  authorImage?: string;
  supportersCount: number;
}

/** Server-prepared intent: the pending transaction plus the pay button fields. */
interface PayButtonIntent {
  transactionId: string;
  publicApiKey: string;
  live: boolean;
  fields: IntaSendPayButtonPayload;
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * idle    -> collecting the amount and (optional) details
   * ready   -> the IntaSend Payment Button is mounted, waiting for the click
   * pending -> supporter is inside the IntaSend modal, we poll our webhook
   * success / failed -> outcome
   */
  const [paymentStatus, setPaymentStatus] =
    useState<'idle' | 'ready' | 'pending' | 'success' | 'failed'>('idle');
  const [intent, setIntent] = useState<PayButtonIntent | null>(null);
  const [sdkBlocked, setSdkBlocked] = useState(false);

  // Error state for better error display
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentErrorAction, setPaymentErrorAction] = useState<string | null>(null);
  const [canRetry, setCanRetry] = useState(true);



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

      // The API returns a nested payload. Flatten it into the shape this page renders.
      const author = data?.author ?? {};
      const displayName: string =
        (typeof author.displayName === 'string' && author.displayName.trim()) ||
        (typeof author.username === 'string' && author.username.trim()) ||
        'this author';

      if (data?.supportEnabled !== true) {
        setError(
          typeof data?.message === 'string' && data.message
            ? data.message
            : `${displayName} has not set up reader support yet.`
        );
        return;
      }

      setAuthorInfo({
        authorName: displayName,
        authorBio: author.tagline || author.bio || undefined,
        authorImage: author.avatarUrl || undefined,
        supportersCount:
          typeof data?.stats?.supportersCount === 'number' ? data.stats.supportersCount : 0,
      });
    } catch (err) {
      setError('Failed to load author information');
    } finally {
      setIsLoading(false);
    }
  }, [authorId]);


  useEffect(() => {
    fetchAuthorInfo();
  }, [fetchAuthorInfo]);

  // Poll our webhook status endpoint while the supporter is inside the IntaSend
  // modal. The signed webhook - not the SDK event - is what confirms a payment.
  useEffect(() => {
    const transactionId = intent?.transactionId;
    if (!transactionId || paymentStatus !== 'pending') return;

    const pollInterval = setInterval(async () => {

      try {
        const response = await fetch(`/api/support/webhook?tx=${transactionId}`);
        const data = await response.json();

        if (data.status === 'COMPLETED') {
          setPaymentStatus('success');
          setPaymentError(null);
          setPaymentErrorAction(null);
          clearInterval(pollInterval);
        } else if (data.status === 'FAILED' || data.status === 'CANCELLED') {
          setPaymentStatus('failed');
          // Capture user-friendly error details from API
          setPaymentError(data.failedReason || 'Payment could not be completed.');
          setPaymentErrorAction(data.actionRequired || 'Please try again.');
          setCanRetry(data.canRetry !== false);
          clearInterval(pollInterval);
        }
      } catch (err) {
        console.error('Error polling status:', err);
      }
    }, 3000);

    // Stop polling after 2 minutes - likely user didn't complete
    const timeout = setTimeout(() => {
      clearInterval(pollInterval);
      if (paymentStatus === 'pending') {
        setPaymentStatus('failed');
        setPaymentError('Payment request timed out.');
        setPaymentErrorAction('The payment was not completed in time. Please try again.');
        setCanRetry(true);
      }
    }, 120000);

    return () => {
      clearInterval(pollInterval);
      clearTimeout(timeout);
    };
  }, [intent?.transactionId, paymentStatus]);

  const getFinalAmount = () => {
    if (customAmount) {
      return parseFloat(customAmount) || 0;
    }
    return selectedAmount || 0;
  };

  const buildRequestBody = (extra?: Record<string, unknown>) => ({
    amount: getFinalAmount(),
    name: supporterName || undefined,
    email: supporterEmail || undefined,
    phoneNumber: supporterPhone || undefined,
    message: message || undefined,
    ...extra,
  });

  /**
   * Step 1: the server records a PENDING transaction (amount, 5% platform fee,
   * destination wallet) and returns the fields for the IntaSend Payment Button.
   * Nothing is charged until the supporter clicks that button.
   */
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

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/support/${authorId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildRequestBody()),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initiate payment');
      }

      if (!data.payButton?.publicApiKey || !data.transactionId) {
        throw new Error('Payment could not be prepared. Please try again.');
      }

      setIntent({
        transactionId: data.transactionId,
        publicApiKey: data.payButton.publicApiKey,
        live: data.payButton.live === true,
        fields: data.payButton.fields || {},
      });
      setPaymentStatus('ready');
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

  /**
   * Only used when the InlineJS bundle cannot load (blocked CDN, extension...).
   * The server then creates a hosted checkout and we hand the browser over.
   */
  const useHostedCheckout = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/support/${authorId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildRequestBody({ hostedFallback: true })),
      });
      const data = await response.json();
      if (!response.ok || !data.checkoutUrl) {
        throw new Error(data.error || 'Unable to open the payment page.');
      }
      window.location.href = data.checkoutUrl;
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Unable to open the payment page.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setPaymentStatus('idle');
    setIntent(null);
    setSdkBlocked(false);
    setPaymentError(null);
    setPaymentErrorAction(null);
    setCanRetry(true);
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

  // Ready state - the documented IntaSend Payment Button is mounted here.
  // Its data-* attributes come from the server-created pending transaction.
  if (paymentStatus === 'ready' && intent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Heart className="h-5 w-5 text-pink-500" />
              Confirm your support
            </CardTitle>
            <CardDescription>
              {formatCurrency(getFinalAmount())} to {authorInfo.authorName}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center gap-3 mb-1">
                <Smartphone className="h-5 w-5 text-green-600" />
                <CreditCard className="h-5 w-5 text-blue-600" />
                <span className="font-medium">M-Pesa, Card or Bank</span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Pick your preferred method in the secure IntaSend window.
              </p>
            </div>

            {/* The documented IntaSend Payment Button: data-* fields + InlineJS */}
            <IntaSendPayButton
              publicApiKey={intent.publicApiKey}
              live={intent.live}
              payload={intent.fields}
              className="w-full inline-flex items-center justify-center rounded-md px-4 py-3 text-sm font-medium text-white bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 disabled:opacity-60 disabled:cursor-not-allowed"
              onOpen={() => setPaymentStatus('pending')}
              onInProgress={() => setPaymentStatus('pending')}
              onComplete={() => setPaymentStatus('success')}
              onFailed={() => {
                setPaymentStatus('failed');
                setPaymentError('The payment was not completed.');
                setPaymentErrorAction('You can try again with a different method.');
                setCanRetry(true);
              }}
              onSdkError={() => setSdkBlocked(true)}
            >
              <Heart className="mr-2 h-4 w-4" />
              Pay {formatCurrency(getFinalAmount())} with IntaSend
            </IntaSendPayButton>

            {sdkBlocked && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 p-3 text-xs text-amber-800 dark:text-amber-200">
                <p className="mb-2">
                  The IntaSend payment window could not load in this browser.
                </p>
                <Button size="sm" variant="outline" onClick={useHostedCheckout} disabled={isSubmitting}>
                  {isSubmitting ? 'Opening...' : 'Open the payment page instead'}
                </Button>
              </div>
            )}

            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-pink-500 transition-colors"
            >
              <ArrowLeft className="h-3 w-3" /> Change amount
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Pending state - supporter is inside the IntaSend inline checkout window
  if (paymentStatus === 'pending') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="p-8">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-green-500 flex items-center justify-center mx-auto mb-6 animate-pulse">
              <CreditCard className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Complete Your Payment
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Finish the payment in the secure IntaSend window
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mb-6">
              We&apos;ll confirm your {formatCurrency(getFinalAmount())} support automatically once it goes through
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

  // Failed state with detailed error message
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
            <p className="text-gray-600 dark:text-gray-400 mb-2">
              {paymentError || 'The payment could not be completed.'}
            </p>
            {paymentErrorAction && (
              <p className="text-sm text-gray-500 dark:text-gray-500 mb-6">
                {paymentErrorAction}
              </p>
            )}
            <div className="flex gap-3 justify-center">
              {canRetry && (
                <Button onClick={handleReset} className="bg-gradient-to-r from-pink-500 to-purple-500">
                  Try Again
                </Button>
              )}
              <Button variant="outline" onClick={() => router.back()}>
                Go Back
              </Button>
            </div>
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
                    {(authorInfo.authorName.charAt(0) || 'A').toUpperCase()}
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
            {authorInfo.supportersCount > 0 && (
              <Badge variant="secondary" className="mt-3">
                {authorInfo.supportersCount} {authorInfo.supportersCount === 1 ? 'supporter' : 'supporters'} so far
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

                {/* One inline checkout, every method IntaSend supports */}
                <div className="space-y-3">
                  <Label>Payment Method</Label>
                  <div className="rounded-lg border-2 border-gray-200 dark:border-gray-700 p-4">
                    <div className="flex items-center gap-3 mb-1">
                      <Smartphone className="h-5 w-5 text-green-600" />
                      <CreditCard className="h-5 w-5 text-blue-600" />
                      <span className="font-medium">M-Pesa, Card or Bank</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Choose your preferred method inside the secure IntaSend window.
                    </p>
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

                  <div className="space-y-2">
                    <Label htmlFor="phone" className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      Phone Number (Optional)
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="e.g. 0712345678"
                      value={supporterPhone}
                      onChange={(e) => setSupporterPhone(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email Address (Optional)
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="your@email.com"
                      value={supporterEmail}
                      onChange={(e) => setSupporterEmail(e.target.value)}
                    />
                  </div>

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
