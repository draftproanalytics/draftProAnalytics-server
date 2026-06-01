-- ============================================================
-- Fix duplicate DraftPick.pickNumber values for 2025 DraftEvent
-- draftEventId = 9
--
-- Rule:
-- pickNumber = overall pick
-- pickInRound = pick within round 
-- /home/dthompson/aiAssistWS/draftProAnalytics-server/queries/fix_2025_draft_pick_numbers.sql
-- ============================================================

-- Safety backup before changing pick numbers
CREATE TABLE IF NOT EXISTS DraftPick_backup_before_2025_picknumber_fix AS
SELECT *
FROM DraftPick
WHERE draftEventId = 9;

-- Preview duplicate groups before fix
SELECT
  draftEventId,
  draftYear,
  pickNumber,
  COUNT(*) AS duplicateCount,
  GROUP_CONCAT(id ORDER BY id) AS draftPickIds
FROM DraftPick
WHERE draftEventId = 9
GROUP BY draftEventId, draftYear, pickNumber
HAVING COUNT(*) > 1
ORDER BY draftEventId, pickNumber;

-- Normalize overall pickNumber for event 9
-- This does NOT change round or pickInRound.
-- It only makes pickNumber match the sequential overall order.
UPDATE DraftPick dp
JOIN (
  SELECT
    ranked.id,
    ranked.calculatedOverallPick
  FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY draftEventId
        ORDER BY round ASC, pickInRound ASC, id ASC
      ) AS calculatedOverallPick
    FROM DraftPick
    WHERE draftEventId = 9
  ) ranked
) x
  ON x.id = dp.id
SET dp.pickNumber = x.calculatedOverallPick
WHERE dp.draftEventId = 9;

-- Validate duplicates are gone
SELECT
  draftEventId,
  draftYear,
  pickNumber,
  COUNT(*) AS duplicateCount,
  GROUP_CONCAT(id ORDER BY id) AS draftPickIds
FROM DraftPick
WHERE draftEventId = 9
GROUP BY draftEventId, draftYear, pickNumber
HAVING COUNT(*) > 1
ORDER BY draftEventId, pickNumber;

-- Show corrected range
SELECT
  id,
  draftEventId,
  draftYear,
  round,
  pickInRound,
  pickNumber,
  currentTeamId,
  originalTeam,
  used,
  status,
  position,
  college
FROM DraftPick
WHERE draftEventId = 9
ORDER BY pickNumber ASC;
