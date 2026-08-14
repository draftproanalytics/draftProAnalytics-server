# Player Performance Import

1. Run `scripts/teamNeedsPlayerProductionV1.sql` against MySQL.
2. Run `npx prisma generate`.
3. Build server.
4. Queue import from the client, process Job Queue, review matches, promote, and recalculate assessments.

Provider URL follows nflreadr's official stats pattern: `stats_player_<summary>_<season>.csv`.
