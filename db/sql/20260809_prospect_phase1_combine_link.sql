-- DraftProAnalytics Prospect Phase 1
-- MySQL is the source of truth. Apply this before regenerating Prisma in an environment.

ALTER TABLE CombineScore
  ADD COLUMN prospectId INT NULL AFTER playerId,
  ADD CONSTRAINT fk_CombineScore_Prospect
    FOREIGN KEY (prospectId) REFERENCES Prospect(id)
    ON DELETE SET NULL ON UPDATE NO ACTION;

CREATE UNIQUE INDEX uq_CombineScore_prospectId ON CombineScore(prospectId);

-- Safe deterministic backfill through Player.prospectId only. No name matching.
UPDATE CombineScore cs
JOIN Player p ON p.id = cs.playerId
SET cs.prospectId = p.prospectId
WHERE cs.prospectId IS NULL
  AND p.prospectId IS NOT NULL;
