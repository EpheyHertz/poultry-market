'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertTriangle, CheckCircle2, LockKeyhole, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

interface InvitationDetails {
  id: string;
  farmId: string;
  farmName: string;
  role: {
    id: string;
    name: string;
    rank: number;
    permissions: string[];
  };
  invitedEmail: string;
  invitedBy?: {
    name?: string | null;
    email?: string | null;
  } | null;
  invitationExpiresAt: string;
  status: string;
}

export default function AcceptInvitationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const farmId = searchParams.get('farmId') || '';
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [loading, setLoading] = useState(Boolean(token));
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    let active = true;

    const loadInvitation = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/invitations/${encodeURIComponent(token)}`, { cache: 'no-store' });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error || 'Invitation is no longer available');
        }

        if (active) {
          setInvitation(payload.invitation);
          setEmail(payload.invitation?.invitedEmail || '');
        }
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load invitation');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadInvitation();

    return () => {
      active = false;
    };
  }, [token]);

  const handleAccept = async () => {
    if (!token) return;

    setAccepting(true);
    try {
      const response = await fetch(`/api/invitations/${encodeURIComponent(token)}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, farmId }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to accept invitation');
      }

      toast({
        title: 'Invitation accepted',
        description: 'Redirecting you to the farm dashboard.',
      });
      router.push(`/farm/dashboard?farmId=${encodeURIComponent(payload.membership.farmId || farmId)}`);
    } catch (acceptError) {
      toast({
        title: 'Could not accept invitation',
        description: acceptError instanceof Error ? acceptError.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setAccepting(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center justify-center p-4 sm:p-6">
      <Card className="w-full border-border/60 bg-card/95 shadow-xl backdrop-blur">
        <CardHeader className="space-y-3 border-b border-border/60 bg-gradient-to-r from-slate-950 via-slate-900 to-cyan-900 text-white">
          <CardTitle className="flex items-center gap-2 text-2xl">
            <LockKeyhole className="h-5 w-5" />
            Accept farm invitation
          </CardTitle>
          <CardDescription className="text-slate-200">
            Join a shared farm workspace after verifying your invitation token.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 p-6">
          {!token ? (
            <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
              <AlertTriangle className="mt-0.5 h-5 w-5" />
              <div>
                <p className="font-semibold">Missing invitation token</p>
                <p className="text-sm">Open the invitation link from your email to continue.</p>
              </div>
            </div>
          ) : loading ? (
            <div className="flex items-center gap-3 rounded-2xl border border-dashed border-border p-4 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Validating invitation...
            </div>
          ) : error ? (
            <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-900">
              <AlertTriangle className="mt-0.5 h-5 w-5" />
              <div>
                <p className="font-semibold">Invitation unavailable</p>
                <p className="text-sm">{error}</p>
              </div>
            </div>
          ) : invitation ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-border bg-muted/30 p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Valid invitation
                </div>
                <h2 className="mt-2 text-2xl font-semibold text-foreground">{invitation.farmName}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  You are invited as <span className="font-medium text-foreground">{invitation.role.name}</span>.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">Invitation email</label>
                  <Input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">Workspace</label>
                  <Input value={invitation.farmName} readOnly />
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button className="flex-1" onClick={handleAccept} disabled={accepting}>
                  {accepting ? 'Accepting...' : 'Accept invitation'}
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => router.push('/login')}>
                  Sign in instead
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
}
