'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ArrowLeft, CheckCircle2, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

const PLAN_LABELS: Record<string, string> = {
  FREE: 'Free',
  BASIC: 'Basic',
  PRO: 'Pro',
  ENTERPRISE: 'Enterprise',
};

const PLAN_PRICES: Record<'basic' | 'pro' | 'enterprise', number> = {
  basic: 500,
  pro: 1500,
  enterprise: 5000,
};

type FeatureCheck = {
  allowed: boolean;
  reason?: string;
};

type SubscriptionResponse = {
  subscription: {
    plan: 'FREE' | 'BASIC' | 'PRO' | 'ENTERPRISE';
    status: 'ACTIVE' | 'INACTIVE' | 'EXPIRED';
    endDate: string | null;
  };
  limits: {
    maxAttachments: number;
    maxMonthlyImports: number;
    maxImportRowsPerFile: number;
    maxAttachmentSizeBytes: number;
    hasAdvancedAnalytics: boolean;
  };
  features: {
    import_data: FeatureCheck;
    upload_attachment: FeatureCheck;
    advanced_analytics: FeatureCheck;
  };
};

type SubscriptionHistoryItem = {
  invoiceId: string;
  status: 'CREATED' | 'PENDING' | 'COMPLETE' | 'FAILED' | 'EXPIRED' | 'USED';
  amount: number;
  phoneNumber: string | null;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  plan: 'BASIC' | 'PRO' | 'ENTERPRISE' | null;
  apiRef: string | null;
};

function getInvoiceStatusBadgeVariant(status: SubscriptionHistoryItem['status']) {
  if (status === 'COMPLETE' || status === 'USED') return 'default' as const;
  if (status === 'PENDING' || status === 'CREATED') return 'secondary' as const;
  if (status === 'FAILED' || status === 'EXPIRED') return 'destructive' as const;
  return 'outline' as const;
}

