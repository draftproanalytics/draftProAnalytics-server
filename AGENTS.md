# DraftProAnalytics Server Agent Instructions

## Project

DraftProAnalytics is an NFL analytics and draft-management application.

This repository contains the server application.

### Technology

- Node.js
- Express
- TypeScript strict mode
- Prisma
- MySQL 8
- dotenv
- Vitest
- Modular monolith
- Domain-driven design
- SOLID principles

## Required reading

Before making changes, read the documentation relevant to the task:

- `docs/architecture/overview.md`
- `docs/architecture/server-conventions.md`
- `docs/architecture/database-policy.md` for schema or persistence work
- `docs/architecture/rbac.md` for authentication or authorization work
- The applicable file under `docs/modules/`
- `docs/development/testing.md`
- `docs/development/definition-of-done.md`

## Architecture rules

- Organize code by feature/module.
- Preserve domain, application, infrastructure, and presentation boundaries.
- Use manual dependency injection for new modules.
- Do not introduce tsyringe or another dependency-injection framework.
- Use domain-specific nouns and verbs.
- Keep Express request/response concerns in the presentation layer.
- Keep use cases in the application layer.
- Keep Prisma access in infrastructure repositories.
- Do not access Prisma directly from route handlers.
- Do not place business rules in Express routers.
- Define repository contracts at the application or domain boundary.
- Keep provider-specific integrations behind interfaces.
- Validate request input at the application boundary.
- Use centralized error handling.
- Preserve modular-monolith boundaries instead of creating cross-module imports for convenience.

## Ubiquitous language

Prefer domain names and verbs such as:

- `evaluateProspect`
- `seedDraftPicks`
- `assumeRole`
- `importCollegeProspects`
- `completeDraftPick`
- `loadSeasonSchedule`
- `calculateDraftOrder`
- `linkPlayerToTeam`
- `recordDraftSelection`

Avoid vague names such as:

- `processData`
- `handleItem`
- `doWork`
- `manager`
- `helper` without a specific domain responsibility

## Database rules

MySQL is the source of truth.

For schema changes:

1. Inspect the current MySQL structure.
2. Propose native MySQL DDL first.
3. Explain data migration, locking, compatibility, and rollback concerns.
4. Obtain approval before destructive or production-impacting operations.
5. Update `prisma/schema.prisma` to match the approved MySQL structure.
6. Run Prisma validation and generation.
7. Do not create or run Prisma migrations unless explicitly requested.
8. Do not use `prisma db push` unless explicitly requested.

Never modify production data or connect to production unless explicitly instructed.

## TypeScript rules

- Keep strict TypeScript enabled.
- Do not use `any`.
- Narrow `unknown` errors safely.
- All Express handlers must return consistently.
- Prefer explicit DTOs, command/query objects, domain types, and repository return types.
- Do not suppress compiler errors with broad casts.
- Avoid leaking Prisma-generated types into presentation contracts unless that is already the deliberate module pattern.
- Treat nullable database values explicitly.

## Change discipline

Before editing:

1. Inspect the router, controller/handler, use case, repository interface, repository implementation, Prisma models, providers, and relevant tests.
2. Trace the request from HTTP entry point to persistence.
3. Explain the current behavior and root cause.
4. Present a concise implementation plan.
5. List the files expected to change.
6. Identify database or API compatibility implications.

During implementation:

- Make the smallest complete change.
- Avoid unrelated refactoring.
- Preserve endpoint contracts unless explicitly changing them.
- Add tests for changed business behavior.
- Preserve idempotency for import and queue jobs where applicable.
- Do not overwrite unrelated Player, Team, DraftPick, Prospect, or PlayerTeam data.
- Use transactions when one business operation must update multiple records atomically.
- Log actionable context without secrets or full sensitive payloads.
- Do not create hidden fallback behavior that masks bad data.

After implementation:

```bash
npx prisma validate
npx prisma generate
npm run build
npm test
```

When the complete test suite is inappropriate, run the relevant test files and explain why.

Report:

- Files changed
- Endpoint or behavior implemented
- Database implications
- Commands executed
- Test results
- Remaining risks or assumptions

## HTTP and error handling

- Keep routers thin.
- Parse and validate route params, query params, and request bodies explicitly.
- Return appropriate HTTP status codes.
- Pass unexpected errors to centralized error middleware.
- Do not expose stack traces or internal implementation details to clients.
- Ensure async handlers either return a response or delegate errors consistently.
- Keep CORS configuration environment-driven and validate parsed origin lists.

## Jobs and imports

- Queue submission and queue processing are separate responsibilities.
- Jobs must have stable, domain-specific type names.
- Job progress should be meaningful and monotonic where possible.
- Import operations should be idempotent or explicitly document why they are not.
- Preserve source metadata and verification status when applicable.
- Provider failures should be retriable only when retrying is safe.
- Do not let fallback provider data overwrite higher-quality existing data without an explicit precedence rule.

## Git and environment safety

- Do not commit or push unless explicitly requested.
- Do not change branches unless explicitly requested.
- Do not edit `.env`, `.env.development`, or production configuration without explicit approval.
- Never print secrets.
- Do not execute destructive Git, Prisma, MySQL, or filesystem commands without explicit approval.
- Do not delete backups, logs, or untracked files without explicit approval.

## Delivery standard

A server feature is not complete until:

- The HTTP contract is implemented.
- Application behavior is implemented outside the router.
- Persistence is behind a repository boundary.
- Input validation and error handling are present.
- Database implications are documented.
- Relevant tests pass.
- Prisma validation succeeds when Prisma is affected.
- `npm run build` succeeds.
