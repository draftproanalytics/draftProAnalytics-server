# Team Needs Generation Job

## Endpoint

`POST /api/jobs/team-needs/generate`

```json
{
  "draftYear": 2027,
  "asOfDate": "2026-01-31",
  "replaceRecommendations": true,
  "algorithmVersion": "team-needs-v1"
}
```

Set `teamId` to generate one team only. Omit it to process every Team row.

The queued job type is `GENERATE_TEAM_NEEDS`. Process it through the existing queue processor endpoint.

Generated rows use `source=GENERATED` and `status=RECOMMENDED`. The job may replace only rows that are still generated recommendations. Approved, rejected, manual, and overridden rows are preserved.

## Review endpoints

- `PATCH /api/team-needs/:id/approve`
- `PATCH /api/team-needs/:id/reject`

The existing Team Needs screen provides approve, reject, edit/override, and remove actions.
