# Testing Guide

## Objective

Every DPA change should be verified at the narrowest useful level and then at the repository level.

## Client checks

Minimum:

```bash
npm run build
```

Run the relevant test command defined by the repository.

Prioritize tests for:

- Typed API mapping
- Store actions
- Filter behavior
- Route metadata
- Dialog submission
- Error states
- Domain label mapping

Manual smoke tests should confirm:

- Page loads
- Filters behave correctly
- Requests contain correct parameters
- Mutations refresh the UI
- Errors are visible
- Authorization behaves correctly

## Server checks

Minimum when Prisma is unaffected:

```bash
npm run build
npm test
```

When Prisma schema or generated types are affected:

```bash
npx prisma validate
npx prisma generate
npm run build
npm test
```

Targeted Vitest example:

```bash
npm test -- tests/postDraftMetrics tests/postDraftReport
```

Use exact available test paths.

## Test layering

### Unit

Use for:

- Calculations
- Mapping
- Validation
- State transitions
- Precedence rules
- Domain services

### Application/use-case

Use for:

- Repository interaction
- Workflow orchestration
- Conflict handling
- Missing-data behavior
- Transaction expectations

### Integration

Use for:

- Router contracts
- Prisma repository behavior
- Provider adapter behavior
- Queue lifecycle

### Manual smoke test

Use for:

- Browser interaction
- Nginx/proxy behavior
- CORS
- OAuth redirects
- Production-like deployment

Manual testing does not replace automated tests for business rules.

## Regression strategy

When fixing a bug:

1. Reproduce it.
2. Add a failing test when practical.
3. Implement the fix.
4. Run the focused test.
5. Run the broader build/test suite.
6. Verify no unrelated diff.

## Build failures

Do not bypass:

- Strict TypeScript errors
- Missing packages
- Unresolved aliases
- Prisma model mismatches
- Peer dependency conflicts

Identify and correct the underlying configuration or dependency problem.

## Environment-dependent tests

Tests should not require production credentials.

Use:

- Test doubles
- Fixture data
- Local test databases
- Provider stubs

Never place secrets in test code or snapshots.

## Reporting

Every completed implementation should state:

- Commands run
- Passed/failed status
- Tests skipped
- Reason tests were skipped
- Manual checks performed
- Remaining untested risk
