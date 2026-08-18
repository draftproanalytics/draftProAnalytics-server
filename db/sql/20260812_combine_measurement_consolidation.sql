-- DraftProAnalytics: consolidate Prospect physical/combine measurements into CombineScore.
-- MySQL 8.0. Run this before deploying the matching Prisma/client/server code.
-- This migration intentionally keeps a backup table for rollback/verification.

START TRANSACTION;

CREATE TABLE IF NOT EXISTS ProspectMeasurementBackup_20260812 AS
SELECT
  id AS prospectId,
  height,
  weight,
  handSize,
  armLength,
  fortyTime,
  tenYardSplit,
  verticalLeap,
  broadJump,
  threeCone,
  twentyYardShuttle,
  benchPress
FROM Prospect;

ALTER TABLE CombineScore
  ADD COLUMN height FLOAT NULL,
  ADD COLUMN weight FLOAT NULL,
  ADD COLUMN handSize FLOAT NULL,
  ADD COLUMN armLength FLOAT NULL,
  ADD COLUMN benchPress INT NULL;

-- Populate existing CombineScore rows. Existing CombineScore drill values win;
-- physical measurements and bench press come from Prospect when available.
UPDATE CombineScore cs
JOIN Prospect p ON p.id = cs.prospectId
SET
  cs.height = COALESCE(cs.height, NULLIF(p.height, 0)),
  cs.weight = COALESCE(cs.weight, NULLIF(p.weight, 0)),
  cs.handSize = COALESCE(cs.handSize, p.handSize),
  cs.armLength = COALESCE(cs.armLength, p.armLength),
  cs.fortyTime = COALESCE(cs.fortyTime, p.fortyTime),
  cs.tenYardSplit = COALESCE(cs.tenYardSplit, p.tenYardSplit),
  cs.verticalLeap = COALESCE(cs.verticalLeap, p.verticalLeap),
  cs.broadJump = COALESCE(cs.broadJump, p.broadJump),
  cs.threeCone = COALESCE(cs.threeCone, p.threeCone),
  cs.twentyYardShuttle = COALESCE(cs.twentyYardShuttle, p.twentyYardShuttle),
  cs.benchPress = COALESCE(cs.benchPress, p.benchPress);

-- Create CombineScore rows for prospects that have measurements but no row yet.
INSERT INTO CombineScore (
  prospectId,
  height,
  weight,
  handSize,
  armLength,
  fortyTime,
  tenYardSplit,
  verticalLeap,
  broadJump,
  threeCone,
  twentyYardShuttle,
  benchPress
)
SELECT
  p.id,
  NULLIF(p.height, 0),
  NULLIF(p.weight, 0),
  p.handSize,
  p.armLength,
  p.fortyTime,
  p.tenYardSplit,
  p.verticalLeap,
  p.broadJump,
  p.threeCone,
  p.twentyYardShuttle,
  p.benchPress
FROM Prospect p
LEFT JOIN CombineScore cs ON cs.prospectId = p.id
WHERE cs.id IS NULL
  AND (
    NULLIF(p.height, 0) IS NOT NULL OR
    NULLIF(p.weight, 0) IS NOT NULL OR
    p.handSize IS NOT NULL OR
    p.armLength IS NOT NULL OR
    p.fortyTime IS NOT NULL OR
    p.tenYardSplit IS NOT NULL OR
    p.verticalLeap IS NOT NULL OR
    p.broadJump IS NOT NULL OR
    p.threeCone IS NOT NULL OR
    p.twentyYardShuttle IS NOT NULL OR
    p.benchPress IS NOT NULL
  );

-- Abort before destructive column removal if any meaningful legacy value failed to land.
DROP PROCEDURE IF EXISTS verify_prospect_measurement_backfill_20260812;
DELIMITER $$
CREATE PROCEDURE verify_prospect_measurement_backfill_20260812()
BEGIN
  DECLARE missing_count INT DEFAULT 0;

  SELECT COUNT(*) INTO missing_count
  FROM Prospect p
  LEFT JOIN CombineScore cs ON cs.prospectId = p.id
  WHERE
    (NULLIF(p.height, 0) IS NOT NULL AND cs.height IS NULL) OR
    (NULLIF(p.weight, 0) IS NOT NULL AND cs.weight IS NULL) OR
    (p.handSize IS NOT NULL AND cs.handSize IS NULL) OR
    (p.armLength IS NOT NULL AND cs.armLength IS NULL) OR
    (p.fortyTime IS NOT NULL AND cs.fortyTime IS NULL) OR
    (p.tenYardSplit IS NOT NULL AND cs.tenYardSplit IS NULL) OR
    (p.verticalLeap IS NOT NULL AND cs.verticalLeap IS NULL) OR
    (p.broadJump IS NOT NULL AND cs.broadJump IS NULL) OR
    (p.threeCone IS NOT NULL AND cs.threeCone IS NULL) OR
    (p.twentyYardShuttle IS NOT NULL AND cs.twentyYardShuttle IS NULL) OR
    (p.benchPress IS NOT NULL AND cs.benchPress IS NULL);

  IF missing_count > 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'CombineScore backfill verification failed; Prospect measurement columns were NOT dropped.';
  END IF;
END$$
DELIMITER ;

CALL verify_prospect_measurement_backfill_20260812();
DROP PROCEDURE verify_prospect_measurement_backfill_20260812;

ALTER TABLE Prospect
  DROP COLUMN height,
  DROP COLUMN weight,
  DROP COLUMN handSize,
  DROP COLUMN armLength,
  DROP COLUMN fortyTime,
  DROP COLUMN tenYardSplit,
  DROP COLUMN verticalLeap,
  DROP COLUMN broadJump,
  DROP COLUMN threeCone,
  DROP COLUMN twentyYardShuttle,
  DROP COLUMN benchPress;

COMMIT;

-- Keep ProspectMeasurementBackup_20260812 until application validation is complete.
-- It may be dropped manually after verification and backup retention requirements are satisfied.
