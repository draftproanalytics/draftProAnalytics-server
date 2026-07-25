SELECT COUNT(*) AS cnt FROM DraftOrderSnapshot;
SELECT id, mode, strategy, seasonYear, seasonType, throughWeek, computedAt
FROM DraftOrderSnapshot
ORDER BY computedAt DESC
LIMIT 5;


// Check for Playoff Games in Game table
SELECT COUNT(*) FROM Game WHERE seasonYear = '2025' AND seasonType = 3;