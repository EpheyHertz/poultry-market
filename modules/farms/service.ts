import crypto from 'crypto';
import type { Farm, FarmMember, FarmMemberStatus, FarmRole, User } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { sendFarmInvitationEmail } from './email';
import { FARM_ROLE_SEEDS, type FarmPermission, canMemberPerform, getAssignableRolesForRank } from './permissions';

export interface FarmWithAccess extends Farm {
  roles?: FarmRole[];
  members?: Array<FarmMember & { role: FarmRole; user?: User | null; invitedBy?: User | null }>;
}

export interface CurrentFarmAccess {
  farm: Farm;
  member: FarmMember & { role: FarmRole; user?: User | null };
  role: FarmRole;
}

export interface CreateFarmInput {
  ownerId: string;
  ownerEmail: string;
  name: string;
  slug?: string | null;
  settings?: unknown;
}

export interface InviteFarmMemberInput {
  farmId: string;
  inviterId: string;
  invitedEmail: string;
  roleId: string;
}

export interface AcceptFarmInvitationInput {
  token: string;
  userId: string;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function hashInvitationToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function generateInvitationToken() {
  return crypto.randomBytes(32).toString('hex');
}

export async function createFarm(input: CreateFarmInput) {
  const farm = await prisma.$transaction(async (tx) => {
    const createdFarm = await tx.farm.create({
      data: {
        ownerId: input.ownerId,
        name: input.name.trim(),
        slug: input.slug?.trim() || null,
        settings: input.settings as any,
      },
    });

    const createdRoles = await Promise.all(
      FARM_ROLE_SEEDS.map((role) =>
        tx.farmRole.create({
          data: {
            farmId: createdFarm.id,
            key: role.key,
            name: role.name,
            rank: role.rank,
            permissions: role.permissions,
            isSystem: role.isSystem,
          },
        })
      )
    );

    const ownerRole = createdRoles.find((role) => role.key === 'owner');

    if (!ownerRole) {
      throw new Error('Owner role could not be initialized');
    }

    await tx.farmMember.create({
      data: {
        farmId: createdFarm.id,
        userId: input.ownerId,
        roleId: ownerRole.id,
        invitedById: input.ownerId,
        invitedEmail: normalizeEmail(input.ownerEmail),
        status: 'ACTIVE',
        rank: ownerRole.rank,
        acceptedAt: new Date(),
      },
    });

    return createdFarm;
  });

  return farm;
}

export async function listFarmsForUser(userId: string) {
  return prisma.farm.findMany({
    where: {
      members: {
        some: {
          userId,
          status: 'ACTIVE',
        },
      },
    },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
        },
      },
      members: {
        where: {
          status: 'ACTIVE',
        },
        include: {
          role: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            },
          },
        },
      },
      roles: true,
      _count: {
        select: {
          members: true,
          flocks: true,
          feedRecords: true,
          mortalityRecords: true,
          vaccinations: true,
          attachments: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

export async function getFarmAccess(userId: string, farmId: string) {
  const farm = await prisma.farm.findUnique({
    where: { id: farmId },
    include: {
      roles: true,
      members: {
        where: {
          userId,
          status: 'ACTIVE',
        },
        include: {
          role: true,
          user: true,
        },
      },
    },
  });

  if (!farm || farm.members.length === 0) {
    return null;
  }

  const member = farm.members[0];
  return {
    farm,
    member,
    role: member.role,
  };
}

export async function getFarmById(farmId: string) {
  return prisma.farm.findUnique({
    where: { id: farmId },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
        },
      },
      roles: {
        orderBy: [{ rank: 'desc' }, { createdAt: 'asc' }],
      },
      members: {
        orderBy: [{ status: 'asc' }, { rank: 'desc' }, { createdAt: 'asc' }],
        include: {
          role: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            },
          },
          invitedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
      _count: {
        select: {
          members: true,
          flocks: true,
          feedRecords: true,
          mortalityRecords: true,
          vaccinations: true,
          attachments: true,
        },
      },
    },
  });
}

