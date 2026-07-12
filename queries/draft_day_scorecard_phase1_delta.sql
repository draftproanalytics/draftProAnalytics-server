-- ============================================================
-- DraftProAnalytics - Draft Day Scorecard Phase 1 Delta DDL
-- Source of truth: existing MySQL database + uploaded schema.prisma
--
-- Goal:
-- - Do NOT recreate DraftPick
-- - Create missing Draft Day Scorecard tables if absent
-- - Add missing DraftPick columns if absent
-- - Backfill DraftEvent and DraftPick linkage
-- - Backfill pickInRound
-- - Sync used/status
-- - Add missing indexes and constraints
-- ============================================================

SET @current_database = DATABASE();

-- ============================================================
-- Helper procedures
-- ============================================================

DROP PROCEDURE IF EXISTS dpa_add_column_if_missing;
DROP PROCEDURE IF EXISTS dpa_add_index_if_missing;
DROP PROCEDURE IF EXISTS dpa_add_constraint_if_missing;

DELIMITER $$

CREATE PROCEDURE dpa_add_column_if_missing(
  IN p_table_name VARCHAR(128),
  IN p_column_name VARCHAR(128),
  IN p_column_ddl TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = p_table_name
      AND COLUMN_NAME = p_column_name
  ) THEN
    SET @ddl = CONCAT('ALTER TABLE `', p_table_name, '` ADD COLUMN ', p_column_ddl);
    PREPARE stmt FROM @ddl;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END$$

CREATE PROCEDURE dpa_add_index_if_missing(
  IN p_table_name VARCHAR(128),
  IN p_index_name VARCHAR(128),
  IN p_index_ddl TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = p_table_name
      AND INDEX_NAME = p_index_name
  ) THEN
    SET @ddl = CONCAT('ALTER TABLE `', p_table_name, '` ADD ', p_index_ddl);
    PREPARE stmt FROM @ddl;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END$$

CREATE PROCEDURE dpa_add_constraint_if_missing(
  IN p_table_name VARCHAR(128),
  IN p_constraint_name VARCHAR(128),
  IN p_constraint_ddl TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = p_table_name
      AND CONSTRAINT_NAME = p_constraint_name
  ) THEN
    SET @ddl = CONCAT('ALTER TABLE `', p_table_name, '` ADD CONSTRAINT ', p_constraint_ddl);
    PREPARE stmt FROM @ddl;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END$$

DELIMITER ;

-- ============================================================
-- 1. Create DraftEvent if missing
-- Matches uploaded schema.prisma model DraftEvent
-- ============================================================

