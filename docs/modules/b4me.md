# B4Me Analysis Module

## Purpose

B4Me provides position-specific prospect evaluation using DPA-owned frameworks and metric inputs.

Initial position groups:

- WR
- ED

Planned future groups include:

- OT
- DT
- CB

## Current data model

Current tables include:

- `B4MeEvaluationMetadata`
- `B4MeFrameworkCatalog`
- `B4MeProspectEvaluation`
- `B4MeProspectRvaEvaluation`
- `B4MeRvaEvaluation`
- `B4MeWRMetrics`
- `Prospect`

Use exact Prisma model names from the current schema.

## WR metrics

Current WR evaluation includes factual/observed metrics and contextual or derived metrics. The four published research indicators are:

- Yards per route run (YPRR)
- Overall PFF grade
- Contested catch rate
- Behind-LOS target rate

Research HIT/MISS status is only assigned when the metric is source-backed. Derived estimates remain visible as `DERIVED_ESTIMATE` and are excluded from the research threshold count. Receptions, targets, missed tackles forced per reception, YAC after contact per reception, and other traits remain contextual inputs.

Metrics should carry source and verification information as the module evolves.

## Provider abstraction

The live provider currently follows a pattern such as:

```text
HybridLiveWrProspectProvider
  -> B4MeWRMetrics
```

Provider logic must remain behind an interface.

The application use case should not depend on provider-specific DTOs.

## Endpoints

Required or expected endpoint concepts include:

```http
GET /api/b4me/prospects
GET /api/b4me/prospects/:id
POST /api/b4me/wr/live-evaluate
```

Preserve exact existing contracts when implementing.

## Evaluation workflow

For draft-class WR research indicators, use the prospect's final college season (normally `draftYear - 1`) and persist that season-selection policy in source metadata.

A normal evaluation should:

1. Resolve the prospect.
2. Resolve applicable position framework.
3. Load required metrics.
4. Record metric sources.
5. Apply coachability/RFA/RVA options where enabled.
6. Calculate an evaluation.
7. Persist metadata and results when required.
8. Return an explainable result.

## Explainability

An evaluation response should make clear:

- Inputs
- Missing inputs
- Source
- Framework/version
- Component scores
- Total score
- Warnings
- Recommendation or grade

Avoid opaque single-number output.

## Reproducibility

Persist enough metadata to distinguish:

- Live evaluation
- Stored evaluation
- Framework version
- Metric version
- Evaluation date
- User/manual overrides

## Client behavior

The analysis view includes concepts such as:

- Position group
- Draft year
- Player name
- Coachability toggle
- RFA toggle
- RVA toggle

Dependent controls should update deliberately and preserve valid user input.

## Testing

Test:

- Prospect search filters
- Prospect lookup
- Missing prospect
- Missing metrics
- Provider failure
- WR formula calculation
- Framework version
- Toggle behavior
- Persisted evaluation
- Repeated evaluation determinism
