'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { MapPin } from 'lucide-react';

export interface PendingInvitation {
  id: string;
  farmName: string;
  roleName: string;
  invitedByName?: string | null;
  invitedByEmail?: string | null;
  invitedAt: string;
  expiresAt?: string | null;
}

interface PendingInvitationsCardProps {
  invitations: PendingInvitation[];
}

const formatDate = (value?: string | null) => {
  if (!value) return 'N/A';
  return new Date(value).toLocaleDateString();
};

export default function PendingInvitationsCard({ invitations }: PendingInvitationsCardProps) {
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  if (!invitations.length) {
    return null;
  }

  const handleAccept = async (invitationId: string) => {
    setAcceptingId(invitationId);
    try {
      const response = await fetch(`/api/invitations/by-id/${invitationId}/accept`, {
        method: 'POST',
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to accept invitation');
      }

      toast({
        title: 'Invitation accepted',
        description: 'You now have access to the farm workspace.',
      });
      router.refresh();
    } catch (error) {
      toast({
        title: 'Could not accept invitation',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setAcceptingId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Farm invitations</CardTitle>
        <CardDescription>Pending farm workspaces waiting for your response.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {invitations.map((invitation) => (
            <div
              key={invitation.id}
              className="flex flex-col gap-4 rounded-lg border border-border p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <p className="font-semibold text-foreground">{invitation.farmName}</p>
                  <Badge variant="secondary">Pending</Badge>
                </div>
                <p className="text-sm text-muted-foreground">Role: {invitation.roleName}</p>
                {invitation.invitedByName || invitation.invitedByEmail ? (
                  <p className="text-sm text-muted-foreground">
                    Invited by {invitation.invitedByName || invitation.invitedByEmail}
                  </p>
                ) : null}
                <p className="text-xs text-muted-foreground">
                  Invited {formatDate(invitation.invitedAt)}
                  {invitation.expiresAt ? ` • Expires ${formatDate(invitation.expiresAt)}` : ''}
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  onClick={() => handleAccept(invitation.id)}
                  disabled={acceptingId === invitation.id}
                >
                  {acceptingId === invitation.id ? 'Accepting...' : 'Accept invitation'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
