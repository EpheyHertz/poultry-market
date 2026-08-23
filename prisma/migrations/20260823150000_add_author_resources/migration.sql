-- Author recommended / affiliate resources
--
-- Adds two tables:
--   author_resources          — one row per recommendation curated by an author
--   author_resource_articles  — explicit join so a resource only appears on the
--                               articles the author deliberately linked it to
--
-- Metadata (title/description/image/domain/merchant) is resolved once when the
-- author saves the resource and stored here, so rendering a public author
-- profile never makes an outbound request to the merchant.

-- CreateTable
CREATE TABLE "author_resources" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "url" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "merchant" TEXT,
    "isAffiliate" BOOLEAN NOT NULL DEFAULT false,
    "affiliateDisclosure" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "clickCount" INTEGER NOT NULL DEFAULT 0,
    "metadataFetchedAt" TIMESTAMP(3),
    "metadataResolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "author_resources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "author_resource_articles" (
    "id" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "author_resource_articles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "author_resources_profileId_isActive_displayOrder_idx" ON "author_resources"("profileId", "isActive", "displayOrder");

-- CreateIndex
CREATE INDEX "author_resource_articles_postId_idx" ON "author_resource_articles"("postId");

-- CreateIndex
CREATE UNIQUE INDEX "author_resource_articles_resourceId_postId_key" ON "author_resource_articles"("resourceId", "postId");

-- AddForeignKey
ALTER TABLE "author_resources" ADD CONSTRAINT "author_resources_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "author_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "author_resource_articles" ADD CONSTRAINT "author_resource_articles_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "author_resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "author_resource_articles" ADD CONSTRAINT "author_resource_articles_postId_fkey" FOREIGN KEY ("postId") REFERENCES "blog_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
