-- Email / Subscription system upgrade (additive, non-destructive)
-- Adds double opt-in verification, topic preferences, campaigns and delivery tracking.

-- 1. Enums -----------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE "SubscriberStatus" AS ENUM ('PENDING', 'ACTIVE', 'UNSUBSCRIBED', 'BOUNCED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "SubscriberFrequency" AS ENUM ('EVERY_POST', 'WEEKLY_DIGEST', 'IMPORTANT_ONLY');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "EmailCampaignType" AS ENUM ('BLOG_NOTIFICATION', 'WEEKLY_DIGEST', 'NEWSLETTER', 'ANNOUNCEMENT', 'USER_BROADCAST');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "EmailCampaignStatus" AS ENUM ('DRAFT', 'QUEUED', 'SENDING', 'SENT', 'PARTIALLY_FAILED', 'FAILED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "EmailDeliveryStatus" AS ENUM ('PENDING', 'SENDING', 'SENT', 'FAILED', 'SKIPPED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2. Extend blog_subscribers ----------------------------------------------
ALTER TABLE "blog_subscribers"
  ADD COLUMN IF NOT EXISTS "status" "SubscriberStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS "verificationTokenHash" TEXT,
  ADD COLUMN IF NOT EXISTS "verificationSentAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "verificationExpiresAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "verificationCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "verifiedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "manageTokenHash" TEXT,
  ADD COLUMN IF NOT EXISTS "topics" "BlogPostCategory"[] NOT NULL DEFAULT ARRAY[]::"BlogPostCategory"[],
  ADD COLUMN IF NOT EXISTS "allTopics" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "frequency" "SubscriberFrequency" NOT NULL DEFAULT 'EVERY_POST',
  ADD COLUMN IF NOT EXISTS "unsubscribedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "resubscribedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "source" TEXT,
  ADD COLUMN IF NOT EXISTS "lastEmailSentAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "emailsSent" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "bounceCount" INTEGER NOT NULL DEFAULT 0;

-- Normalise existing emails (trim + lowercase) so the unique index is reliable.
UPDATE "blog_subscribers" SET "email" = lower(btrim("email")) WHERE "email" <> lower(btrim("email"));

-- Grandfather existing subscribers: anyone already stored is treated as a
-- verified opt-in so we never re-spam or lose them.
UPDATE "blog_subscribers"
SET "status" = CASE WHEN "isActive" THEN 'ACTIVE'::"SubscriberStatus" ELSE 'UNSUBSCRIBED'::"SubscriberStatus" END,
    "verifiedAt" = COALESCE("verifiedAt", "createdAt"),
    "unsubscribedAt" = CASE WHEN "isActive" THEN "unsubscribedAt" ELSE COALESCE("unsubscribedAt", "updatedAt") END,
    "source" = COALESCE("source", 'legacy');

-- Migrate legacy JSON categoryUpdates -> topics[]; empty -> allTopics = true.
UPDATE "blog_subscribers" AS s
SET "topics" = sub.arr,
    "allTopics" = false
FROM (
  SELECT b."id",
         ARRAY(
           SELECT (elem #>> '{}')::"BlogPostCategory"
           FROM jsonb_array_elements(b."categoryUpdates"::jsonb) AS elem
           WHERE (elem #>> '{}') IN (
             'FARMING_TIPS','POULTRY_HEALTH','FEED_NUTRITION','EQUIPMENT_GUIDES','MARKET_TRENDS',
             'SUCCESS_STORIES','INDUSTRY_NEWS','SEASONAL_ADVICE','BEGINNER_GUIDES','ADVANCED_TECHNIQUES'
           )
         ) AS arr
  FROM "blog_subscribers" b
  WHERE b."categoryUpdates" IS NOT NULL
    AND b."categoryUpdates" <> ''
    AND b."categoryUpdates" ~ '^\s*\['
) AS sub
WHERE s."id" = sub."id" AND array_length(sub.arr, 1) > 0;

CREATE UNIQUE INDEX IF NOT EXISTS "blog_subscribers_verificationTokenHash_key" ON "blog_subscribers"("verificationTokenHash");
CREATE UNIQUE INDEX IF NOT EXISTS "blog_subscribers_manageTokenHash_key" ON "blog_subscribers"("manageTokenHash");
CREATE INDEX IF NOT EXISTS "blog_subscribers_status_idx" ON "blog_subscribers"("status");
CREATE INDEX IF NOT EXISTS "blog_subscribers_status_allTopics_idx" ON "blog_subscribers"("status", "allTopics");
CREATE INDEX IF NOT EXISTS "blog_subscribers_verifiedAt_idx" ON "blog_subscribers"("verifiedAt");

-- 3. subscriber_events -----------------------------------------------------
CREATE TABLE IF NOT EXISTS "subscriber_events" (
  "id" TEXT NOT NULL,
  "subscriberId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "actorType" TEXT NOT NULL DEFAULT 'subscriber',
  "actorId" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "subscriber_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "subscriber_events_subscriberId_createdAt_idx" ON "subscriber_events"("subscriberId", "createdAt");
CREATE INDEX IF NOT EXISTS "subscriber_events_type_createdAt_idx" ON "subscriber_events"("type", "createdAt");

DO $$ BEGIN
  ALTER TABLE "subscriber_events"
    ADD CONSTRAINT "subscriber_events_subscriberId_fkey"
    FOREIGN KEY ("subscriberId") REFERENCES "blog_subscribers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 4. email_campaigns -------------------------------------------------------
CREATE TABLE IF NOT EXISTS "email_campaigns" (
  "id" TEXT NOT NULL,
  "type" "EmailCampaignType" NOT NULL,
  "status" "EmailCampaignStatus" NOT NULL DEFAULT 'DRAFT',
  "subject" TEXT NOT NULL,
  "previewText" TEXT,
  "content" TEXT NOT NULL,
  "ctaLabel" TEXT,
  "ctaUrl" TEXT,
  "imageUrl" TEXT,
  "audience" JSONB NOT NULL,
  "topics" "BlogPostCategory"[] NOT NULL DEFAULT ARRAY[]::"BlogPostCategory"[],
  "blogPostId" TEXT,
  "senderAccount" TEXT NOT NULL DEFAULT 'blog',
  "senderName" TEXT,
  "totalRecipients" INTEGER NOT NULL DEFAULT 0,
  "sentCount" INTEGER NOT NULL DEFAULT 0,
  "failedCount" INTEGER NOT NULL DEFAULT 0,
  "createdById" TEXT,
  "queuedAt" TIMESTAMP(3),
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "email_campaigns_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "email_campaigns_blogPostId_type_key" ON "email_campaigns"("blogPostId", "type");
CREATE INDEX IF NOT EXISTS "email_campaigns_status_createdAt_idx" ON "email_campaigns"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "email_campaigns_type_createdAt_idx" ON "email_campaigns"("type", "createdAt");

-- 5. email_deliveries ------------------------------------------------------
CREATE TABLE IF NOT EXISTS "email_deliveries" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "subscriberId" TEXT,
  "userId" TEXT,
  "email" TEXT NOT NULL,
  "recipientName" TEXT,
  "status" "EmailDeliveryStatus" NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "providerMessageId" TEXT,
  "error" TEXT,
  "sentAt" TIMESTAMP(3),
  "lastAttemptAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "email_deliveries_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "email_deliveries_campaignId_email_key" ON "email_deliveries"("campaignId", "email");
CREATE INDEX IF NOT EXISTS "email_deliveries_status_createdAt_idx" ON "email_deliveries"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "email_deliveries_campaignId_status_idx" ON "email_deliveries"("campaignId", "status");
CREATE INDEX IF NOT EXISTS "email_deliveries_subscriberId_idx" ON "email_deliveries"("subscriberId");

DO $$ BEGIN
  ALTER TABLE "email_deliveries"
    ADD CONSTRAINT "email_deliveries_campaignId_fkey"
    FOREIGN KEY ("campaignId") REFERENCES "email_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "email_deliveries"
    ADD CONSTRAINT "email_deliveries_subscriberId_fkey"
    FOREIGN KEY ("subscriberId") REFERENCES "blog_subscribers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 6. email_settings --------------------------------------------------------
CREATE TABLE IF NOT EXISTS "email_settings" (
  "key" TEXT NOT NULL,
  "value" JSONB NOT NULL,
  "updatedById" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "email_settings_pkey" PRIMARY KEY ("key")
);
