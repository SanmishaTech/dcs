-- Migrate color from CrackIdentification to DesignStroke, then drop column

-- 1) Copy color from crack to related strokes where stroke has no color yet
UPDATE `DesignStroke` ds
JOIN `CrackIdentification` ci ON ci.id = ds.crackIdentificationId
SET ds.color = COALESCE(ds.color, ci.color)
WHERE ci.color IS NOT NULL;

-- 2) Drop color column from CrackIdentification
ALTER TABLE `CrackIdentification` DROP COLUMN `color`;
