# Server Conventions

## Module organization

New server behavior should remain inside the owning feature module.

A typical module may include:

```text
src/modules/<feature>/
  domain/
  application/
  infrastructure/
  presentation/
  index.ts
```

Use the existing module structure when it differs.

## Presentation layer

Presentation code may:

- Define routes
- Parse route/query/body input
- Run boundary validation
- Invoke use cases
- Map application results to HTTP responses
- Pass unexpected failures to error middleware

Presentation code should not:

- Use Prisma directly
- Implement NFL calculations
- Contain provider fallback rules
- Coordinate multi-record persistence manually
- Hide exceptions with generic success responses

## Application layer

Use cases should:

- Have one recognizable business purpose
- Accept explicit input DTOs
- Return explicit results
- Depend on repository/provider interfaces
- Own orchestration and transaction requirements
- Be independently testable

Prefer names such as:

- `CalculateDraftOrder`
- `LoadSeasonSchedule`
- `CompleteDraftPick`
- `EvaluateWideReceiver`
- `LinkDraftedPlayerToTeam`

## Domain layer

Use domain objects when they improve correctness.

Good candidates:

- Draft order tie-break logic
- Draft pick status transitions
- Evaluation score rules
- Team record calculations
- Role transition rules
- Provider precedence policies

Avoid creating ceremony around simple CRUD records with no meaningful invariant.

## Infrastructure layer

Infrastructure implementations may:

- Use Prisma
- Call ESPN or another provider
- Read environment configuration
- Implement queue persistence
- Implement email delivery

Infrastructure must not redefine application behavior.

## Dependency injection

Use manual dependency injection.

Composition should happen at a module bootstrap or router factory boundary.

Example:

```ts
const repository = new PrismaTeamNeedRepository(prisma);
const addTeamNeed = new AddTeamNeed(repository);
const router = createTeamNeedRouter({ addTeamNeed });
```

Do not add a dependency-injection container for new modules.

## Express handlers

- Type route parameters and request DTOs.
- Return after sending a response.
- Delegate unexpected errors with `next(error)`.
- Avoid mixed response and `next` code paths.
- Keep handlers small.
- Use a reusable async wrapper only if already established and correctly typed.

## Validation

Validate:

- Numeric IDs
- Season years
- Season types
- Week values
- Enumerated statuses
- Required strings
- Array sizes for bulk operations
- Mutually dependent filters

Validation errors should be distinct from not-found and server errors.

## Repository behavior

Repositories should expose domain-relevant operations, not raw table access.

Prefer:

```ts
findGamesForTeamSeason(...)
saveDraftSelection(...)
activatePlayerTeamMembership(...)
findDraftPicksForEvent(...)
```

Avoid:

```ts
getAll(...)
runQuery(...)
updateAnything(...)
```

## Transactions

Use a transaction when failure of one write should invalidate the whole operation.

Examples:

- Complete a draft pick and update related event state
- Link a drafted player and update a matching draft pick
- Replace active player-team membership
- Seed a complete set of draft picks

Keep transaction scope narrow.

## External providers

- Hide provider DTOs behind adapters.
- Persist provider identifiers separately.
- Retry only transient and idempotent requests.
- Set timeouts.
- Record source metadata where required.
- Do not silently substitute low-quality fallback data.
- Make precedence rules explicit.

## Error handling

Distinguish:

- Validation error
- Not found
- Conflict
- Unauthorized
- Forbidden
- Provider unavailable
- Persistence failure
- Unexpected error

Do not expose credentials, SQL, stack traces, or internal filesystem paths in API responses.

## Logging

Log enough context to diagnose the operation:

- Module
- Use case
- Job ID
- Draft year
- Team ID
- Provider
- Error category

Do not log:

- Passwords
- OAuth secrets
- Tokens
- Session cookies
- Full authentication headers
- Private environment contents