export default function FarmSubscriptionPage() {
  const [data, setData] = useState<SubscriptionResponse | null>(null);
  const [history, setHistory] = useState<SubscriptionHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'basic' | 'pro' | 'enterprise'>('basic');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [pendingInvoiceId, setPendingInvoiceId] = useState<string | null>(null);

  const endDateLabel = useMemo(() => {
    if (!data?.subscription.endDate) return 'No expiry date';
    return new Date(data.subscription.endDate).toLocaleDateString();
  }, [data?.subscription.endDate]);

  const daysRemaining = useMemo(() => {
    if (!data?.subscription.endDate) return null;

    const msRemaining = new Date(data.subscription.endDate).getTime() - Date.now();
    return Math.ceil(msRemaining / (1000 * 60 * 60 * 24));
  }, [data?.subscription.endDate]);

  const loadSubscription = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/subscriptions', { cache: 'no-store' });
      const body = await response.json();

      if (!response.ok) {
        throw new Error(body.error || 'Failed to load subscription');
      }

      setData(body as SubscriptionResponse);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load subscription');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const response = await fetch('/api/subscriptions/history?take=20', { cache: 'no-store' });
      const body = await response.json();

      if (!response.ok) {
        throw new Error(body.error || 'Failed to load payment history');
      }

      setHistory(body.history || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load payment history');
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadSubscription(), loadHistory()]);
    } finally {
      setRefreshing(false);
    }
  }, [loadHistory, loadSubscription]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  async function handleUpgrade() {
    if (!phoneNumber.trim()) {
      toast.error('Phone number is required');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: selectedPlan,
          phoneNumber: phoneNumber.trim(),
        }),
      });

      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error || 'Failed to start subscription payment');
      }

      setPendingInvoiceId(body.data?.invoiceId || null);
      toast.success('Payment request sent to your phone. Complete STK prompt, then verify.');
      await loadHistory();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to start payment');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerifyPayment(invoiceId?: string) {
    const targetInvoiceId = invoiceId || pendingInvoiceId;
    if (!targetInvoiceId) {
      toast.error('No pending subscription invoice to verify');
      return;
    }

    setVerifying(true);
    try {
      const response = await fetch('/api/subscriptions/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId: targetInvoiceId,
        }),
      });

      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error || 'Verification failed');
      }

      if (body.success) {
        toast.success('Subscription activated successfully');
        if (pendingInvoiceId === targetInvoiceId) {
          setPendingInvoiceId(null);
        }
      } else {
        toast.message(body.message || `Payment state: ${body.state}`);
      }

      await Promise.all([loadSubscription(), loadHistory()]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to verify payment');
    } finally {
      setVerifying(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-5xl p-4 sm:p-6">
        <p className="text-sm text-muted-foreground">Loading subscription...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto w-full max-w-5xl p-4 sm:p-6">
        <Card>
          <CardHeader>
            <CardTitle>Subscription</CardTitle>
            <CardDescription>Unable to load subscription details.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={loadSubscription}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <main className="mx-auto w-full max-w-5xl space-y-4 p-4 sm:space-y-6 sm:p-6">
      <section className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold sm:text-2xl">Farm Subscription</h1>
          <p className="text-sm text-muted-foreground">Manage your plan and feature limits.</p>
        </div>

        <Button variant="outline" size="sm" className="gap-2" onClick={refreshAll} disabled={refreshing}>
          <RefreshCcw className="h-4 w-4" />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </Button>

        <Link href="/farm">
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Current Plan</CardTitle>
          <CardDescription>Local subscription state used for access enforcement.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <p className="text-sm">
            <span className="text-muted-foreground">Plan:</span>{' '}
            <Badge variant="outline">{PLAN_LABELS[data.subscription.plan]}</Badge>
          </p>
          <p className="text-sm">
            <span className="text-muted-foreground">Status:</span>{' '}
            <Badge variant="outline">{data.subscription.status.toLowerCase()}</Badge>
          </p>
          <p className="text-sm">
            <span className="text-muted-foreground">Ends:</span> {endDateLabel}
          </p>
          <p className="text-sm">
            <span className="text-muted-foreground">Attachment limit:</span> {data.limits.maxAttachments}
          </p>
          <p className="text-sm">
            <span className="text-muted-foreground">Monthly imports:</span> {data.limits.maxMonthlyImports}
          </p>
          <p className="text-sm">
            <span className="text-muted-foreground">Advanced analytics:</span>{' '}
            {data.limits.hasAdvancedAnalytics ? 'Enabled' : 'Not available'}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Renewal Status</CardTitle>
          <CardDescription>Track when the current plan ends and whether renewal is needed.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <p className="text-sm">
            <span className="text-muted-foreground">Days remaining:</span>{' '}
            {daysRemaining === null ? 'N/A' : daysRemaining <= 0 ? 'Expired' : daysRemaining}
          </p>
          <p className="text-sm">
            <span className="text-muted-foreground">Import access:</span>{' '}
            {data.features.import_data.allowed ? 'Allowed' : data.features.import_data.reason || 'Not allowed'}
          </p>
          <p className="text-sm">
            <span className="text-muted-foreground">Attachment access:</span>{' '}
            {data.features.upload_attachment.allowed
              ? 'Allowed'
              : data.features.upload_attachment.reason || 'Not allowed'}
          </p>
          <p className="text-sm">
            <span className="text-muted-foreground">Advanced analytics:</span>{' '}
            {data.features.advanced_analytics.allowed
              ? 'Allowed'
              : data.features.advanced_analytics.reason || 'Not allowed'}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Upgrade Plan</CardTitle>
          <CardDescription>
            Choose a plan and pay via Mpeas. Verify after payment if webhook is delayed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            {(Object.keys(PLAN_PRICES) as Array<'basic' | 'pro' | 'enterprise'>).map((plan) => (
              <button
                key={plan}
                type="button"
                onClick={() => setSelectedPlan(plan)}
                className={`rounded-lg border p-3 text-left transition ${
                  selectedPlan === plan ? 'border-primary bg-primary/5' : 'hover:bg-muted/30'
                }`}
              >
                <p className="font-medium">{PLAN_LABELS[plan.toUpperCase()]}</p>
                <p className="text-xs text-muted-foreground">KES {PLAN_PRICES[plan]} / billing cycle</p>
              </button>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
            <Input
              placeholder="Phone number (e.g. 2547...)"
              value={phoneNumber}
              onChange={(event) => setPhoneNumber(event.target.value)}
            />
            <Button onClick={handleUpgrade} disabled={submitting}>
              {submitting ? 'Sending...' : 'Start Payment'}
            </Button>
            <Button
              variant="outline"
              onClick={() => handleVerifyPayment()}
              disabled={verifying || !pendingInvoiceId}
            >
              {verifying ? 'Verifying...' : 'Verify Payment'}
            </Button>
          </div>

          {pendingInvoiceId && (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
              <p className="flex items-center gap-2 font-medium">
                <CheckCircle2 className="h-4 w-4" />
                Payment request in progress
              </p>
              <p className="mt-1 text-xs">Pending invoice: {pendingInvoiceId}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Payment History</CardTitle>
          <CardDescription>Recent subscription invoices and their current payment state.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {historyLoading ? (
            <p className="text-sm text-muted-foreground">Loading payment history...</p>
          ) : history.length === 0 ? (
            <p className="text-sm text-muted-foreground">No subscription invoices found yet.</p>
          ) : (
            history.map((item) => (
              <div key={item.invoiceId} className="rounded-md border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium">{item.invoiceId}</p>
                  <Badge variant={getInvoiceStatusBadgeVariant(item.status)}>{item.status.toLowerCase()}</Badge>
                </div>

                <p className="mt-1 text-xs text-muted-foreground">
                  KES {item.amount} | {item.phoneNumber || 'No phone'} | Plan:{' '}
                  {item.plan ? PLAN_LABELS[item.plan] : 'Unknown'}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Created {new Date(item.createdAt).toLocaleString()} | Expires{' '}
                  {new Date(item.expiresAt).toLocaleString()}
                </p>

                {item.status === 'PENDING' && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setPendingInvoiceId(item.invoiceId)}
                    >
                      Set As Pending
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleVerifyPayment(item.invoiceId)}
                      disabled={verifying}
                    >
                      {verifying ? 'Verifying...' : 'Verify This Invoice'}
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </main>
  );
}