CREATE TABLE IF NOT EXISTS `DraftEvent` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `draftYear` INT NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `leagueCode` VARCHAR(20) NOT NULL DEFAULT 'NFL',
  `status` ENUM('PLANNED', 'ACTIVE', 'COMPLETED', 'ARCHIVED') NOT NULL DEFAULT 'PLANNED',
  `startsAt` DATETIME(0) NULL,
  `endsAt` DATETIME(0) NULL,
  `createdAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_draft_event_year_league` (`draftYear`, `leagueCode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CALL dpa_add_index_if_missing(
  'DraftEvent',
  'idx_DraftEvent_draftYear',
  'INDEX `idx_DraftEvent_draftYear` (`draftYear`)'
);

CALL dpa_add_index_if_missing(
  'DraftEvent',
  'idx_DraftEvent_status',
  'INDEX `idx_DraftEvent_status` (`status`)'
);

-- ============================================================
-- 2. Create DraftTeamScorecard if missing
-- Matches uploaded schema.prisma model DraftTeamScorecard
-- ============================================================

CREATE TABLE IF NOT EXISTS `DraftTeamScorecard` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `draftEventId` INT NOT NULL,
  `teamId` INT NOT NULL,
  `preDraftNeeds` JSON NULL,
  `strategyNotes` TEXT NULL,
  `totalPicks` INT NOT NULL DEFAULT 0,
  `pickedCount` INT NOT NULL DEFAULT 0,
  `overallGrade` DECIMAL(5,2) NULL,
  `valueGrade` DECIMAL(5,2) NULL,
  `needsFitGrade` DECIMAL(5,2) NULL,
  `analystSummary` TEXT NULL,
  `createdAt` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_DraftTeamScorecard_event_team` (`draftEventId`, `teamId`),
  KEY `idx_DraftTeamScorecard_event` (`draftEventId`),
  KEY `idx_DraftTeamScorecard_team` (`teamId`),
  CONSTRAINT `fk_DraftTeamScorecard_event`
    FOREIGN KEY (`draftEventId`) REFERENCES `DraftEvent` (`id`)
    ON DELETE CASCADE
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_DraftTeamScorecard_team`
    FOREIGN KEY (`teamId`) REFERENCES `Team` (`id`)
    ON DELETE RESTRICT
    ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 3. Add missing DraftPick columns only
-- Do NOT recreate DraftPick
-- Matches your uploaded DraftPick model
-- ============================================================

CALL dpa_add_column_if_missing(
  'DraftPick',
  'draftEventId',
  '`draftEventId` INT NULL AFTER `id`'
);

CALL dpa_add_column_if_missing(
  'DraftPick',
  'pickInRound',
  '`pickInRound` INT NULL AFTER `round`'
);

CALL dpa_add_column_if_missing(
  'DraftPick',
  'status',
  '`status` ENUM(''SCHEDULED'', ''ON_CLOCK'', ''PICKED'', ''TRADED'', ''FORFEITED'', ''SKIPPED'') NOT NULL DEFAULT ''SCHEDULED'' AFTER `playerId`'
);

CALL dpa_add_column_if_missing(
  'DraftPick',
  'isCompensatory',
  '`isCompensatory` TINYINT(1) NOT NULL DEFAULT 0 AFTER `status`'
);

CALL dpa_add_column_if_missing(
  'DraftPick',
  'acquiredViaTrade',
  '`acquiredViaTrade` TINYINT(1) NOT NULL DEFAULT 0 AFTER `isCompensatory`'
);

CALL dpa_add_column_if_missing(
  'DraftPick',
  'playerFirstName',
  '`playerFirstName` VARCHAR(45) NULL AFTER `acquiredViaTrade`'
);

CALL dpa_add_column_if_missing(
  'DraftPick',
  'playerLastName',
  '`playerLastName` VARCHAR(45) NULL AFTER `playerFirstName`'
);

CALL dpa_add_column_if_missing(
  'DraftPick',
  'selectedAt',
  '`selectedAt` DATETIME(0) NULL AFTER `college`'
);

CALL dpa_add_column_if_missing(
  'DraftPick',
  'pickGrade',
  '`pickGrade` VARCHAR(5) NULL AFTER `selectedAt`'
);

CALL dpa_add_column_if_missing(
  'DraftPick',
  'valueGrade',
  '`valueGrade` VARCHAR(5) NULL AFTER `pickGrade`'
);

CALL dpa_add_column_if_missing(
  'DraftPick',
  'needsFitGrade',
  '`needsFitGrade` VARCHAR(5) NULL AFTER `valueGrade`'
);

CALL dpa_add_column_if_missing(
  'DraftPick',
  'analystNotes',
  '`analystNotes` TEXT NULL AFTER `needsFitGrade`'
);

CALL dpa_add_column_if_missing(
  'DraftPick',
  'tradeNotes',
  '`tradeNotes` TEXT NULL AFTER `analystNotes`'
);

-- Make sure status enum matches uploaded schema.prisma.
-- This is safe if already identical.
ALTER TABLE `DraftPick`
  MODIFY COLUMN `status`
  ENUM('SCHEDULED', 'ON_CLOCK', 'PICKED', 'TRADED', 'FORFEITED', 'SKIPPED')
  NOT NULL DEFAULT 'SCHEDULED';

-- ============================================================
-- 4. Create DraftPickAuditLog if missing
-- Matches uploaded schema.prisma model DraftPickAuditLog
-- ============================================================

CREATE TABLE IF NOT EXISTS `DraftPickAuditLog` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `draftPickId` INT NOT NULL,
  `draftEventId` INT NOT NULL,
  `action` VARCHAR(50) NOT NULL,
  `changedByPersonId` INT NULL,
  `previousSnapshot` JSON NULL,
  `nextSnapshot` JSON NOT NULL,
  `notes` TEXT NULL,
  `createdAt` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_DraftPickAuditLog_action` (`action`),
  KEY `idx_DraftPickAuditLog_createdAt` (`createdAt`),
  KEY `idx_DraftPickAuditLog_event` (`draftEventId`),
  KEY `idx_DraftPickAuditLog_pick` (`draftPickId`),
  CONSTRAINT `fk_DraftPickAuditLog_event`
    FOREIGN KEY (`draftEventId`) REFERENCES `DraftEvent` (`id`)
    ON DELETE CASCADE
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_DraftPickAuditLog_pick`
    FOREIGN KEY (`draftPickId`) REFERENCES `DraftPick` (`id`)
    ON DELETE CASCADE
    ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 5. Backfill DraftEvent from existing DraftPick.draftYear
-- ============================================================

INSERT INTO `DraftEvent` (
  `draftYear`,
  `name`,
  `leagueCode`,
  `status`
)
SELECT DISTINCT
  dp.`draftYear`,
  CONCAT(dp.`draftYear`, ' NFL Draft'),
  'NFL',
  'PLANNED'
FROM `DraftPick` dp
LEFT JOIN `DraftEvent` de
  ON de.`draftYear` = dp.`draftYear`
 AND de.`leagueCode` = 'NFL'
WHERE dp.`draftYear` IS NOT NULL
  AND de.`id` IS NULL;

-- ============================================================
-- 6. Backfill DraftPick.draftEventId
-- ============================================================

UPDATE `DraftPick` dp
JOIN `DraftEvent` de
  ON de.`draftYear` = dp.`draftYear`
 AND de.`leagueCode` = 'NFL'
SET dp.`draftEventId` = de.`id`
WHERE dp.`draftEventId` IS NULL;

-- ============================================================
-- 7. Backfill DraftPick.pickInRound
-- pickNumber = overall pick
-- pickInRound = row number within draftYear + round
-- ============================================================

UPDATE `DraftPick` dp
JOIN (
  SELECT
    ranked.`id`,
    ranked.`calculatedPickInRound`
  FROM (
    SELECT
      inner_dp.`id`,
      ROW_NUMBER() OVER (
        PARTITION BY inner_dp.`draftYear`, inner_dp.`round`
        ORDER BY inner_dp.`pickNumber` ASC, inner_dp.`id` ASC
      ) AS `calculatedPickInRound`
    FROM `DraftPick` inner_dp
  ) ranked
) r
  ON r.`id` = dp.`id`
SET dp.`pickInRound` = r.`calculatedPickInRound`
WHERE dp.`pickInRound` IS NULL;

-- ============================================================
-- 8. Sync DraftPick.used to DraftPick.status
-- used remains backward-compatible
-- status becomes workflow source
-- ============================================================

UPDATE `DraftPick`
SET `status` = 'PICKED'
WHERE `used` = 1
  AND `status` <> 'PICKED';

UPDATE `DraftPick`
SET `used` = 1
WHERE `status` = 'PICKED'
  AND `used` = 0;

-- ============================================================
-- 9. Ensure originalTeam is initialized
-- currentTeamId = current/selecting owner
-- originalTeam = original pick owner
-- ============================================================

UPDATE `DraftPick`
SET `originalTeam` = `currentTeamId`
WHERE `originalTeam` IS NULL;

-- ============================================================
-- 10. Make backfilled DraftPick columns NOT NULL
-- Only do this after confirming there are no NULLs.
-- ============================================================

SET @draft_event_nulls = (
  SELECT COUNT(*)
  FROM `DraftPick`
  WHERE `draftEventId` IS NULL
);

SET @pick_in_round_nulls = (
  SELECT COUNT(*)
  FROM `DraftPick`
  WHERE `pickInRound` IS NULL
);

SET @ddl = IF(
  @draft_event_nulls = 0,
  'ALTER TABLE `DraftPick` MODIFY COLUMN `draftEventId` INT NOT NULL',
  'SELECT ''Skipped DraftPick.draftEventId NOT NULL because NULLs remain'' AS message'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ddl = IF(
  @pick_in_round_nulls = 0,
  'ALTER TABLE `DraftPick` MODIFY COLUMN `pickInRound` INT NOT NULL',
  'SELECT ''Skipped DraftPick.pickInRound NOT NULL because NULLs remain'' AS message'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================================
-- 11. Add missing DraftPick indexes/unique constraints
--
-- Your uploaded schema currently has:
-- - unique_draft_pick on draftYear, round, pickNumber
-- - fk_draft_pick_event index on draftEventId
-- - currentTeamId/draftYear index
--
-- For scorecard workflow, add event-scoped indexes.
-- ============================================================

CALL dpa_add_index_if_missing(
  'DraftPick',
  'idx_DraftPick_event_round',
  'INDEX `idx_DraftPick_event_round` (`draftEventId`, `round`)'
);

CALL dpa_add_index_if_missing(
  'DraftPick',
  'idx_DraftPick_event_team',
  'INDEX `idx_DraftPick_event_team` (`draftEventId`, `currentTeamId`)'
);

CALL dpa_add_index_if_missing(
  'DraftPick',
  'idx_DraftPick_status',
  'INDEX `idx_DraftPick_status` (`status`)'
);

CALL dpa_add_index_if_missing(
  'DraftPick',
  'idx_DraftPick_event_status',
  'INDEX `idx_DraftPick_event_status` (`draftEventId`, `status`)'
);

CALL dpa_add_index_if_missing(
  'DraftPick',
  'idx_DraftPick_event_originalTeam',
  'INDEX `idx_DraftPick_event_originalTeam` (`draftEventId`, `originalTeam`)'
);

CALL dpa_add_index_if_missing(
  'DraftPick',
  'uq_DraftPick_event_pickNumber',
  'UNIQUE KEY `uq_DraftPick_event_pickNumber` (`draftEventId`, `pickNumber`)'
);

CALL dpa_add_index_if_missing(
  'DraftPick',
  'uq_DraftPick_event_round_pickInRound',
  'UNIQUE KEY `uq_DraftPick_event_round_pickInRound` (`draftEventId`, `round`, `pickInRound`)'
);

-- Existing uploaded Prisma schema uses map: "fk_draft_pick_event".
-- This call only adds it if the actual DB does not have it.
CALL dpa_add_constraint_if_missing(
  'DraftPick',
  'fk_draft_pick_event',
  '`fk_draft_pick_event`
    FOREIGN KEY (`draftEventId`) REFERENCES `DraftEvent` (`id`)
    ON DELETE CASCADE
    ON UPDATE NO ACTION'
);

-- ============================================================
-- 12. Backfill DraftTeamScorecard from current DraftPick ownership
-- ============================================================

INSERT INTO `DraftTeamScorecard` (
  `draftEventId`,
  `teamId`,
  `totalPicks`,
  `pickedCount`
)
SELECT
  dp.`draftEventId`,
  dp.`currentTeamId`,
  COUNT(*) AS `totalPicks`,
  SUM(CASE WHEN dp.`status` = 'PICKED' THEN 1 ELSE 0 END) AS `pickedCount`
FROM `DraftPick` dp
LEFT JOIN `DraftTeamScorecard` dts
  ON dts.`draftEventId` = dp.`draftEventId`
 AND dts.`teamId` = dp.`currentTeamId`
WHERE dp.`draftEventId` IS NOT NULL
  AND dts.`id` IS NULL
GROUP BY
  dp.`draftEventId`,
  dp.`currentTeamId`;

UPDATE `DraftTeamScorecard` dts
JOIN (
  SELECT
    dp.`draftEventId`,
    dp.`currentTeamId` AS `teamId`,
    COUNT(*) AS `totalPicks`,
    SUM(CASE WHEN dp.`status` = 'PICKED' THEN 1 ELSE 0 END) AS `pickedCount`
  FROM `DraftPick` dp
  GROUP BY
    dp.`draftEventId`,
    dp.`currentTeamId`
) x
  ON x.`draftEventId` = dts.`draftEventId`
 AND x.`teamId` = dts.`teamId`
SET
  dts.`totalPicks` = x.`totalPicks`,
  dts.`pickedCount` = x.`pickedCount`;

-- ============================================================
-- Cleanup helper procedures
-- ============================================================

DROP PROCEDURE IF EXISTS dpa_add_column_if_missing;
DROP PROCEDURE IF EXISTS dpa_add_index_if_missing;
DROP PROCEDURE IF EXISTS dpa_add_constraint_if_missing;
