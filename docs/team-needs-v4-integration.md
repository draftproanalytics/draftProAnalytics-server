# Team Needs v4

## Added APIs

- GET `/api/team-needs/context-catalog`
- GET `/api/teams/:teamId/roster-players`
- GET `/api/teams/:teamId/player-evaluations?seasonYear=2026`
- PUT `/api/player-evaluations`
- DELETE `/api/player-evaluations/:id`
- GET `/api/teams/:teamId/position-contexts?draftYear=2027`
- PUT `/api/team-position-contexts`
- DELETE `/api/team-position-contexts/:id`
- GET `/api/teams/:teamId/position-assessments?draftYear=2027`
- PUT `/api/team-position-assessments`
- DELETE `/api/team-position-assessments/:id`

The context catalog is seeded on first GET when the table is empty.

## Generation

`GENERATE_TEAM_NEEDS` now prefers persisted TeamPositionAssessment.finalNeedScore and weighted TeamPositionContext evidence. Positions without a talent assessment continue to use the v3 league-relative roster-count fallback.

Default algorithm version: `team-needs-v4`.
