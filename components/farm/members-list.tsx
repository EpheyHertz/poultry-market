'use client';

import { ShieldCheck, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export interface FarmMemberRow {
  id: string;
  invitedEmail: string;
  status: 'PENDING' | 'ACTIVE' | 'REJECTED';
  rank: number;
  role: {
    id: string;
    name: string;
    rank: number;
  };
  user?: {
    id: string;
    name: string;
    email: string;
    avatar?: string | null;
  } | null;
}

interface MembersListProps {
  members: FarmMemberRow[];
  roles?: Array<{ id: string; name: string; rank: number }>;
  onChangeRole?: (memberId: string, roleId: string) => void;
  onRemove?: (memberId: string) => void;
  onResendInvite?: (memberId: string) => void;
}

export function MembersList({ members, roles = [], onChangeRole, onRemove, onResendInvite }: MembersListProps) {
  return (
    <Card className="bg-card">
      <CardHeader>
        <CardTitle>Members</CardTitle>
        <CardDescription>Manage access, roles, and pending invitations.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-hidden rounded-2xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium text-foreground">
                        {member.user?.name || member.invitedEmail}
                      </div>
                      <div className="text-sm text-muted-foreground">{member.user?.email || member.invitedEmail}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {onChangeRole && roles.length > 0 && member.status === 'ACTIVE' ? (
                      <Select
                        value={member.role.id}
                        onValueChange={(nextRoleId) => {
                          if (nextRoleId !== member.role.id) {
                            onChangeRole(member.id, nextRoleId);
                          }
                        }}
                      >
                        <SelectTrigger className="h-8 w-[180px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {roles.map((role) => (
                            <SelectItem key={role.id} value={role.id}>
                              {role.name} · rank {role.rank}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant="outline" className="gap-1">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        {member.role.name}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={member.status === 'ACTIVE' ? 'default' : 'secondary'}>{member.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      {member.status === 'PENDING' && onResendInvite ? (
                        <Button variant="outline" size="sm" onClick={() => onResendInvite(member.id)}>
                          Resend
                        </Button>
                      ) : null}
                      {onRemove ? (
                        <Button variant="destructive" size="sm" onClick={() => onRemove(member.id)}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          {member.status === 'PENDING' ? 'Revoke' : 'Remove'}
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
