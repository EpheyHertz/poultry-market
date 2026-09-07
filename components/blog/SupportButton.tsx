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
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  Heart,
  Coffee,
  Star,
  Gift,
  Loader2,
  CheckCircle,
  AlertCircle,
  CreditCard,
  Smartphone,
  Sparkles,
  ExternalLink,
  ArrowLeft,
} from 'lucide-react';
import { formatCurrency } from '@/lib/formatCurrency';
import { IntaSendPayButton } from '@/components/blog/intasend-pay-button';
import type { IntaSendPayButtonPayload } from '@/lib/intasend-checkout';

interface SupportButtonProps {
  authorId: string;
  authorName: string;
  blogPostId?: string;
  blogPostTitle?: string;
  variant?: 'default' | 'compact' | 'icon-only';
  className?: string;
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

  /**
   * form  -> collecting the amount and (optional) details
   * ready -> the IntaSend Payment Button is mounted, waiting for the click
   * success / failed -> outcome, confirmed by our webhook
   */
  const [stage, setStage] = useState<'form' | 'ready' | 'success' | 'failed'>('form');
  const [intent, setIntent] = useState<PayButtonIntent | null>(null);
  const [isWaiting, setIsWaiting] = useState(false);
  const [sdkBlocked, setSdkBlocked] = useState(false);

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

  // Poll our webhook status endpoint once the supporter is inside the IntaSend
  // modal. The webhook - not the SDK event - is what actually confirms payment.
  useEffect(() => {
    if (!intent?.transactionId || !isWaiting) return;

    const transactionId = intent.transactionId;

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/support/webhook?tx=${transactionId}`);
        const data = await response.json();

        if (data.status === 'COMPLETED') {
          setStage('success');
          setIsWaiting(false);
          setErrorMessage(null);
          setErrorAction(null);
          setIsOpen(true);
        } else if (data.status === 'FAILED' || data.status === 'CANCELLED') {
          setStage('failed');
          setIsWaiting(false);
          setErrorMessage(data.failedReason || 'Payment could not be completed.');
          setErrorAction(data.actionRequired || 'Please try again.');
          setCanRetry(data.canRetry !== false);
          setIsOpen(true);
        }
      } catch (err) {
        console.error('Error polling status:', err);
      }
    }, 3000);

    // Give up after 2 minutes - the supporter most likely abandoned the modal.
    const timeout = setTimeout(() => {
      setStage('failed');
      setIsWaiting(false);
      setErrorMessage('Payment request timed out.');
      setErrorAction('The payment was not completed in time. Please try again.');
      setCanRetry(true);
      setIsOpen(true);
    }, 120000);

    return () => {
      clearInterval(pollInterval);
      clearTimeout(timeout);
    };
  }, [intent?.transactionId, isWaiting]);

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

  const buildRequestBody = (extra?: Record<string, unknown>) => ({
    amount: getFinalAmount(),
    name: supporterName || undefined,
    email: supporterEmail || undefined,
    phoneNumber: supporterPhone || undefined,
    message: message || undefined,
    blogPostId,
    ...extra,
  });

  /**
   * Step 1: our server records a PENDING transaction (amount, 5% fee, author
   * wallet) and hands back the fields for the IntaSend Payment Button. Nothing
   * is charged yet - the supporter still has to click the IntaSend button.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (getFinalAmount() < 10) {
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
      setStage('ready');
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
   * Only used when the InlineJS SDK cannot load (blocked CDN, extension, etc.).
   * The server then creates a hosted checkout and we hand the browser over to it.
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

  const backToForm = () => {
    setStage('form');
    setIntent(null);
    setIsWaiting(false);
    setSdkBlocked(false);
  };

  const handleReset = () => {
    setStage('form');
    setIntent(null);
    setIsWaiting(false);
    setSdkBlocked(false);
    setErrorMessage(null);
    setErrorAction(null);
    setCanRetry(true);
  };

  const handleClose = () => {
    setIsOpen(false);

    setTimeout(() => {
      setStage('form');
      setIntent(null);
      setIsWaiting(false);
      setSdkBlocked(false);
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
          {stage === 'success' && (
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

          {/* Ready State - the IntaSend Payment Button lives here */}
          {stage === 'ready' && intent && (
            <motion.div
              key="ready"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
            >
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5 text-pink-500" />
                  Confirm your support
                </DialogTitle>
                <DialogDescription>
                  {formatCurrency(getFinalAmount())} to {authorName}
                </DialogDescription>
              </DialogHeader>

              <div className="mt-4 space-y-4">
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Smartphone className="h-4 w-4 text-green-600" />
                    <CreditCard className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium">M-Pesa, Card or Bank</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    Pick your preferred method in the secure IntaSend window.
                  </p>
                </div>

                {/* The documented IntaSend Payment Button: data-* fields + InlineJS */}
                <IntaSendPayButton
                  publicApiKey={intent.publicApiKey}
                  live={intent.live}
                  payload={intent.fields}
                  className="w-full inline-flex items-center justify-center rounded-md px-4 py-3 text-sm font-medium text-white bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 disabled:opacity-60 disabled:cursor-not-allowed"
                  onOpen={() => setIsWaiting(true)}
                  onInProgress={() => setIsWaiting(true)}
                  onComplete={() => {
                    // The webhook is authoritative; poll once more to confirm,
                    // but move the UI forward immediately.
                    setIsWaiting(false);
                    setStage('success');
                  }}
                  onFailed={() => {
                    setIsWaiting(false);
                    setStage('failed');
                    setErrorMessage('The payment was not completed.');
                    setErrorAction('You can try again with a different method.');
                    setCanRetry(true);
                  }}
                  onSdkError={() => setSdkBlocked(true)}
                >
                  <Heart className="mr-2 h-4 w-4" />
                  Pay {formatCurrency(getFinalAmount())} with IntaSend
                </IntaSendPayButton>

                {isWaiting && (
                  <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Waiting for confirmation...
                  </div>
                )}

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
                  onClick={backToForm}
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-pink-500 transition-colors"
                >
                  <ArrowLeft className="h-3 w-3" /> Change amount
                </button>
              </div>
            </motion.div>
          )}

          {/* Failed State - With detailed error messages */}
          {stage === 'failed' && (
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
          {stage === 'form' && (
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

                {/* One inline checkout, every method IntaSend supports */}
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Smartphone className="h-4 w-4 text-green-600" />
                    <CreditCard className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium">M-Pesa, Card or Bank</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    Pick your preferred method in the secure IntaSend window.
                  </p>
                </div>

                {/* Supporter Details */}
                <div className="space-y-3">
                  <Input
                    placeholder="Your name (optional)"
                    value={supporterName}
                    onChange={(e) => setSupporterName(e.target.value)}
                  />

                  <Input
                    type="tel"
                    placeholder="Phone number (optional)"
                    value={supporterPhone}
                    onChange={(e) => setSupporterPhone(e.target.value)}
                  />

                  <Input
                    type="email"
                    placeholder="Email for your receipt (optional)"
                    value={supporterEmail}
                    onChange={(e) => setSupporterEmail(e.target.value)}
                  />

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
                      Preparing...
                    </>
                  ) : (
                    <>
                      <Heart className="mr-2 h-4 w-4" />
                      Continue with {formatCurrency(getFinalAmount())}
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
