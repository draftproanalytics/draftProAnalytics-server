// ROSTER_SYNC_MODULE_README.md

# Roster Sync Module

## Overview

This module syncs NFL roster data from ESPN API into your database, populating both the `Player` and `rosterPlayers` tables. This is a **prerequisite** for the Team Needs Analysis module.

## What It Does

1. **Fetches roster data from ESPN API** for each NFL team
2. **Populates `Player` table** with player details (name, position, college, etc.)
3. **Populates `rosterPlayers` table** with current roster information (depth chart, performance, etc.)
4. **Handles updates** - can be run multiple times to refresh data

## Module Structure

```
src/modules/rosterSync/
├── application/
│   └── services/
│       └── RosterSync.service.ts       # Core sync logic
├── presentation/
│   ├── controllers/
│   │   └── RosterSync.controller.ts    # HTTP handlers
│   └── routes/
│       └── rosterSync.routes.ts        # Route definitions
└── index.ts                             # Module bootstrap
```

## Installation

### 1. Copy Module Files

Copy the entire module to your project:
```bash
cp -r rosterSync/ src/modules/
```

Or create the structure manually and copy the individual files.

### 2. Register Routes in Express App

**File**: `src/app.ts`

```typescript
import { bootstrapRosterSyncModule } from './modules/rosterSync';

const app = express();
const prisma = new PrismaClient();

// ... other middleware ...

// Register roster sync module
const rosterSyncRouter = bootstrapRosterSyncModule(prisma);
app.use('/api/roster-sync', rosterSyncRouter);

// ... other routes ...
```

### 3. Restart Backend

```bash
npm run dev
```

## API Endpoints

### GET /api/roster-sync/status
Get current sync status

**Response:**
```json
{
  "success": true,
  "data": {
    "totalTeams": 32,
    "teamsWithRosterData": 0,
    "teamsWithoutRosterData": 32,
    "totalPlayers": 0,
    "totalRosterEntries": 0,
    "lastSyncDate": null
  }
}
```

### POST /api/roster-sync/team/:teamId
Sync roster for a specific team

**Example:**
```bash
curl -X POST http://localhost:5000/api/roster-sync/team/1
```

**Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "teamId": 1,
    "teamName": "Atlanta Falcons",
    "playersProcessed": 53,
    "playersCreated": 53,
    "playersUpdated": 0,
    "rosterPlayersCreated": 53,
    "errors": []
  }
}
```

### POST /api/roster-sync/all
Sync rosters for all 32 NFL teams

**Example:**
```bash
curl -X POST http://localhost:5000/api/roster-sync/all
```

**Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "totalTeams": 32,
    "successfulTeams": 32,
    "failedTeams": 0,
    "totalPlayers": 1696,
    "totalRosterEntries": 1696,
    "startTime": "2026-01-21T12:00:00.000Z",
    "endTime": "2026-01-21T12:05:23.456Z",
    "durationMs": 323456
  },
  "summary": {
    "totalTeams": 32,
    "successfulTeams": 32,
    "failedTeams": 0,
    "totalPlayers": 1696,
    "totalRosterEntries": 1696,
    "durationSeconds": "323.46"
  }
}
```

**Note**: This takes about 5-6 minutes to complete (32 teams × ~10 seconds per team)

## Usage Flow

### First Time Setup (Initial Data Population)

```bash
# Step 1: Check status (should show 0 roster entries)
curl http://localhost:5000/api/roster-sync/status

# Step 2: Sync all teams (this will take 5-6 minutes)
curl -X POST http://localhost:5000/api/roster-sync/all

# Step 3: Check status again (should now show ~1700 roster entries)
curl http://localhost:5000/api/roster-sync/status

# Step 4: Now you can use Team Needs Analysis
curl http://localhost:5000/api/team-needs/datatable/teams/2026
```

### Updating Data (Re-sync)

Run the sync again to update with latest roster data:

```bash
# Update all teams
curl -X POST http://localhost:5000/api/roster-sync/all

# Or update specific team
curl -X POST http://localhost:5000/api/roster-sync/team/1
```

## What Data Gets Populated

### Player Table
- `espnAthleteId` - ESPN's unique athlete ID
- `firstName`, `lastName` - Player name
- `age` - Calculated from date of birth
- `height`, `weight` - Physical attributes
- `homeCity`, `homeState` - Birthplace
- `university` - College attended
- `status` - Active, Injured, etc.
- `position` - QB, RB, WR, etc.
- `yearEnteredLeague` - Calculated from experience