export async function updateFarmDetails(farmId: string, userId: string, data: Partial<Pick<Farm, 'name' | 'slug' | 'settings' | 'subscriptionPlan' | 'subscriptionStatus' | 'subscriptionEndsAt' | 'billingEmail' | 'billingProvider' | 'billingReference'>>) {
  const access = await getFarmAccess(userId, farmId);
  if (!access) {
    throw new Error('Unauthorized');
  }

  if (!canMemberPerform(access.member, 'farm:manage')) {
    throw new Error('Forbidden');
  }

  return prisma.farm.update({
    where: { id: farmId },
    data: {
      ...data,
      name: data.name?.trim(),
      slug: data.slug?.trim() || undefined,
    },
  });
}

export async function deleteFarm(farmId: string, userId: string) {
  const access = await getFarmAccess(userId, farmId);
  if (!access) {
    throw new Error('Unauthorized');
  }

  if (access.member.role.rank < 100) {
    throw new Error('Forbidden');
  }

  return prisma.farm.delete({
    where: { id: farmId },
  });
}

export async function listFarmMembers(farmId: string, userId: string) {
  const access = await getFarmAccess(userId, farmId);
  if (!access) {
    throw new Error('Unauthorized');
  }

  if (!canMemberPerform(access.member, 'member:read')) {
    throw new Error('Forbidden');
  }

  return prisma.farmMember.findMany({
    where: { farmId },
    include: {
      role: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
        },
      },
      invitedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: [{ status: 'asc' }, { rank: 'desc' }, { createdAt: 'asc' }],
  });
}

export async function getAssignableFarmRoles(farmId: string, userId: string) {
  const access = await getFarmAccess(userId, farmId);
  if (!access) {
    throw new Error('Unauthorized');
  }

  if (!canMemberPerform(access.member, 'member:invite')) {
    throw new Error('Forbidden');
  }

  return getAssignableRolesForRank(
    await prisma.farmRole.findMany({ where: { farmId }, orderBy: { rank: 'desc' } }),
    access.member.role.rank
  );
}

export async function inviteFarmMember(input: InviteFarmMemberInput) {
  const access = await getFarmAccess(input.inviterId, input.farmId);
  if (!access) {
    throw new Error('Unauthorized');
  }

  if (!canMemberPerform(access.member, 'member:invite')) {
    throw new Error('Forbidden');
  }

  const role = await prisma.farmRole.findFirst({
    where: {
      id: input.roleId,
      farmId: input.farmId,
    },
  });

  if (!role) {
    throw new Error('Role not found');
  }

  if (role.rank >= access.member.role.rank) {
    throw new Error('Cannot assign a role equal to or higher than your own rank');
  }

  const invitedEmail = normalizeEmail(input.invitedEmail);
  const token = generateInvitationToken();
  const invitationTokenHash = hashInvitationToken(token);
  const invitationExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const member = await prisma.farmMember.upsert({
    where: {
      farmId_invitedEmail: {
        farmId: input.farmId,
        invitedEmail,
      },
    },
    update: {
      roleId: role.id,
      invitedById: input.inviterId,
      invitationTokenHash,
      invitationExpiresAt,
      status: 'PENDING',
      rank: role.rank,
      acceptedAt: null,
      rejectedAt: null,
    },
    create: {
      farmId: input.farmId,
      invitedEmail,
      invitedById: input.inviterId,
      roleId: role.id,
      invitationTokenHash,
      invitationExpiresAt,
      status: 'PENDING',
      rank: role.rank,
    },
    include: {
      role: true,
      farm: true,
      invitedBy: true,
    },
  });

  await sendFarmInvitationEmail({
    farmName: access.farm.name,
    inviterName: access.member.user?.name || 'A farm member',
    invitedEmail,
    roleName: role.name,
    token,
    farmId: input.farmId,
  });

  return {
    member,
    token,
  };
}

