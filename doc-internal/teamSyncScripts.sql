-- See what you have locally
SELECT id, name, abbreviation, espnTeamId
FROM Team
ORDER BY id;

-- How many Teams are missing espnTeamId?
SELECT COUNT(*) AS missing_espnTeamId
FROM Team
WHERE espnTeamId IS NULL;

-- What ESPN teams do we have from the sync table?
SELECT abbreviation, espn_id
FROM espn_teams
ORDER BY abbreviation;

-- g.gameLocation,
select g.seasonYear, g.gameWeek, 
 (select t.name from Team t where t.id = g.awayTeamId) as awayTeam,
 g.awayScore,
 (select t.name from Team t where t.id = g.homeTeamId) as homeTeam,
 g.homeScore,
 g.gameStatus
 from Game g where g.seasonType = 2 and (g.homeTeamId =78 or g.awayTeamId = 78)
 order by g.gameDate


UPDATE Game
SET gameWeek = 0
WHERE seasonType = 1 AND gameWeek <> 0;