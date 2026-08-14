# B4Me Manual WR Observed Metrics

This package adds manual source-backed entry for the four WR research metrics:

- Yards Per Route Run (YPRR)
- PFF Overall Grade
- Contested Catch Rate
- Behind-LOS Target Rate

## Endpoint

`PUT /api/b4me/prospects/:id/manual-observed-metrics`

Requires `SCOUTING / EDIT`. The request records source name, optional source URL/notes, metric season, authenticated person id, and timestamp.

## Precedence

Manual values are classified as observed facts and take precedence over subsequent live-provider or derived fallback values for these four fields. Live hydration may continue to update other WR metrics.

## Evaluation refresh

Saving manual observations deletes cached WR B4Me evaluation snapshots for the prospect. The next B4Me read recomputes research indicators using the new source-backed values.

## Database

No schema migration is required. Existing `B4MeWRMetrics` columns store the four values; manual provenance is stored in `sourceMetadataJson`.