export async function findInvitationByToken(token: string) {
  const tokenHash = hashInvitationToken(token);

  return prisma.farmMember.findFirst({
    where: {
      invitationTokenHash: tokenHash,
      status: 'PENDING',
      invitationExpiresAt: {
        gt: new Date(),
      },
    },
    include: {
      farm: {
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
      role: true,
      invitedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
}

export async function acceptFarmInvitation(input: AcceptFarmInvitationInput) {
  const invitation = await findInvitationByToken(input.token);

  if (!invitation) {
    throw new Error('Invitation not found or expired');
  }

  const existingMember = await prisma.farmMember.findFirst({
    where: {
      farmId: invitation.farmId,
      userId: input.userId,
      status: 'ACTIVE',
    },
    include: {
      role: true,
    },
  });

  if (existingMember) {
    await prisma.farmMember.delete({ where: { id: invitation.id } });
    return existingMember;
  }

  return prisma.farmMember.update({
    where: { id: invitation.id },
    data: {
      userId: input.userId,
      status: 'ACTIVE',
      acceptedAt: new Date(),
      invitationTokenHash: null,
      invitationExpiresAt: null,
      rejectedAt: null,
    },
    include: {
      farm: true,
      role: true,
      user: true,
    },
  });
}

export async function updateFarmMemberRole(farmId: string, actorId: string, memberId: string, roleId: string) {
  const access = await getFarmAccess(actorId, farmId);
  if (!access) {
    throw new Error('Unauthorized');
  }

  if (!canMemberPerform(access.member, 'member:manage')) {
    throw new Error('Forbidden');
  }

  const targetMember = await prisma.farmMember.findUnique({
    where: { id: memberId },
    include: { role: true },
  });

  if (!targetMember || targetMember.farmId !== farmId) {
    throw new Error('Member not found');
  }

  const nextRole = await prisma.farmRole.findFirst({ where: { id: roleId, farmId } });
  if (!nextRole) {
    throw new Error('Role not found');
  }

  if (nextRole.rank >= access.member.role.rank) {
    throw new Error('Cannot assign a role equal to or higher than your own rank');
  }

  return prisma.farmMember.update({
    where: { id: memberId },
    data: {
      roleId: nextRole.id,
      rank: nextRole.rank,
    },
    include: {
      role: true,
      user: true,
      invitedBy: true,
    },
  });
}

export async function removeFarmMember(farmId: string, actorId: string, memberId: string) {
  const access = await getFarmAccess(actorId, farmId);
  if (!access) {
    throw new Error('Unauthorized');
  }

  if (!canMemberPerform(access.member, 'member:manage')) {
    throw new Error('Forbidden');
  }

  const targetMember = await prisma.farmMember.findUnique({
    where: { id: memberId },
    include: { role: true },
  });

  if (!targetMember || targetMember.farmId !== farmId) {
    throw new Error('Member not found');
  }

  if (targetMember.role.rank >= access.member.role.rank) {
    throw new Error('Cannot remove a member with equal or higher rank');
  }

  return prisma.farmMember.delete({ where: { id: memberId } });
}

export async function getCurrentFarmPermissions(userId: string, farmId: string) {
  const access = await getFarmAccess(userId, farmId);
  if (!access) {
    return null;
  }

  const permissions = new Set<string>(access.member.role.permissions);
  const defaults = FARM_ROLE_SEEDS.find((seed) => seed.key === access.member.role.key);

  if (defaults) {
    for (const permission of defaults.permissions) {
      permissions.add(permission);
    }
  }

  return {
    farm: access.farm,
    member: access.member,
    role: access.member.role,
    permissions: Array.from(permissions),
  };
}

export async function ensureFarmRoleSeedData(farmId: string) {
  const existingCount = await prisma.farmRole.count({ where: { farmId } });
  if (existingCount > 0) {
    return;
  }

  await prisma.farmRole.createMany({
    data: FARM_ROLE_SEEDS.map((role) => ({
      farmId,
      key: role.key,
      name: role.name,
      rank: role.rank,
      permissions: role.permissions,
      isSystem: role.isSystem,
    })),
  });
}
