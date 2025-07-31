/*
  Warnings:

  - Added the required column `updatedAt` to the `chat_messages` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "chat_messages" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deliveredAt" TIMESTAMP(3),
ADD COLUMN     "editedAt" TIMESTAMP(3),
ADD COLUMN     "files" TEXT[],
ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isEdited" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "readAt" TIMESTAMP(3),
ADD COLUMN     "replyToId" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_replyToId_fkey" FOREIGN KEY ("replyToId") REFERENCES "chat_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
