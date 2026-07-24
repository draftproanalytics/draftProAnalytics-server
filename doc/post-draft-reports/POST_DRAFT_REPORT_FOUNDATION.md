# DPA Post-Draft Report Foundation

## Endpoint

`GET /api/post-draft-reports/teams/:teamId/years/:draftYear`

Example:

```bash
curl http://localhost:5000/api/post-draft-reports/teams/95/years/2026
```

## Current provider inputs

The first provider implementation reads DPA's existing tables:

- `DraftPick`: completed selections.
- `Prospect`: player identity, position, college and athletic testing.
- `ProspectRanking`: median consensus ranking across available sources.
- `TeamNeed`: pre-draft need priority.
- `B4MeProspectEvaluation`: most recent position-specific evaluation.

## Provider-neutral boundary

`IPostDraftDataProvider` isolates scoring from data acquisition. Future providers can add CFBD, nflverse, licensed vendors, CSV imports, or manually verified metrics without changing the scoring service.

## Model v1 weights

- Prospect quality: 40%
- Draft-slot value: 27%
- Team-need alignment: 20%
- Positional value: 13%

Round weights are 1.00, 0.90, 0.80, 0.65, 0.55, 0.45 and 0.35 for rounds 1-7.

## Important limitation

Version 1 is a transparent baseline, not a validated predictive model. The next phase should snapshot team needs and rankings before the draft, add free-data import providers, store generated reports, and back-test model weights against NFL outcomes.
