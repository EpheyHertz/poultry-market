import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createApiKey, maskApiKey } from '@/lib/api-keys';

const createKeySchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters').max(50, 'Name too long'),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const keys = await prisma.apiKey.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(
    keys.map((key) => ({
      id: key.id,
      name: key.name,
      status: key.status,
      lastUsedAt: key.lastUsedAt,
      createdAt: key.createdAt,
      updatedAt: key.updatedAt,
      lastFour: key.lastFour,
      maskedKey: maskApiKey(key.lastFour),
    })),
  );
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createKeySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.apiKey.findFirst({
    where: { userId: user.id, name: parsed.data.name },
  });

  if (existing) {
    return NextResponse.json({ error: 'An API key with this name already exists' }, { status: 409 });
  }

  const { apiKey, rawKey } = await createApiKey({
    userId: user.id,
    name: parsed.data.name,
  });

  return NextResponse.json({
    apiKey: {
      id: apiKey.id,
      name: apiKey.name,
      status: apiKey.status,
      createdAt: apiKey.createdAt,
      maskedKey: maskApiKey(apiKey.lastFour),
    },
    token: rawKey,
  });
}
