select draftYear,round,pickNumber,   
  (select concat(firstName,' ',lastName) from Player where id = playerId) as player,   
  (select name from Team where id = currentTeamId) as team,
  position 
from DraftPick limit 20;

select draftYear,round,pickNumber,   
  (select concat(firstName,' ',lastName) from Player where id = playerId) as player,   
  (select name from Team where id = currentTeamId) as team,
  position 
from DraftPick 
where currentTeamId = 78 
  and draftYear = 2025;

  select gameWeek,gameDate,seasonType,gameStatus,
     (select name from Team where id = awayTeamId) as awayTeam,
     (select name from Team where id = homeTeamId) as homeTeam,
     awayScore, homeScore
  from Game

  select gameWeek,Date(gameDate) as gameDate,
      CASE seasonType
        WHEN 1 THEN 'Pre'
        WHEN 2 THEN 'Reg'
        WHEN 3 THEN 'Post'
        ELSE 'unknown' -- Optional: handle other possible values
      END AS seasonType,
      gameStatus,
     (select name from Team where id = awayTeamId) as awayTeam,
     (select name from Team where id = homeTeamId) as homeTeam,
     awayScore, homeScore
  from Game 
  where awayTeamId = 93 or homeTeamId = 93

  SELECT
  gameWeek,
  DATE(gameDate) AS gameDate,
  CASE seasonType
    WHEN 1 THEN 'preseason'
    WHEN 2 THEN 'regular season'
    WHEN 3 THEN 'post season'
    ELSE 'unknown' -- Optional: handle other possible values
  END AS seasonType,
  gameStatus,
  (SELECT
      name
    FROM Team
    WHERE
      id = awayTeamId) AS awayTeam,
  (SELECT
      name
    FROM Team
    WHERE
      id = homeTeamId) AS homeTeam,
  awayScore,
  homeScore
FROM Game
WHERE
  awayTeamId = 78 OR homeTeamId = 78;


SELECT id, name, espnTeamId
FROM Team
WHERE id IN (65, 63);

-- FindBy espnCompetitionId
SELECT g.gameDate, g.gameWeek, at.name as awayTeam, ht.name as homeTeam
from Game g,
     Team at,
     Team ht
where g.espnCompetitionId = 401772631 
  and g.awayTeamId = at.id
  and g.homeTeamId = ht.id;

  401772946