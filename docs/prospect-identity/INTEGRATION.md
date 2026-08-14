# Prospect Locate / Identity Resolution Integration

## 1. Apply MySQL DDL first

Run `db/migrations/20260814_prospect_identity_resolution.sql` against the target MySQL database.

## 2. Align Prisma

The packaged `prisma/schema.prisma` contains `ProspectDuplicateReview`, `ProspectIdentityReview`, and `ProspectMergeAudit`. After applying DDL, run:

```bash
npx prisma generate
```

## 3. RBAC

The HTTP module is protected by authentication plus the existing admin-role-4 middleware. The client route is additionally hidden behind `SCOUTING/EDIT` and `adminOnly` navigation filtering.

## 4. Duplicate scan job

Queue a deterministic duplicate scan with `POST /api/prospect-identity/duplicates/detect-job`, then process it with the existing jobs queue processor. The job type is `DETECT_PROSPECT_DUPLICATES`.

The scanner never merges automatically. It only persists candidate pairs. A prior `NOT_DUPLICATE` decision is retained until the pair fingerprint materially changes.

## 5. Merge policy

All merges use `FILL_EMPTY_ONLY`:

- survivor scalar values are never overwritten when already populated;
- one-to-one relations move only when the survivor has no row;
- unique-key relation conflicts preserve the survivor and are captured in `ProspectMergeAudit.conflictsJson`;
- ordinary one-to-many foreign keys are re-parented to the survivor;
- the duplicate Prospect is deleted only after relation processing and audit creation.

Current explicit Prospect FK handling includes CombineScore, B4MeWRMetrics, ProspectRanking, B4MeProspectRvaEvaluation, PostDraftWRMetric, Player, DraftPick, DraftSimulationPick, PostDraftPickEvaluation, and B4MeProspectEvaluation.

## 6. B4Me identity safety

When B4Me already has a local Prospect ID, live metrics can only be written to that exact ID. If the provider resolves a different normalized player name, DPA creates `ProspectIdentityReview`, skips hydration, and leaves the original Prospect untouched. Open/deferred identity reviews also suppress repeated hydration attempts.

## 7. Curl smoke tests

Assuming `$TOKEN` contains an authenticated admin JWT:

```bash
curl -sS -X POST http://localhost:5000/api/prospect-identity/duplicates/detect-job \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{}'

curl -sS http://localhost:5000/api/prospect-identity/duplicates?status=OPEN \
  -H "Authorization: Bearer $TOKEN"

curl -sS http://localhost:5000/api/prospect-identity/merge-preview/101/202 \
  -H "Authorization: Bearer $TOKEN"

curl -sS -X POST http://localhost:5000/api/prospect-identity/merge/101/202 \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"reason":"Confirmed duplicate after side-by-side review"}'

curl -sS -X PATCH http://localhost:5000/api/prospect-identity/duplicates/17 \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"status":"NOT_DUPLICATE","resolution":"NOT_DUPLICATE","notes":"Different players"}'

curl -sS http://localhost:5000/api/prospect-identity/identity-reviews?status=OPEN \
  -H "Authorization: Bearer $TOKEN"
```
