'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { formatCurrency } from '@/lib/formatCurrency';

interface SupportButtonProps {
  authorId: string;
  authorName: string;
  blogPostId?: string;
  blogPostTitle?: string;
  variant?: 'default' | 'compact' | 'icon-only';
  className?: string;
}

const PRESET_AMOUNTS = [10, 20, 30, 50, 100, 200, 500, 1000];

const AMOUNT_ICONS: Record<number, React.ReactNode> = {
  10: <Coffee className="h-3 w-3" />,
  20: <Coffee className="h-3 w-3" />,
  30: <Coffee className="h-3 w-3" />,
  50: <Star className="h-3 w-3" />,
  100: <Star className="h-3 w-3" />,
  200: <Heart className="h-3 w-3" />,
  500: <Gift className="h-3 w-3" />,
  1000: <Sparkles className="h-3 w-3" />,
};

export function SupportButton({
  authorId,
  authorName,
  blogPostId,
  blogPostTitle,
  variant = 'default',
  className = '',
}: SupportButtonProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasWallet, setHasWallet] = useState<boolean | null>(null);

  // Form state
  const [selectedAmount, setSelectedAmount] = useState<number | null>(50);
  const [customAmount, setCustomAmount] = useState('');
  const [supporterName, setSupporterName] = useState('');
  const [supporterEmail, setSupporterEmail] = useState('');
  const [supporterPhone, setSupporterPhone] = useState('');
  const [message, setMessage] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'MPESA_STK' | 'CARD_CHECKOUT'>('MPESA_STK');
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'pending' | 'success' | 'failed'>('idle');
  const [transactionId, setTransactionId] = useState<string | null>(null);
  
  // Error state for better error display
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorAction, setErrorAction] = useState<string | null>(null);
  const [canRetry, setCanRetry] = useState(true);

  // Check if author has wallet
  useEffect(() => {
    const checkWallet = async () => {
      try {
        const response = await fetch(`/api/support/${authorId}`, { method: 'GET' });
        if (response.ok) {
          const data = await response.json();
          // Only show button if support is enabled (wallet exists and is active)
          setHasWallet(data.supportEnabled === true);
        } else {
          setHasWallet(false);
        }
      } catch {
        setHasWallet(false);
      }
    };
    if (authorId) {
      checkWallet();
    }
  }, [authorId]);

  // Poll for payment status
  useEffect(() => {
    if (!transactionId || paymentStatus !== 'pending') return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/support/webhook?tx=${transactionId}`);
        const data = await response.json();

        if (data.status === 'COMPLETED') {
          setPaymentStatus('success');
          setErrorMessage(null);
          setErrorAction(null);
          clearInterval(pollInterval);
        } else if (data.status === 'FAILED' || data.status === 'CANCELLED') {
          setPaymentStatus('failed');
          // Capture user-friendly error message from API
          setErrorMessage(data.failedReason || 'Payment could not be completed.');
          setErrorAction(data.actionRequired || 'Please try again.');
          setCanRetry(data.canRetry !== false);
          clearInterval(pollInterval);
        }
      } catch (err) {
        console.error('Error polling status:', err);
      }
    }, 3000);

    // Timeout after 2 minutes - likely user didn't complete payment
    const timeout = setTimeout(() => {
      clearInterval(pollInterval);
      if (paymentStatus === 'pending') {
        setPaymentStatus('failed');
        setErrorMessage('Payment request timed out.');
        setErrorAction('The payment was not completed in time. Please try again.');
        setCanRetry(true);
      }
    }, 120000);

    return () => {
      clearInterval(pollInterval);
      clearTimeout(timeout);
    };
  }, [transactionId, paymentStatus]);

  // Don't render if author has no wallet or still loading
  if (hasWallet === null || hasWallet === false) {
    return null;
  }

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
          blogPostId,
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
          description: 'An M-Pesa prompt has been sent to your phone.',
        });
      } else if (data.checkoutUrl) {
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
    setErrorMessage(null);
    setErrorAction(null);
    setCanRetry(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    setTimeout(() => {
      setPaymentStatus('idle');
      setTransactionId(null);
      setSelectedAmount(50);
      setCustomAmount('');
      setSupporterName('');
      setSupporterEmail('');
      setSupporterPhone('');
      setMessage('');
      setErrorMessage(null);
      setErrorAction(null);
      setCanRetry(true);
    }, 300);
  };

  const openFullPage = () => {
    router.push(`/support/${authorId}`);
  };

  // Render button based on variant
  const renderTrigger = () => {
    switch (variant) {
      case 'icon-only':
        return (
          <Button
            size="icon"
            variant="outline"
            className={`rounded-full border-pink-200 hover:bg-pink-50 hover:border-pink-300 dark:border-pink-800 dark:hover:bg-pink-900/20 ${className}`}
          >
            <Heart className="h-4 w-4 text-pink-500" />
          </Button>
        );
      case 'compact':
        return (
          <Button
            size="sm"
            variant="outline"
            className={`border-pink-200 hover:bg-pink-50 hover:border-pink-300 dark:border-pink-800 dark:hover:bg-pink-900/20 ${className}`}
          >
            <Heart className="h-4 w-4 text-pink-500 mr-1" />
            Support
          </Button>
        );
      default:
        return (
          <Button
            className={`bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white ${className}`}
          >
            <Heart className="h-4 w-4 mr-2" />
            Support {authorName}
          </Button>
        );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {renderTrigger()}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <AnimatePresence mode="wait">
          {/* Success State */}
          {paymentStatus === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="text-center py-8"
            >
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-500 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-2">Thank You! 🎉</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Your support of {formatCurrency(getFinalAmount())} has been sent to {authorName}!
              </p>
              <Button onClick={handleClose}>Done</Button>
            </motion.div>
          )}

          {/* Pending State */}
          {paymentStatus === 'pending' && (
            <motion.div
              key="pending"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="text-center py-8"
            >
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-400 to-green-500 flex items-center justify-center mx-auto mb-4 animate-pulse">
                <Smartphone className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-2">Check Your Phone</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-2">
                M-Pesa prompt sent to {supporterPhone}
              </p>
              <p className="text-sm text-gray-500 mb-6">
                Enter your PIN to complete {formatCurrency(getFinalAmount())} payment
              </p>
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Waiting for confirmation...
              </div>
              <Button variant="ghost" onClick={handleReset} className="mt-4">
                Cancel
              </Button>
            </motion.div>
          )}

          {/* Failed State - With detailed error messages */}
          {paymentStatus === 'failed' && (
            <motion.div
              key="failed"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="text-center py-8"
            >
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-400 to-red-500 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-2">Payment Failed</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-2">
                {errorMessage || 'The payment could not be completed.'}
              </p>
              {errorAction && (
                <p className="text-sm text-gray-500 dark:text-gray-500 mb-6">
                  {errorAction}
                </p>
              )}
              <div className="flex gap-2 justify-center">
                {canRetry && (
                  <Button onClick={handleReset}>Try Again</Button>
                )}
                <Button variant="outline" onClick={handleClose}>Close</Button>
              </div>
            </motion.div>
          )}

          {/* Form State */}
          {paymentStatus === 'idle' && (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5 text-pink-500" />
                  Support {authorName}
                </DialogTitle>
                <DialogDescription>
                  {blogPostTitle ? (
                    <>For: &ldquo;{blogPostTitle}&rdquo;</>
                  ) : (
                    'Show your appreciation with a tip'
                  )}
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                {/* Quick Amounts */}
                <div className="grid grid-cols-4 gap-2">
                  {PRESET_AMOUNTS.slice(0, 8).map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => {
                        setSelectedAmount(amount);
                        setCustomAmount('');
                      }}
                      className={`p-2 rounded-lg border transition-all flex flex-col items-center gap-0.5 text-xs
                        ${selectedAmount === amount && !customAmount
                          ? 'border-pink-500 bg-pink-50 dark:bg-pink-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-pink-300'
                        }`}
                    >
                      {AMOUNT_ICONS[amount]}
                      <span className="font-semibold">{amount}</span>
                    </button>
                  ))}
                </div>

                <Input
                  type="number"
                  min="10"
                  placeholder="Or enter custom amount (min 10)"
                  value={customAmount}
                  onChange={(e) => {
                    setCustomAmount(e.target.value);
                    setSelectedAmount(null);
                  }}
                />

                {/* Payment Method */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('MPESA_STK')}
                    className={`p-3 rounded-lg border transition-all flex items-center justify-center gap-2
                      ${paymentMethod === 'MPESA_STK'
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                        : 'border-gray-200 dark:border-gray-700'
                      }`}
                  >
                    <Smartphone className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium">M-Pesa</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('CARD_CHECKOUT')}
                    className={`p-3 rounded-lg border transition-all flex items-center justify-center gap-2
                      ${paymentMethod === 'CARD_CHECKOUT'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700'
                      }`}
                  >
                    <CreditCard className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium">Card</span>
                  </button>
                </div>

                {/* Supporter Details */}
                <div className="space-y-3">
                  <Input
                    placeholder="Your name (optional)"
                    value={supporterName}
                    onChange={(e) => setSupporterName(e.target.value)}
                  />

                  {paymentMethod === 'MPESA_STK' && (
                    <Input
                      type="tel"
                      placeholder="M-Pesa number (e.g. 0712345678) *"
                      required
                      value={supporterPhone}
                      onChange={(e) => setSupporterPhone(e.target.value)}
                    />
                  )}

                  {paymentMethod === 'CARD_CHECKOUT' && (
                    <Input
                      type="email"
                      placeholder="Email address *"
                      required
                      value={supporterEmail}
                      onChange={(e) => setSupporterEmail(e.target.value)}
                    />
                  )}

                  <Textarea
                    placeholder="Leave a message (optional)"
                    rows={2}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    maxLength={200}
                  />
                </div>

                <Button
                  type="submit"
                  size="lg"
                  disabled={isSubmitting || getFinalAmount() < 10}
                  className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Heart className="mr-2 h-4 w-4" />
                      Support with {formatCurrency(getFinalAmount())}
                    </>
                  )}
                </Button>

                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Secure payment via IntaSend</span>
                  <button
                    type="button"
                    onClick={openFullPage}
                    className="flex items-center gap-1 hover:text-pink-500 transition-colors"
                  >
                    Full page <ExternalLink className="h-3 w-3" />
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}

export default SupportButton;
