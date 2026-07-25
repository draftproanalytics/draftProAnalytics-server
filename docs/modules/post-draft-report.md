# Post-Draft Report Module

## Purpose

The Post-Draft Report module provides reproducible team and prospect evaluations after an NFL draft.

It should support snapshots that remain interpretable even when future metrics, provider data, or evaluation rules change.

## Goals

- Reproducible evaluation
- Explicit source metadata
- Stable report snapshots
- Provider-neutral metric ingestion
- Manual and CSV insertion points
- Verification status
- Precedence rules
- Position-specific evaluation

## Current phase

The current foundation includes post-draft metrics and reports, with work progressing toward reproducible wide-receiver evaluation and report snapshots.

Relevant route pattern:

```http
GET /api/post-draft-report/teams/:teamId/years/:draftYear
```

Use the exact route registered in the repository.

## Snapshot principle

A report snapshot should capture enough information to reproduce or explain the result:

- Draft year
- Team
- Prospect/player
- Metrics used
- Metric source
- Source timestamp
- Verification status
- Framework/version
- Weights or thresholds
- Calculated scores
- Narrative conclusions
- Snapshot timestamp

Do not recalculate an old report silently using new rules unless explicitly requested.

## Provider-neutral ingestion

Metrics should enter through an internal contract, regardless of source.

Potential sources:

- DPA database
- Manual entry
- CSV import
- Public/free providers
- Paid providers added later

Provider-specific fields should be mapped at the infrastructure boundary.

## Precedence

When multiple values exist for the same metric, precedence must be explicit.

An example order may be:

1. Verified manually curated value
2. Verified preferred provider
3. Verified alternate provider
4. Unverified imported value
5. Calculated fallback

The actual order must be configured and documented rather than inferred ad hoc.

## Verification

Suggested states:

- unverified
- verified
- rejected
- superseded

Keep verification status distinct from source precedence.

## Report generation

Report generation should:

- Resolve the applicable metric set
- Record selected sources
- Apply a versioned evaluation framework
- Persist the generated snapshot
- Return the persisted snapshot
- Avoid hidden provider calls during simple report retrieval

## HTTP handlers

Async Express handlers must return consistently.

After sending a response, use `return` where needed so all code paths satisfy strict TypeScript and do not continue execution.

## Testing

Test:

- Deterministic generation
- Snapshot retrieval
- Framework-version retention
- Missing metric behavior
- Provider precedence
- Verification behavior
- Manual override
- CSV duplicate handling
- Historical snapshot stability
