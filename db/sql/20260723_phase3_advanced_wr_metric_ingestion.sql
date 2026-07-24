-- Phase 3: Advanced WR metric ingestion
-- MySQL 8.0 source of truth. Apply after Phase 2 DDL.

CREATE TABLE IF NOT EXISTS PostDraftWRMetricImportBatch (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  status VARCHAR(20) NOT NULL,
  sourceFileName VARCHAR(255) NULL,
  enteredBy INT NULL,
  totalRows INT NOT NULL DEFAULT 0,
  validRows INT NOT NULL DEFAULT 0,
  invalidRows INT NOT NULL DEFAULT 0,
  importedRows INT NOT NULL DEFAULT 0,
  skippedRows INT NOT NULL DEFAULT 0,
  startedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completedAt DATETIME NULL,
  notes TEXT NULL,
  PRIMARY KEY (id),
  KEY idx_PostDraftWRMetricImportBatch_status_started (status, startedAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS PostDraftWRMetric (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  prospectId INT NOT NULL,
  draftYear YEAR NOT NULL,
  seasonYear YEAR NOT NULL,
  yardsPerRouteRun DECIMAL(6,3) NULL,
  receivingGrade DECIMAL(6,2) NULL,
  contestedCatchRate DECIMAL(6,2) NULL,
  behindLosTargetRate DECIMAL(6,2) NULL,
  catchRate DECIMAL(6,2) NULL,
  missedTacklesForcedPerReception DECIMAL(6,3) NULL,
  yacAfterContactPerReception DECIMAL(6,3) NULL,
  sourceName VARCHAR(150) NOT NULL,
  sourceType VARCHAR(32) NOT NULL,
  sourceReference VARCHAR(255) NULL,
  sourceReferenceKey VARCHAR(255) NOT NULL DEFAULT '',
  enteredBy INT NULL,
  enteredAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  verified TINYINT(1) NOT NULL DEFAULT 0,
  verifiedBy INT NULL,
  verifiedAt DATETIME NULL,
  verificationNotes TEXT NULL,
  notes TEXT NULL,
  rawPayloadJson JSON NULL,
  providerPriority INT NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  UNIQUE KEY uq_PostDraftWRMetric_logical (prospectId, draftYear, seasonYear, sourceType, sourceName, sourceReferenceKey),
  KEY idx_PostDraftWRMetric_resolution (prospectId, draftYear, active, verified, providerPriority),
  KEY idx_PostDraftWRMetric_source (sourceType, sourceName),
  CONSTRAINT fk_PostDraftWRMetric_Prospect FOREIGN KEY (prospectId) REFERENCES Prospect(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT chk_PostDraftWRMetric_yprr CHECK (yardsPerRouteRun IS NULL OR yardsPerRouteRun BETWEEN 0 AND 10),
  CONSTRAINT chk_PostDraftWRMetric_grade CHECK (receivingGrade IS NULL OR receivingGrade BETWEEN 0 AND 100),
  CONSTRAINT chk_PostDraftWRMetric_contested CHECK (contestedCatchRate IS NULL OR contestedCatchRate BETWEEN 0 AND 100),
  CONSTRAINT chk_PostDraftWRMetric_blos CHECK (behindLosTargetRate IS NULL OR behindLosTargetRate BETWEEN 0 AND 100),
  CONSTRAINT chk_PostDraftWRMetric_catch CHECK (catchRate IS NULL OR catchRate BETWEEN 0 AND 100),
  CONSTRAINT chk_PostDraftWRMetric_mtf CHECK (missedTacklesForcedPerReception IS NULL OR missedTacklesForcedPerReception BETWEEN 0 AND 5),
  CONSTRAINT chk_PostDraftWRMetric_yac CHECK (yacAfterContactPerReception IS NULL OR yacAfterContactPerReception BETWEEN 0 AND 20)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS PostDraftWRMetricAudit (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  metricId BIGINT UNSIGNED NOT NULL,
  action VARCHAR(24) NOT NULL,
  actorPersonId INT NULL,
  actorUserName VARCHAR(100) NULL,
  previousValuesJson JSON NULL,
  newValuesJson JSON NULL,
  importBatchId BIGINT UNSIGNED NULL,
  reason TEXT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_PostDraftWRMetricAudit_metric_created (metricId, createdAt),
  KEY idx_PostDraftWRMetricAudit_batch (importBatchId),
  CONSTRAINT fk_PostDraftWRMetricAudit_Metric FOREIGN KEY (metricId) REFERENCES PostDraftWRMetric(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_PostDraftWRMetricAudit_Batch FOREIGN KEY (importBatchId) REFERENCES PostDraftWRMetricImportBatch(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS PostDraftWRMetricImportRow (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  batchId BIGINT UNSIGNED NOT NULL,
  rowNumber INT NOT NULL,
  status VARCHAR(20) NOT NULL,
  metricId BIGINT UNSIGNED NULL,
  rawRowJson JSON NOT NULL,
  validationErrorsJson JSON NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_PostDraftWRMetricImportRow_batch_row (batchId, rowNumber),
  KEY idx_PostDraftWRMetricImportRow_metric (metricId),
  CONSTRAINT fk_PostDraftWRMetricImportRow_Batch FOREIGN KEY (batchId) REFERENCES PostDraftWRMetricImportBatch(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_PostDraftWRMetricImportRow_Metric FOREIGN KEY (metricId) REFERENCES PostDraftWRMetric(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS PostDraftMetricProviderRule (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  sourceType VARCHAR(32) NOT NULL,
  verified TINYINT(1) NOT NULL,
  priority INT NOT NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  description VARCHAR(255) NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_PostDraftMetricProviderRule_source_verified (sourceType, verified),
  UNIQUE KEY uq_PostDraftMetricProviderRule_priority (priority)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO PostDraftMetricProviderRule (sourceType, verified, priority, active, description) VALUES
('LICENSED_PROVIDER', 1, 10, 1, 'Verified licensed provider'),
('MANUAL', 1, 20, 1, 'Verified manual entry'),
('CSV', 1, 30, 1, 'Verified CSV import'),
('FREE_API', 1, 40, 1, 'Verified free API'),
('DPA', 1, 50, 1, 'Verified DPA source'),
('DERIVED', 1, 60, 1, 'Verified derived metric'),
('LICENSED_PROVIDER', 0, 70, 1, 'Unverified licensed provider'),
('MANUAL', 0, 80, 1, 'Unverified manual entry'),
('CSV', 0, 90, 1, 'Unverified CSV import'),
('FREE_API', 0, 100, 1, 'Unverified free API'),
('DPA', 0, 110, 1, 'Unverified DPA source'),
('DERIVED', 0, 120, 1, 'Unverified derived metric')
ON DUPLICATE KEY UPDATE priority = VALUES(priority), active = VALUES(active), description = VALUES(description), updatedAt = CURRENT_TIMESTAMP;
