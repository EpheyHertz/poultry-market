import { z } from 'zod';

export const eggRecordCreateSchema = z.object({
  flockId: z.string().optional().nullable(),
  recordedOn: z.string().datetime().optional(),
  quantity: z.number().int().min(0),
  damagedCount: z.number().int().min(0).optional().default(0),
  notes: z.string().max(2000).optional().nullable(),
});

export const eggRecordUpdateSchema = eggRecordCreateSchema.partial();

export const flockCreateSchema = z.object({
  name: z.string().min(1).max(120),
  breed: z.string().max(120).optional().nullable(),
  birdCount: z.number().int().min(0).optional().default(0),
  acquiredAt: z.string().datetime().optional().nullable(),
  status: z.enum(['ACTIVE', 'ARCHIVED']).optional().default('ACTIVE'),
  notes: z.string().max(2000).optional().nullable(),
});

export const flockUpdateSchema = flockCreateSchema.partial();

export const feedRecordCreateSchema = z.object({
  flockId: z.string().optional().nullable(),
  recordedOn: z.string().datetime().optional(),
  feedType: z.string().min(1).max(120),
  quantityKg: z.number().min(0),
  cost: z.number().min(0).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export const feedRecordUpdateSchema = feedRecordCreateSchema.partial();

export const mortalityRecordCreateSchema = z.object({
  flockId: z.string().optional().nullable(),
  recordedOn: z.string().datetime().optional(),
  count: z.number().int().min(0),
  cause: z.string().max(200).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export const mortalityRecordUpdateSchema = mortalityRecordCreateSchema.partial();

export const vaccinationCreateSchema = z.object({
  flockId: z.string().optional().nullable(),
  vaccineName: z.string().min(1).max(120),
  scheduledDate: z.string().datetime(),
  administeredDate: z.string().datetime().optional().nullable(),
  status: z.enum(['SCHEDULED', 'COMPLETED', 'MISSED']).optional().default('SCHEDULED'),
  notes: z.string().max(2000).optional().nullable(),
});

export const vaccinationUpdateSchema = vaccinationCreateSchema.partial();

export const eggAnalyticsQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  groupBy: z.enum(['day', 'week', 'month']).optional().default('day'),
});
