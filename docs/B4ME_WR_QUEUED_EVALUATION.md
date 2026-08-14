# B4Me WR Queued Class Evaluation

## Purpose

Whole-class WR provider hydration and B4Me evaluation now runs through DPA's primary `Job` queue. The interactive B4Me GET endpoints read persisted evaluation state only.

The legacy `/api/b4me-import` runner is no longer mounted. Its seed repository remains available to the queued job implementation.

## Job type

`EVALUATE_B4ME_WR_PROSPECTS`

Submission payload:

```json
{
  "draftYear": 2026,
  "positionGroup": "WR",
  "refreshPolicy": "MISSING_OR_STALE",
  "scoringMode": "BASE_PLUS_CONTEXT"
}
```

Supported refresh policies:

- `MISSING_ONLY`
- `MISSING_OR_STALE`
- `FORCE_REFRESH`

`MISSING_OR_STALE` considers the persisted metric season and requires `FINAL_COLLEGE_SEASON`; for a 2026 prospect, the expected metric season is 2025.

## API

### Database-only list

```bash
curl -sS \
  'http://localhost:5000/api/b4me/prospects?draftYear=2026&scoringMode=BASE_PLUS_CONTEXT&enableCompetitionDiscount=true&enableInjuryAvailabilityAdjustment=true&enableQbOffenseContextAdjustment=true&enableSampleSizeAdjustment=true&enableArchetypeConfidenceAdjustment=true&enableCoachabilityAdjustment=true&enableRfaAdjustment=true&enableRvaAdjustment=true'
```

This request performs no provider hydration and creates no prospects, metrics, or evaluations.

### Submit class evaluation

The endpoint requires authentication and `SCOUTING / EDIT`.

```bash
curl -sS -X POST \
  -H 'Content-Type: application/json' \
  -b cookies.txt \
  -d '{
    "draftYear": 2026,
    "positionGroup": "WR",
    "refreshPolicy": "MISSING_OR_STALE",
    "scoringMode": "BASE_PLUS_CONTEXT"
  }' \
  http://localhost:5000/api/jobs/b4me-wr-evaluation
```

The response is HTTP 202 with the persisted Job record. The server kicks the existing DPA queue processor after returning the response.

### Read progress

```bash
curl -sS -b cookies.txt http://localhost:5000/api/jobs/123
curl -sS -b cookies.txt http://localhost:5000/api/jobs/123/logs
```

The B4Me client polls the Job record and displays `processedItems / totalItems`, `progressPercent`, status, and completion counts.

## Processing behavior

For each WR prospect in the draft class, the queued handler:

1. Skips prospects with unresolved duplicate review state.
2. Skips prospects with unresolved provider identity review state.
3. Reuses current metrics according to the refresh policy.
4. Hydrates only the requested Prospect ID when provider work is required.
5. Preserves manually entered YPRR, PFF grade, contested-catch rate, and behind-LOS target rate through the existing metrics writer.
6. Creates an identity review and skips the prospect if the provider resolves a different identity.
7. Builds persisted B4Me evaluations for all four combinations of the current Limitation Filters and Decision View toggles so those UI views remain database-only.
8. Records per-prospect progress/logging and continues after provider timeout or an item-level failure.

Provider concurrency defaults to 3 and is configurable:

```bash
B4ME_WR_PROVIDER_CONCURRENCY=3
```

## Completion result

`Job.resultJson` contains class-level counts and per-prospect outcomes, including:

- evaluated
- reused
- hydrated
- manualFactsPreserved
- identityReviewRequired
- duplicateReviewRequired
- providerUnavailable
- providerTimeout
- failed
- outcomes

## Database changes

No Prisma schema change is required by this implementation. The uploaded/current schema already contains the required Job progress fields and Prospect duplicate/identity review tables.

## Validation on a normal development checkout

The supplied delivery ZIPs intentionally exclude dependencies. After extracting into a normal checkout with dependencies installed, run:

```bash
npx prisma validate
npx prisma generate
npm run build
npm test
```

Client:

```bash
npm run build
npm test
```

Focused server tests added by this change:

```bash
npx vitest run \
  src/modules/b4meAnalysis/__tests__/GetOrCreateWrB4MeEvaluationUseCase.database-only.test.ts \
  src/modules/jobs/__tests__/EvaluateB4MeWrProspectsJobHandler.test.ts
```

## Smoke-test sequence

1. Open B4Me for 2026 WRs and confirm the GET returns quickly without provider logs.
2. Click **Run Analysis** and confirm an HTTP 202 Job is returned immediately.
3. Confirm progress increases on the B4Me page.
4. Confirm an open duplicate review produces `SKIPPED_DUPLICATE_REVIEW` and no provider call for that prospect.
5. Confirm an ambiguous provider identity produces a `ProspectIdentityReview` and no metrics write to another prospect.
6. Confirm manual observed metrics remain unchanged after a refresh.
7. Repeat the same `MISSING_OR_STALE` job and confirm most/all prospects are reused rather than rehydrated.
8. After completion, change Limitation Filters / Decision View combinations and confirm each view reads persisted evaluations without provider work.
