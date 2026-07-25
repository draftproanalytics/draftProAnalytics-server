# Database Policy

## Source of truth

The live MySQL 8 schema is the DPA database source of truth.

Prisma must match the approved MySQL structure. Prisma migrations are not the default schema-management mechanism for this project.

## Required workflow for schema changes

1. Inspect the current MySQL definition.
2. Produce native MySQL DDL.
3. Review compatibility and data impact.
4. Back up affected data when appropriate.
5. Apply the approved DDL in the correct environment.
6. Update Prisma schema to match.
7. Run:

```bash
npx prisma validate
npx prisma generate
npm run build
```

8. Run affected tests and smoke-test the endpoint.

## Prohibited by default

Do not run these unless explicitly approved:

```bash
npx prisma migrate dev
npx prisma migrate deploy
npx prisma db push
```

Do not:

- Drop production tables
- Truncate production tables
- Restore backups over a live database
- Modify production rows for testing
- Remove foreign keys or unique constraints to make an import pass

## DDL standards

New or changed tables should normally include:

- Primary key
- Required foreign keys
- Appropriate unique constraints
- Supporting indexes
- `createdAt`
- `updatedAt`
- Explicit delete/update behavior
- Character set and collation consistent with DPA

Use native MySQL behavior deliberately. Do not add triggers when `DEFAULT CURRENT_TIMESTAMP` and `ON UPDATE CURRENT_TIMESTAMP` already satisfy the requirement.

## Naming

Preserve established DPA table naming unless a deliberate migration is approved.

Foreign key fields should clearly identify their target, such as:

- `teamId`
- `playerId`
- `prospectId`
- `draftEventId`

Provider identifiers should remain distinct:

- `espnAthleteId`
- `espnTeamId`

Do not store provider IDs in DPA primary-key fields.

## Nullability

Nullability must reflect actual domain meaning.

Use nullable fields for genuinely unknown or not-yet-assigned values. Do not use `NULL` as an undocumented status flag.

## Unique constraints

Unique constraints should encode real invariants.

Examples:

- One team need per team, draft year, and position when that is the intended rule
- One draft event per draft year when duplicates are invalid
- One provider identity per provider entity
- One pick number per draft event

Before adding a unique constraint, identify and clean existing duplicates safely.

## Imports and upserts

Upserts must use stable identities.

Do not use names alone when provider IDs or composite natural keys exist.

An import must document:

- Match key
- Fields allowed to update
- Fields never allowed to overwrite
- Source precedence
- Conflict behavior
- Idempotency expectations

## Date and time

- Use UTC for stored timestamps unless an established table uses another convention.
- Let the API/UI format timestamps for the user.
- Use MySQL `YEAR` only when its behavior matches the requirement; otherwise use an integer.
- Store NFL season year separately from calendar timestamps.

## Backups and restoration

Before destructive schema or data repair:

- Confirm the database name
- Confirm environment
- Record backup file path
- Validate the backup is readable
- Define rollback steps

A backup is not considered valid merely because a file exists.

## Prisma synchronization

When MySQL changes independently, use:

```bash
npx prisma db pull
```

Review the resulting diff before accepting it. Introspection may alter relation names, mappings, comments, or formatting.

Never accept a large Prisma diff without confirming that it reflects intended database changes.
