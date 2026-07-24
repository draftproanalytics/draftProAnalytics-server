-- Phase 2: reproducible post-draft WR evaluation and report snapshots
-- MySQL 8.0 source-of-truth DDL

CREATE TABLE IF NOT EXISTS PostDraftEvaluationModel (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  modelKey VARCHAR(64) NOT NULL,
  modelVersion VARCHAR(32) NOT NULL,
  positionGroup VARCHAR(16) NOT NULL DEFAULT 'ALL',
  modelName VARCHAR(150) NOT NULL,
  description VARCHAR(500) NULL,
  weightsJson JSON NOT NULL,
  thresholdsJson JSON NOT NULL,
  isActive TINYINT(1) NOT NULL DEFAULT 1,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_PostDraftEvaluationModel_key_version_position (modelKey, modelVersion, positionGroup),
  KEY idx_PostDraftEvaluationModel_active (modelKey, positionGroup, isActive)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS PostDraftReport (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  teamId INT NOT NULL,
  draftYear YEAR NOT NULL,
  reportVersion INT NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'FINALIZED',
  modelId BIGINT UNSIGNED NOT NULL,
  modelKey VARCHAR(64) NOT NULL,
  modelVersion VARCHAR(32) NOT NULL,
  overallScore DECIMAL(6,2) NOT NULL,
  overallGrade VARCHAR(5) NOT NULL,
  dataConfidence DECIMAL(6,2) NOT NULL,
  inputHash CHAR(64) NOT NULL,
  inputSnapshotJson JSON NOT NULL,
  reportJson JSON NOT NULL,
  finalizedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_PostDraftReport_team_year_version (teamId, draftYear, reportVersion),
  KEY idx_PostDraftReport_lookup (teamId, draftYear, finalizedAt),
  KEY idx_PostDraftReport_inputHash (inputHash),
  CONSTRAINT fk_PostDraftReport_Team FOREIGN KEY (teamId) REFERENCES Team(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_PostDraftReport_Model FOREIGN KEY (modelId) REFERENCES PostDraftEvaluationModel(id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS PostDraftPickEvaluation (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  reportId BIGINT UNSIGNED NOT NULL,
  draftPickId INT NOT NULL,
  roundNumber INT NOT NULL,
  pickNumber INT NOT NULL,
  prospectId INT NULL,
  playerName VARCHAR(150) NOT NULL,
  position VARCHAR(16) NOT NULL,
  overallScore DECIMAL(6,2) NOT NULL,
  letterGrade VARCHAR(5) NOT NULL,
  dataConfidence DECIMAL(6,2) NOT NULL,
  scoreBreakdownJson JSON NOT NULL,
  wrEvaluationJson JSON NULL,
  missingSignalsJson JSON NOT NULL,
  summary TEXT NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_PostDraftPickEvaluation_report_pick (reportId, draftPickId),
  KEY idx_PostDraftPickEvaluation_report_round (reportId, roundNumber, pickNumber),
  CONSTRAINT fk_PostDraftPickEvaluation_Report FOREIGN KEY (reportId) REFERENCES PostDraftReport(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_PostDraftPickEvaluation_DraftPick FOREIGN KEY (draftPickId) REFERENCES DraftPick(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_PostDraftPickEvaluation_Prospect FOREIGN KEY (prospectId) REFERENCES Prospect(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS PostDraftRoundEvaluation (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  reportId BIGINT UNSIGNED NOT NULL,
  roundNumber INT NOT NULL,
  score DECIMAL(6,2) NOT NULL,
  letterGrade VARCHAR(5) NOT NULL,
  summary TEXT NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_PostDraftRoundEvaluation_report_round (reportId, roundNumber),
  CONSTRAINT fk_PostDraftRoundEvaluation_Report FOREIGN KEY (reportId) REFERENCES PostDraftReport(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO PostDraftEvaluationModel
  (modelKey, modelVersion, positionGroup, modelName, description, weightsJson, thresholdsJson, isActive)
VALUES
  ('DPA_POST_DRAFT_REPORT', '2.0.0', 'ALL', 'DPA Post-Draft Report Model',
   'Versioned team, round, and pick evaluation model with WR-specific prospect scoring.',
   JSON_OBJECT('prospectQuality', 0.40, 'draftValue', 0.27, 'teamNeedFit', 0.20, 'positionalValue', 0.13),
   JSON_OBJECT('elite', 90, 'strong', 80, 'average', 70, 'developmental', 60), 1),
  ('DPA_WR_POST_DRAFT', '1.0.0', 'WR', 'DPA WR Post-Draft Evaluation',
   'Provider-neutral WR model using advanced receiving, production, athletic, and B4Me signals.',
   JSON_OBJECT('advancedEfficiency', 0.30, 'production', 0.20, 'athleticProfile', 0.20, 'b4me', 0.20, 'ranking', 0.10),
   JSON_OBJECT('yprrFloor', 1.0, 'yprrCeiling', 4.0, 'gradeFloor', 55, 'gradeCeiling', 95,
               'contestedFloor', 20, 'contestedCeiling', 70, 'behindLosFloor', 5, 'behindLosCeiling', 35), 1)
ON DUPLICATE KEY UPDATE
  modelName = VALUES(modelName),
  description = VALUES(description),
  weightsJson = VALUES(weightsJson),
  thresholdsJson = VALUES(thresholdsJson),
  isActive = VALUES(isActive),
  updatedAt = CURRENT_TIMESTAMP;
