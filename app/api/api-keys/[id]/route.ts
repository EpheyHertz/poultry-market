import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

type RouteContext = {
  params: Promise<{ id: string }>;
};

const updateSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

export async function PATCH(request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success || !parsed.data.status) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const apiKey = await prisma.apiKey.findFirst({
    where: { id, userId: user.id },
  });

  if (!apiKey) {
    return NextResponse.json({ error: 'API key not found' }, { status: 404 });
  }

  if (apiKey.status === 'REVOKED') {
    return NextResponse.json({ error: 'Cannot modify a revoked key' }, { status: 400 });
  }

  const updated = await prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { status: parsed.data.status },
  });

  return NextResponse.json({
    id: updated.id,
    name: updated.name,
    status: updated.status,
    lastUsedAt: updated.lastUsedAt,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
  });
}

export async function DELETE(request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;

  const apiKey = await prisma.apiKey.findFirst({
    where: { id, userId: user.id },
  });

  if (!apiKey) {
    return NextResponse.json({ error: 'API key not found' }, { status: 404 });
  }

  const revoked = await prisma.apiKey.update({
    where: { id: apiKey.id },
    data: {
      status: 'REVOKED',
      revokedAt: new Date(),
    },
  });

  return NextResponse.json({
    id: revoked.id,
    status: revoked.status,
    revokedAt: revoked.revokedAt,
  });
}
