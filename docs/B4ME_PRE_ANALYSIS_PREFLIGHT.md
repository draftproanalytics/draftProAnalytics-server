# B4Me WR Pre-Analysis Duplicate / Identity Check

## Purpose

Before `EVALUATE_B4ME_WR_PROSPECTS` is submitted, the client checks Prospect identity hygiene for the selected WR draft class.

## Preflight endpoint

`GET /api/prospect-identity/preflight?draftYear=2026&position=WR`

The response reports:

- Prospect count in scope.
- Whether a completed `DETECT_PROSPECT_DUPLICATES` scan exists.
- Whether the scan is stale because a Prospect in the selected class was created or updated after that scan completed.
- Unresolved duplicate-review count for the selected class.
- Unresolved provider-identity-review count for the selected class.

`scanState` is one of:

- `NEVER_RUN`
- `STALE`
- `CURRENT`

No fixed age window is used. A scan remains current until Prospect data in the selected class changes.

## Client behavior

When **Run Analysis** is clicked:

1. Read the preflight endpoint.
2. If the scan is `CURRENT` and there are zero unresolved duplicate/identity reviews, submit B4Me immediately.
3. Otherwise display **B4Me Pre-Analysis Check** with:
   - **Run Duplicate Check First** — queues `DETECT_PROSPECT_DUPLICATES` and navigates to Prospect Identity Management.
   - **Continue B4Me Analysis** — submits B4Me anyway.
   - **Cancel** — performs no job submission.
4. Prospect Identity Management displays the queued duplicate-scan Job ID when reached from the preflight dialog.

The dialog is advisory. Server-side B4Me protections remain authoritative: unresolved duplicate or provider-identity cases are skipped rather than hydrated/evaluated.

## No migration

This change uses existing `Prospect`, `ProspectDuplicateReview`, `ProspectIdentityReview`, and `Job` fields. No Prisma schema change or database migration is required.
