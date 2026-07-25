# Phase 2 — Reproducible WR Evaluations and Report Snapshots

## Apply

1. Run `db/sql/20260723_phase2_post_draft_snapshots.sql` in MySQL.
2. Run `npx prisma db pull` only if MySQL is your source of truth and then verify the retained relation names, or use the included aligned schema directly.
3. Run `npx prisma generate`.
4. Run `npm run build` and `npm test`.

## Endpoints

```bash
curl -X POST http://localhost:5000/api/post-draft-reports/teams/95/years/2026/preview
curl -X POST http://localhost:5000/api/post-draft-reports/teams/95/years/2026/finalize
curl http://localhost:5000/api/post-draft-reports/teams/95/years/2026
curl http://localhost:5000/api/post-draft-reports/teams/95/years/2026/history
```

`preview` is calculated from current data and is not stored. `finalize` captures immutable inputs and stores a new report version. The normal GET returns the newest finalized report, falling back to a preview when no finalized report exists.

## WR model

WR picks use `B4MeWRMetrics`, athletic testing, the latest B4Me prospect evaluation, and median prospect ranking. Missing values are omitted and lower confidence; they are never replaced with zero.
