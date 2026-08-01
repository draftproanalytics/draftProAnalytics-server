CREATE TABLE IF NOT EXISTS `NflversePlayerProductionStaging` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, `importJobId` INT NOT NULL, `seasonYear` YEAR NOT NULL, `summaryLevel` VARCHAR(16) NOT NULL DEFAULT 'reg',
  `externalPlayerId` VARCHAR(32) NOT NULL, `playerName` VARCHAR(150) NOT NULL, `teamAbbreviation` VARCHAR(8) NOT NULL DEFAULT '', `position` VARCHAR(10) NULL, `positionGroup` VARCHAR(10) NULL,
  `metricsJson` JSON NOT NULL, `suggestedRosterPlayerId` VARCHAR(36) NULL, `matchedRosterPlayerId` VARCHAR(36) NULL, `matchConfidence` DECIMAL(5,2) NULL,
  `matchStatus` VARCHAR(20) NOT NULL DEFAULT 'UNMATCHED', `reviewNotes` VARCHAR(500) NULL, `promotedEvaluationId` BIGINT UNSIGNED NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`), UNIQUE KEY `uq_NflverseProduction_source` (`seasonYear`,`summaryLevel`,`externalPlayerId`,`teamAbbreviation`),
  KEY `idx_NflverseProduction_review` (`seasonYear`,`matchStatus`), KEY `idx_NflverseProduction_job` (`importJobId`), KEY `idx_NflverseProduction_roster` (`matchedRosterPlayerId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
