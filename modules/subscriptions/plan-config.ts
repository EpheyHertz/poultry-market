import type { SubscriptionPlan } from '@prisma/client';

export type SubscriptionFeature = 'import_data' | 'upload_attachment' | 'advanced_analytics';

export interface SubscriptionPlanLimit {
  canImportData: boolean;
  canUploadAttachment: boolean;
  hasAdvancedAnalytics: boolean;
  maxAttachments: number;
  maxMonthlyImports: number;
  maxImportRowsPerFile: number;
  maxAttachmentSizeBytes: number;
}

export const PLAN_LIMITS: Record<SubscriptionPlan, SubscriptionPlanLimit> = {
  FREE: {
    canImportData: false,
    canUploadAttachment: false,
    hasAdvancedAnalytics: false,
    maxAttachments: 0,
    maxMonthlyImports: 0,
    maxImportRowsPerFile: 0,
    maxAttachmentSizeBytes: 0,
  },
  BASIC: {
    canImportData: true,
    canUploadAttachment: true,
    hasAdvancedAnalytics: false,
    maxAttachments: 50,
    maxMonthlyImports: 5,
    maxImportRowsPerFile: 500,
    maxAttachmentSizeBytes: 5 * 1024 * 1024,
  },
  PRO: {
    canImportData: true,
    canUploadAttachment: true,
    hasAdvancedAnalytics: true,
    maxAttachments: 500,
    maxMonthlyImports: 50,
    maxImportRowsPerFile: 5000,
    maxAttachmentSizeBytes: 15 * 1024 * 1024,
  },
  ENTERPRISE: {
    canImportData: true,
    canUploadAttachment: true,
    hasAdvancedAnalytics: true,
    maxAttachments: 5000,
    maxMonthlyImports: 500,
    maxImportRowsPerFile: 50000,
    maxAttachmentSizeBytes: 25 * 1024 * 1024,
  },
};

export const PLAN_PRICE_KES: Record<Exclude<SubscriptionPlan, 'FREE'>, number> = {
  BASIC: 500,
  PRO: 1500,
  ENTERPRISE: 5000,
};

export const PLAN_DURATION_DAYS: Record<Exclude<SubscriptionPlan, 'FREE'>, number> = {
  BASIC: 30,
  PRO: 30,
  ENTERPRISE: 365,
};

export const FEATURE_LABELS: Record<SubscriptionFeature, string> = {
  import_data: 'Data Import',
  upload_attachment: 'Attachments',
  advanced_analytics: 'Advanced Analytics',
};
