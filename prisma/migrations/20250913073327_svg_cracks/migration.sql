-- CreateTable
CREATE TABLE `DesignStroke` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `projectId` INTEGER NOT NULL,
    `crackIdentificationId` INTEGER NOT NULL,
    `path` VARCHAR(191) NOT NULL,
    `thickness` DOUBLE NOT NULL DEFAULT 2,
    `color` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `DesignStroke_projectId_idx`(`projectId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `DesignStroke` ADD CONSTRAINT `DesignStroke_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DesignStroke` ADD CONSTRAINT `DesignStroke_crackIdentificationId_fkey` FOREIGN KEY (`crackIdentificationId`) REFERENCES `CrackIdentification`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
