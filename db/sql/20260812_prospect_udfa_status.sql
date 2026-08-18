-- Prospect draft lifecycle: explicit UDFA support
-- MySQL source-of-truth migration. Existing rows are preserved.

ALTER TABLE Prospect
  ADD COLUMN draftStatus ENUM('PRE_DRAFT','DRAFTED','UDFA') NOT NULL DEFAULT 'PRE_DRAFT' AFTER drafted;

UPDATE Prospect
SET draftStatus = CASE
  WHEN drafted = 1 THEN 'DRAFTED'
  ELSE 'PRE_DRAFT'
END;

CREATE INDEX idx_prospect_draft_status ON Prospect(draftStatus);

-- drafted is retained temporarily for backward compatibility.
-- Application code treats draftStatus as authoritative and keeps drafted=true only for DRAFTED.
-- Existing UDFA records cannot be inferred reliably from historical data; mark those explicitly in the UI.
