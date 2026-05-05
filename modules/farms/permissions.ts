import type { FarmMember, FarmRole } from '@prisma/client';

export type FarmPermission =
  | 'farm:read'
  | 'farm:manage'
  | 'farm:delete'
  | 'farm:billing:manage'
  | 'member:invite'
  | 'member:manage'
  | 'member:remove'
  | 'member:read'
  | 'role:manage'
  | 'flock:read'
  | 'flock:create'
  | 'flock:manage'
  | 'feed:read'
  | 'feed:write'
  | 'health:read'
  | 'health:write'
  | 'report:read'
  | 'report:export'
  | 'attachment:read'
  | 'attachment:write'
  | 'import:read'
  | 'import:write'
  | 'reminder:read'
  | 'reminder:write';

export interface FarmRoleSeed {
  key: string;
  name: string;
  rank: number;
  permissions: FarmPermission[];
  isSystem: boolean;
}

export const FARM_ROLE_SEEDS: FarmRoleSeed[] = [
  {
    key: 'owner',
    name: 'Owner',
    rank: 100,
    isSystem: true,
    permissions: [
      'farm:read',
      'farm:manage',
      'farm:delete',
      'farm:billing:manage',
      'member:invite',
      'member:manage',
      'member:remove',
      'member:read',
      'role:manage',
      'flock:read',
      'flock:create',
      'flock:manage',
      'feed:read',
      'feed:write',
      'health:read',
      'health:write',
      'report:read',
      'report:export',
      'attachment:read',
      'attachment:write',
      'import:read',
      'import:write',
      'reminder:read',
      'reminder:write',
    ],
  },
  {
    key: 'admin',
    name: 'Admin',
    rank: 50,
    isSystem: true,
    permissions: [
      'farm:read',
      'farm:manage',
      'member:invite',
      'member:manage',
      'member:remove',
      'member:read',
      'flock:read',
      'flock:create',
      'flock:manage',
      'feed:read',
      'feed:write',
      'health:read',
      'health:write',
      'report:read',
      'report:export',
      'attachment:read',
      'attachment:write',
      'import:read',
      'import:write',
      'reminder:read',
      'reminder:write',
    ],
  },
  {
    key: 'viewer',
    name: 'Viewer',
    rank: 10,
    isSystem: true,
    permissions: [
      'farm:read',
      'member:read',
      'flock:read',
      'feed:read',
      'health:read',
      'report:read',
      'attachment:read',
      'import:read',
      'reminder:read',
    ],
  },
];

const PERMISSION_MIN_RANK: Record<FarmPermission, number> = {
  'farm:read': 10,
  'farm:manage': 50,
  'farm:delete': 100,
  'farm:billing:manage': 100,
  'member:invite': 50,
  'member:manage': 50,
  'member:remove': 50,
  'member:read': 10,
  'role:manage': 100,
  'flock:read': 10,
  'flock:create': 50,
  'flock:manage': 50,
  'feed:read': 10,
  'feed:write': 50,
  'health:read': 10,
  'health:write': 50,
  'report:read': 10,
  'report:export': 10,
  'attachment:read': 10,
  'attachment:write': 50,
  'import:read': 10,
  'import:write': 50,
  'reminder:read': 10,
  'reminder:write': 50,
};

export function canRolePerform(role: Pick<FarmRole, 'rank' | 'permissions'>, permission: FarmPermission) {
  return role.permissions.includes(permission) || role.rank >= PERMISSION_MIN_RANK[permission];
}

export function canMemberPerform(member: Pick<FarmMember, 'status' | 'rank'> & { role: Pick<FarmRole, 'rank' | 'permissions'> }, permission: FarmPermission) {
  if (member.status !== 'ACTIVE') {
    return false;
  }

  return canRolePerform(member.role, permission) || member.rank >= PERMISSION_MIN_RANK[permission];
}

export function getAssignableRolesForRank(roles: FarmRole[], inviterRank: number) {
  return roles
    .filter((role) => role.rank < inviterRank)
    .sort((left, right) => right.rank - left.rank);
}

export function getFarmPermissionThreshold(permission: FarmPermission) {
  return PERMISSION_MIN_RANK[permission];
}
