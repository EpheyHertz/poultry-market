/**
 * Blog Search — Zod Validation Schemas
 */

import { z } from 'zod';

/** Query params for GET /api/blogs/search */
export const keywordSearchSchema = z.object({
  q: z
    .string({ required_error: 'Query parameter "q" is required' })
    .min(1, 'Query must not be empty')
    .max(200, 'Query too long'),
  limit: z.coerce
    .number()
    .int()
    .min(1, 'Limit must be at least 1')
    .max(20, 'Limit cannot exceed 20')
    .optional()
    .default(10),
});

/** Body for POST /api/external/blogs/search/semantic */
export const semanticSearchSchema = z.object({
  query: z
    .string({ required_error: 'Field "query" is required' })
    .min(1, 'Query must not be empty')
    .max(500, 'Query too long'),
  limit: z
    .number()
    .int()
    .min(1, 'Limit must be at least 1')
    .max(20, 'Limit cannot exceed 20')
    .optional()
    .default(5),
});

export type KeywordSearchInput = z.infer<typeof keywordSearchSchema>;
export type SemanticSearchInput = z.infer<typeof semanticSearchSchema>;
