# Phase 3 — Advanced WR Metric Ingestion

## Assumptions

- Authentication remains optional at the router level because the current post-draft routes are not protected. When `req.user` exists, actor identity is retained; otherwise actor fields are null.
- CSV endpoints accept either `Content-Type: text/csv` with the CSV as the raw body, or JSON `{ "csv": "..." }`.
- `sourceReferenceKey` normalizes a nullable source reference to an empty string so MySQL can enforce the logical unique key.
- Import is atomic when `skipInvalidRows=false`. With `skipInvalidRows=true`, valid rows commit together and invalid rows are retained as skipped import-row records.
- Existing `B4MeWRMetrics` remains a fallback. Advanced records override it field-by-field, and finalized Phase 2 snapshots retain the resolved values, provenance, and record IDs.

## Installation

```bash
mysql -u <user> -p <database> < db/sql/20260723_phase3_advanced_wr_metric_ingestion.sql
npx prisma generate
npm run build
npm test -- tests/postDraftMetrics tests/postDraftReport/EvaluateWrProspectService.test.ts
```

## Manual entry

```bash
curl -i -X POST http://localhost:5000/api/post-draft-metrics/wr/manual \
  -H 'Content-Type: application/json' \
  -d '{
    "prospectId": 123,
    "draftYear": 2026,
    "seasonYear": 2025,
    "yardsPerRouteRun": 3.12,
    "receivingGrade": 86.4,
    "contestedCatchRate": 52.1,
    "behindLosTargetRate": 13.4,
    "catchRate": 71.8,
    "missedTacklesForcedPerReception": 0.18,
    "yacAfterContactPerReception": 3.7,
    "sourceName": "Manual Entry",
    "sourceType": "MANUAL",
    "verified": false,
    "notes": "Entered from an authorized source"
  }'
```

## CSV preview and import

```bash
cat >/tmp/wr-metrics.csv <<'CSV'
prospectId,draftYear,seasonYear,yardsPerRouteRun,receivingGrade,contestedCatchRate,behindLosTargetRate,catchRate,missedTacklesForcedPerReception,yacAfterContactPerReception,sourceName,sourceType,verified,notes
123,2026,2025,3.12,86.4,52.1,13.4,71.8,0.18,3.7,Manual Licensed Export,CSV,false,Imported from authorized export
CSV

curl -i -X POST http://localhost:5000/api/post-draft-metrics/wr/import/preview \
  -H 'Content-Type: text/csv' --data-binary @/tmp/wr-metrics.csv

curl -i -X POST 'http://localhost:5000/api/post-draft-metrics/wr/import?skipInvalidRows=false&allowVerifiedOverwrite=false' \
  -H 'Content-Type: text/csv' --data-binary @/tmp/wr-metrics.csv
```

## Verification and resolution

```bash
curl -i -X PATCH http://localhost:5000/api/post-draft-metrics/wr/10/verify \
  -H 'Content-Type: application/json' -d '{"notes":"Checked against authorized source"}'

curl -i -X PATCH http://localhost:5000/api/post-draft-metrics/wr/10/unverify \
  -H 'Content-Type: application/json' -d '{"notes":"Source correction required"}'

curl -i http://localhost:5000/api/post-draft-metrics/wr/prospects/123/years/2026/resolved
```

## Snapshot verification

```bash
curl -s -X POST http://localhost:5000/api/post-draft-reports/teams/1/years/2026/preview | jq '.data.rounds[].picks[] | select(.position == "WR") | .wrEvaluation'
curl -s -X POST http://localhost:5000/api/post-draft-reports/teams/1/years/2026/finalize | jq '.data.inputHash'
```

After finalization, change an underlying metric and retrieve the finalized report again. Its input hash, resolved values, provenance, and record IDs must remain unchanged.
