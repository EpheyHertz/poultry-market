'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

interface FarmRoleOption {
  id: string;
  name: string;
  rank: number;
}

interface InviteFormProps {
  farmId: string;
  onInvited?: () => void;
}

export function InviteForm({ farmId, onInvited }: InviteFormProps) {
  const [email, setEmail] = useState('');
  const [roleId, setRoleId] = useState('');
  const [roles, setRoles] = useState<FarmRoleOption[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    let active = true;

    const loadRoles = async () => {
      setLoadingRoles(true);
      try {
        const response = await fetch(`/api/farms/${farmId}/invitations`, { cache: 'no-store' });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error || 'Failed to load assignable roles');
        }

        if (active) {
          setRoles(payload.roles || []);
          setRoleId((payload.roles || [])[0]?.id || '');
        }
      } catch (error) {
        if (active) {
          setRoles([]);
          setRoleId('');
          toast({
            title: 'Could not load roles',
            description: error instanceof Error ? error.message : 'Try again later.',
            variant: 'destructive',
          });
        }
      } finally {
        if (active) {
          setLoadingRoles(false);
        }
      }
    };

    void loadRoles();

    return () => {
      active = false;
    };
  }, [farmId, toast]);

  const canSubmit = useMemo(() => Boolean(email.trim()) && Boolean(roleId) && !submitting, [email, roleId, submitting]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canSubmit) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/farms/${farmId}/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, roleId }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to send invitation');
      }

      toast({
        title: 'Invitation sent',
        description: `An invite email was sent to ${email}.`,
      });
      setEmail('');
      onInvited?.();
    } catch (error) {
      toast({
        title: 'Invitation failed',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="bg-card">
      <CardHeader>
        <CardTitle>Invite member</CardTitle>
        <CardDescription>Send a workspace invitation with a rank-limited role.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="invite-email">Email address</Label>
            <Input
              id="invite-email"
              type="email"
              placeholder="member@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="invite-role">Role</Label>
            <Select value={roleId} onValueChange={setRoleId} disabled={loadingRoles}>
              <SelectTrigger id="invite-role">
                <SelectValue placeholder={loadingRoles ? 'Loading roles...' : 'Select a role'} />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.name} · rank {role.rank}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" className="w-full gap-2" disabled={!canSubmit}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {submitting ? 'Sending...' : 'Send invitation'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
