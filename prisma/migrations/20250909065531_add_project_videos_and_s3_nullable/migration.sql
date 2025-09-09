/*
  Warnings:

  - You are about to drop the column `filename` on the `ProjectFile` table. All the data in the column will be lost.
  - You are about to drop the column `url` on the `ProjectFile` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `ProjectFile` DROP COLUMN `filename`,
    DROP COLUMN `url`;

-- CreateTable
CREATE TABLE `ProjectVideo` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `projectId` INTEGER NOT NULL,
    `uploadedById` INTEGER NULL,
    `originalName` VARCHAR(191) NOT NULL,
    `mimeType` VARCHAR(191) NOT NULL,
    `size` INTEGER NOT NULL,
    `storageKey` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ProjectVideo_projectId_idx`(`projectId`),
    INDEX `ProjectVideo_mimeType_idx`(`mimeType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ProjectVideo` ADD CONSTRAINT `ProjectVideo_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProjectVideo` ADD CONSTRAINT `ProjectVideo_uploadedById_fkey` FOREIGN KEY (`uploadedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
