# Draft Day Scorecard Module

## Purpose

The Draft Day Scorecard tracks an active NFL draft event, seeded draft picks, team views, pick status, and completed selections.

## Existing DraftPick

The module reuses the existing `DraftPick` table rather than creating a duplicate pick table.

Relevant fields include concepts such as:

- `id`
- `round`
- `pickNumber`
- `draftYear`
- `currentTeamId`
- `prospectId`
- `playerId`
- `used`
- `originalTeam`
- `position`
- `college`

Use the current schema as authoritative.

## Related concepts

Newer scorecard concepts include:

- `DraftEvent`
- `DraftEventStatus`
- `DraftPickStatus`

## Endpoint family

Expected endpoint concepts include:

```http
POST /api/draft-day-scorecard/events
GET /api/draft-day-scorecard/events
GET /api/draft-day-scorecard/events/:id
GET /api/draft-day-scorecard/events/:id/scorecard
GET /api/draft-day-scorecard/events/:id/teams/:teamId
POST /api/draft-day-scorecard/events/:id/seed-picks
PUT /api/draft-day-scorecard/picks/:id
PATCH /api/draft-day-scorecard/picks/:id/on-clock
PATCH /api/draft-day-scorecard/picks/:id/complete
```

Use exact existing routes and payloads.

## Event rules

- A draft year should not have duplicate active events unless explicitly supported.
- Event status transitions must be validated.
- Seeding should be idempotent.
- Pick uniqueness must be enforced within an event/year.
- Duplicate historical data must be resolved before adding constraints.

## Pick rules

A pick may move through states such as:

- available
- on clock
- picked/completed
- traded, when supported

A completed pick should record the selected prospect/player and relevant snapshot fields.

State transitions should be explicit and tested.

## Transactions

Use transactions for operations that must remain consistent, such as:

- Completing a pick
- Advancing on-clock status
- Updating event state
- Seeding a full pick set

## Existing duplicate history

Historical duplicate event/pick records have existed.

Do not add a unique constraint without first:

- Identifying duplicates
- Selecting canonical rows
- Repointing dependent data
- Removing duplicates safely
- Verifying counts

## Client behavior

The scorecard should:

- Show draft progress
- Show current/on-clock pick
- Show team ownership
- Allow authorized completion
- Refresh after a completed pick
- Prevent double submission
- Display conflicts clearly

## Testing

Test:

- Event creation
- Duplicate event prevention
- Seed idempotency
- Pick uniqueness
- On-clock transition
- Complete transition
- Invalid transition
- Team-specific scorecard
- Transaction rollback
- Concurrent completion conflict
