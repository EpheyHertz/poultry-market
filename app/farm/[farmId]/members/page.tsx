'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { InviteForm } from '@/components/farm/invite-form';
import { MembersList, type FarmMemberRow } from '@/components/farm/members-list';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { usePermissions } from '@/hooks/use-permissions';
import { useToast } from '@/hooks/use-toast';

interface FarmRoleRow {
  id: string;
  name: string;
  rank: number;
}

export default function FarmMembersPage() {
  const params = useParams<{ farmId: string }>();
  const farmId = params?.farmId;
  const { can, farm, member, loading: permissionsLoading } = usePermissions(farmId);
  const [members, setMembers] = useState<FarmMemberRow[]>([]);
  const [roles, setRoles] = useState<FarmRoleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadMembers = async () => {
    if (!farmId) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/farms/${farmId}/members`, { cache: 'no-store' });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to load members');
      }

      setMembers((payload.members || []).map((row: any) => ({
        id: row.id,
        invitedEmail: row.invitedEmail,
        status: row.status,
        rank: row.rank,
        role: row.role,
        user: row.user,
      })));
      setRoles(payload.assignableRoles || []);
    } catch (error) {
      toast({
        title: 'Failed to load members',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadMembers();
  }, [farmId]);

  const roleNameLookup = useMemo(() => new Map(roles.map((role) => [role.id, role.name])), [roles]);

  const handleChangeRole = async (memberId: string, nextRoleId: string) => {
    if (!farmId) return;

    try {
      const response = await fetch(`/api/farms/${farmId}/members/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleId: nextRoleId }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to update member role');
      }

      toast({ title: 'Role updated', description: 'The member role has been changed successfully.' });
      await loadMembers();
    } catch (error) {
      toast({
        title: 'Could not update role',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleRemove = async (memberId: string) => {
    if (!farmId) return;

    try {
      const response = await fetch(`/api/farms/${farmId}/members/${memberId}`, {
        method: 'DELETE',
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to remove member');
      }

      toast({ title: 'Member removed', description: 'The member was removed from the farm.' });
      await loadMembers();
    } catch (error) {
      toast({
        title: 'Could not remove member',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleResendInvite = async (memberId: string) => {
    if (!farmId) return;

    const target = members.find((item) => item.id === memberId);
    if (!target) return;

    const roleId = target.role.id;

    try {
      const response = await fetch(`/api/farms/${farmId}/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: target.invitedEmail, roleId }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to resend invite');
      }

      toast({ title: 'Invite resent', description: `A fresh invite was sent to ${target.invitedEmail}.` });
      await loadMembers();
    } catch (error) {
      toast({
        title: 'Could not resend invite',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  if (permissionsLoading || loading) {
    return (
      <DashboardLayout>
        <div className="mx-auto w-full max-w-7xl p-4 sm:p-6">
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">Loading farm members...</CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6">
        <section className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Farm members</h1>
          <p className="text-muted-foreground">
            Manage access for {farm?.name || 'this farm'} and keep billing-aware workspace controls in one place.
          </p>
        </section>

        {can('member:invite') ? <InviteForm farmId={farmId || ''} onInvited={loadMembers} /> : null}

        <Card className="bg-card">
          <CardHeader>
            <CardTitle>Current permissions</CardTitle>
            <CardDescription>
              Role: {member?.role.name || 'Unknown'} · Available roles: {roles.length}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
              {roles.map((role) => (
                <span key={role.id} className="rounded-full border border-border px-3 py-1">
                  {role.name} ({roleNameLookup.get(role.id) || role.id})
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        <MembersList
          members={members}
          roles={roles}
          onChangeRole={can('member:manage') ? handleChangeRole : undefined}
          onRemove={can('member:manage') ? handleRemove : undefined}
          onResendInvite={can('member:invite') ? handleResendInvite : undefined}
        />

        {!can('member:invite') && !can('member:manage') && (
          <Card className="border-dashed">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              You do not have permission to invite or manage members on this farm.
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
