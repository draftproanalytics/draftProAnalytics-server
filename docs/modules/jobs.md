# Jobs and Imports Module

## Purpose

The Jobs module supports long-running, repeatable DPA data operations such as:

- NFL season schedule imports
- ESPN draft class imports
- ESPN draft results imports
- Player-team linking
- Other provider-backed data loads

## Separation of responsibilities

A job workflow has distinct stages:

1. Accept and validate a submission request.
2. Create a queued job record.
3. Process queued work.
4. Record progress and status.
5. Persist results.
6. Surface errors for review or retry.

Submitting a job must not depend on the same HTTP request remaining open until processing completes.

## Job types

Use stable domain-specific identifiers, such as:

- `LOAD_NFL_SEASON_SCHEDULE`
- `LOAD_ESPN_DRAFT_CLASS`
- `LOAD_ESPN_DRAFT_RESULTS`
- `LINK_ESPN_DRAFT_PLAYER_TEAMS`

Do not rename persisted job types casually.

## Status

Typical statuses:

- pending
- running
- completed
- failed

Add other statuses only when they have clear operational meaning.

## Progress

Progress should be:

- Monotonic
- Related to measurable work
- Recorded often enough to diagnose a stalled job
- Safe if the worker retries

When total work cannot be known initially, update the total after discovery.

## Idempotency

Imports should normally be safe to rerun.

Each importer must document:

- Stable match key
- Upsert behavior
- Fields updated
- Fields protected from overwrite
- Duplicate behavior
- Provider precedence
- Retry behavior

## NFL schedule import

Expected inputs:

- `seasonYear`
- `seasonType`
- Optional `week` depending on the endpoint

Current queue route family includes:

```http
POST /api/jobs/imports/nfl-season-schedule
```

The router must be mounted before the 404 handler.

## ESPN draft imports

### Draft class

May create or update provider staging records and DPA Player records using the provider athlete identity.

### Draft results

Must not overwrite correct Player identity data with fallback or selection-reference data.

The results step should focus on:

- Persisting raw selection data
- Matching the DPA player
- Matching the DPA team
- Updating the matching DraftPick
- Creating/updating PlayerTeam membership

### PlayerTeam safeguards

- Prevent conflicting active memberships.
- Preserve history.
- Use the DPA `Team.id`, not `espnTeamId`, as the foreign key.
- Do not place ESPN IDs into player name fields.
- Record unmatched teams and players explicitly.

## Worker behavior

The worker should:

- Claim jobs safely
- Avoid processing the same job concurrently
- Mark running before performing work
- Record failure details
- Avoid leaving failed jobs indefinitely in running status
- Support safe restart after process interruption

## Client behavior

The Jobs UI should provide:

- Job type
- Status
- Progress
- Payload summary
- Creation time
- Error information
- Relevant actions
- Refresh behavior

Polling should be bounded and should stop when the page is destroyed or the job reaches a terminal state.

## Testing

Test:

- Submission validation
- Router mounting
- Pending-to-running transition
- Completion
- Failure
- Retry safety
- Idempotent rerun
- Provider timeout
- Duplicate selection handling
- Unmatched player/team handling
- Protected fields not overwritten
