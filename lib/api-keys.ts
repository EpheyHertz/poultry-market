import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from './prisma';
import { User } from '@prisma/client';

const API_KEY_PREFIX = 'pk';
const API_KEY_ENV = process.env.NODE_ENV === 'production' ? 'live' : 'test';

export type ApiKeyStatus = 'ACTIVE' | 'INACTIVE' | 'REVOKED';

export interface ParsedApiKey {
  id: string;
  secret: string;
}

export function maskApiKey(lastFour: string) {
  return `••••${lastFour}`;
}

function generateSecret() {
  return crypto.randomBytes(24).toString('hex');
}

function buildApiKey(id: string, secret: string) {
  return `${API_KEY_PREFIX}_${API_KEY_ENV}_${id}_${secret}`;
}

export function parseApiKey(rawKey: string): ParsedApiKey | null {
  const parts = rawKey?.split('_');
  if (!parts || parts.length !== 4) return null;

  const [prefix, env, id, secret] = parts;
  if (prefix !== API_KEY_PREFIX || !env || !id || !secret) {
    return null;
  }

  return { id, secret };
}

export async function createApiKey({
  userId,
  name,
}: {
  userId: string;
  name: string;
}) {
  const secret = generateSecret();
  const hashedSecret = await bcrypt.hash(secret, 12);

  const apiKey = await prisma.apiKey.create({
    data: {
      userId,
      name,
      hashedKey: hashedSecret,
      lastFour: secret.slice(-4),
    },
  });

  const rawKey = buildApiKey(apiKey.id, secret);
  return { apiKey, rawKey };
}

export async function authenticateApiKey(rawKey?: string) {
  if (!rawKey) return null;

  const parsed = parseApiKey(rawKey);
  if (!parsed) return null;

  const apiKey = await prisma.apiKey.findUnique({
    where: { id: parsed.id },
    include: {
      user: true,
    },
  });

  if (!apiKey || apiKey.status !== 'ACTIVE') {
    return null;
  }

  const isValid = await bcrypt.compare(parsed.secret, apiKey.hashedKey);
  if (!isValid) {
    return null;
  }

  await prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  });

  return { apiKey, user: apiKey.user as User };
}
