# ESPN Draft Job Import — First-Pass Implementation

## Annual workflow

1. `LOAD_ESPN_DRAFT_CLASS_PLAYERS`
   - Endpoint: `POST /api/jobs/imports/espn-draft-class-players`
   - Payload: `{ "draftYear": 2026 }`
   - Reads ESPN draft athletes for the year.
   - Upserts `espn_players` by `espn_id`.
   - Upserts `Player` by `espnAthleteId`.

2. `LOAD_ESPN_DRAFT_RESULTS`
   - Endpoint: `POST /api/jobs/imports/espn-draft-results`
   - Payload: `{ "draftYear": 2026, "activateMembership": true }`
   - Upserts `espn_draft_picks` by ESPN pick ID (fallback: `year-overallPick`).
   - Ensures each drafted athlete exists in `espn_players` and `Player`.
   - Resolves `Team` using `Team.espnTeamId`.
   - Updates an existing DPA `DraftPick` identified by `draftYear + pickNumber`.
   - Upserts `PlayerTeam` using `playerId + teamId + startYear` lookup.

## Identity rules

- Player identity: `espn_players.espn_id = Player.espnAthleteId`.
- Team identity: `espn_draft_picks.team_espn_id = Team.espnTeamId` after integer conversion.
- Names are display data only and are never the primary match.

## PlayerTeam behavior

- `activateMembership=true` attempts to mark the drafted-team membership current and active.
- If another team is already active for the player, the importer preserves history, creates/updates the drafted-team row as inactive, and logs an active-membership conflict.
- For historical draft imports, use `activateMembership=false`.

## No database migration

The current schema already contains the required IDs, staging tables, `PlayerTeam`, and Job tables. No DDL or Prisma schema changes are included.

## Local validation

```bash
# Server
npm install
npx prisma generate
npm run build

# Client
npm install
npm run build
```

### Queue draft-class players

```bash
curl -i -X POST http://localhost:5000/api/jobs/imports/espn-draft-class-players \
  -H 'Content-Type: application/json' \
  -d '{"draftYear":2026}'
```

### Queue draft results

```bash
curl -i -X POST http://localhost:5000/api/jobs/imports/espn-draft-results \
  -H 'Content-Type: application/json' \
  -d '{"draftYear":2026,"activateMembership":true}'
```

### Process one pending job

```bash
curl -i -X POST http://localhost:5000/api/jobs/queue/process \
  -H 'Content-Type: application/json' \
  -d '{"take":1}'
```

### Database checks

```sql
SELECT * FROM Job ORDER BY id DESC LIMIT 5;
SELECT * FROM JobLog WHERE jobId = <job_id> ORDER BY id;
SELECT COUNT(*) FROM espn_players;
SELECT COUNT(*) FROM Player WHERE espnAthleteId IS NOT NULL;
SELECT * FROM espn_draft_picks WHERE year = 2026 ORDER BY overall_pick;
SELECT pt.*, p.espnAthleteId, t.espnTeamId
FROM PlayerTeam pt
JOIN Player p ON p.id = pt.playerId
JOIN Team t ON t.id = pt.teamId
WHERE pt.startYear = 2026;
```

## First runtime checkpoint

ESPN's NFL endpoints are unofficial and may vary by year. The ESPN provider is isolated in `EspnDraftProvider.ts`; capture the first failed response body or successful sample response during local testing so only this provider needs adjustment if ESPN changes a field shape.
