-- AlterTable
ALTER TABLE "users" ADD COLUMN     "deliveryCounties" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "deliveryFeePerKm" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "deliveryProvinces" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "minOrderForFreeDelivery" DOUBLE PRECISION,
ADD COLUMN     "offersDelivery" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "offersFreeDelivery" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "offersPayAfterDelivery" BOOLEAN NOT NULL DEFAULT false;