### rosterPlayers Table
- `teamId` - Link to Team table
- `playerId` - ESPN athlete ID (string)
- `playerName` - Display name
- `position` - Position abbreviation
- `positionGroup` - QB, RB, WR, OL, DL, LB, DB, ST
- `depthChartOrder` - 1 for starters, 2+ for backups
- `age` - Current age
- `yearsExperience` - Years in NFL
- `performanceGrade` - Default 50.0 (can be updated later)
- `isStarter` - True if depthChartOrder = 1
- `contractYearsRemaining` - Default 0 (can be updated later)
- `injuryStatus` - Current injury status
- `notes` - Additional notes

## Position Group Mapping

The service automatically maps positions to groups:

```
QB  → QB
RB, FB → RB
WR  → WR
TE  → TE
C, G, T, OL → OL
DE, DT, NT, DL → DL
LB, MLB, OLB, ILB → LB
CB, S, FS, SS, DB → DB
K, P, LS → ST (Special Teams)
```

## Error Handling

The service is resilient:
- If one player fails, it continues with others
- If one team fails, it continues with other teams
- All errors are collected and returned in the response
- Console logging shows progress and issues

## Rate Limiting

To be respectful to ESPN's API:
- 500ms delay between team requests
- 10 second timeout per request
- Proper error handling for failed requests

## Testing Locally

### Test Single Team

```bash
# Sync team 1 (usually Atlanta Falcons)
curl -X POST http://localhost:5000/api/roster-sync/team/1

# Check the results in database
mysql -u root -p
> USE your_database;
> SELECT COUNT(*) FROM rosterPlayers WHERE teamId = 1;
> SELECT * FROM rosterPlayers WHERE teamId = 1 LIMIT 5;
```

### Test All Teams (Takes ~5 minutes)

```bash
# Start the sync
curl -X POST http://localhost:5000/api/roster-sync/all

# Watch the backend console for progress logs:
# 📋 Processing team 1/32: Atlanta Falcons
# 📡 Fetching roster for Atlanta Falcons (ATL)
# 📥 Received 53 athletes from ESPN
# ✅ Processed 53 players for Atlanta Falcons
# ...
```

## Troubleshooting

### Issue: "Team with ID X not found"

**Cause**: The Team table doesn't have that team

**Solution**: Make sure your Team table is populated first. You should have 32 NFL teams.

### Issue: ESPN API request timeout

**Cause**: Network issues or ESPN API is slow

**Solution**: The service will log the error and continue with other teams. Run sync again for failed teams.

### Issue: Duplicate key error on rosterPlayers

**Cause**: The unique constraint on `(teamId, playerId)` is triggered

**Solution**: This is handled automatically - existing entries are updated instead of creating duplicates.

## Integration with Team Needs Analysis

After running roster sync, you can now use Team Needs Analysis:

```bash
# Generate needs analysis for all teams
curl -X POST http://localhost:5000/api/team-needs/generate-all \
  -H "Content-Type: application/json" \
  -d '{"seasonYear": 2026}'

# View results
curl http://localhost:5000/api/team-needs/datatable/teams/2026
```

## Automation / Cron Jobs

To keep data fresh, schedule regular syncs:

```bash
# Example cron job (runs daily at 2 AM)
0 2 * * * curl -X POST http://localhost:5000/api/roster-sync/all
```

Or use a job scheduler in your application.

## Performance

- **Single team**: ~10 seconds (53 players)
- **All teams**: ~5-6 minutes (32 teams × 53 players ≈ 1696 total)
- **Database writes**: ~3400 operations (1696 players + 1696 roster entries)

## Database Impact

After full sync:
- `Player` table: ~1700 rows (some players may be on multiple teams historically)
- `rosterPlayers` table: ~1700 rows (current rosters)

## Notes

- The service uses **upsert logic** - safe to run multiple times
- Player records are updated if they already exist (based on `espnAthleteId`)
- Roster entries are updated if they exist (based on `teamId + playerId`)
- Default values are used for fields not available from ESPN (like `performanceGrade`)
- You can manually update grades, contract info, etc. after initial sync

## Next Steps

1. Run initial roster sync
2. Verify data in database
3. Run team needs analysis
4. Set up scheduled syncs to keep data current
5. Enhance with additional data sources (Pro Football Reference, etc.)