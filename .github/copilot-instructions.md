# DraftProAnalytics Server — Copilot Workspace Instructions

These instructions apply to the DraftProAnalytics backend workspace.

## Project identity

- Treat this repository as the DraftProAnalytics server app.
- Use Node.js, Express REST APIs, Prisma, MySQL, and dotenv.
- Use strict TypeScript. Do not use `any`.
- Use native MySQL DDL as the source of truth for database changes.
- Align Prisma schema from MySQL after DDL changes, typically with `prisma db pull`.
- Prefer manual dependency injection for new modules unless the existing module already requires another pattern.
- Follow DDD, SOLID, Ubiquitous Language, and modular monolith design.

## Architecture

Use a module-first vertical slice structure:

```text
src/modules/<moduleName>/
  domain/
    entities/
    valueObjects/
    services/
    repositories/
  application/
    dtos/
    mappers/
    useCases/
    services/
  infrastructure/
    persistence/
    repositories/
    externalClients/
  presentation/
    controllers/
    routes/
    validators/
```

Shared code belongs under `src/shared` and should mirror the same layer boundaries when appropriate.

## Layering rules

- Domain contains business concepts, entities, value objects, domain services, and repository interfaces.
- Application contains use cases, application services, DTOs, and mappers.
- Infrastructure contains Prisma implementations, external API clients, logging implementations, and persistence details.
- Presentation contains Express routes, controllers, request validation, and HTTP mapping.
- Controllers must stay thin and call application use cases.
- Application and domain code must not depend on Express request/response objects.
- Domain code must not depend on Prisma types.
- Repository interfaces belong in domain; Prisma repository implementations belong in infrastructure.

## TypeScript rules

- Use strict TypeScript.
- Never use `any`.
- Always include proper imports.
- Always annotate Express `Request`, `Response`, and `NextFunction` when used.
- Always annotate DTOs, interfaces, repository contracts, use case input/output types, and function return types.
- Use `unknown` with safe narrowing for caught errors.
- Avoid implicit `Promise<any>` or untyped JSON shapes.
- Define explicit JSON DTO types when returning structured JSON from APIs.

## Database rules

- Provide native MySQL DDL first for schema changes.
- Treat MySQL as authoritative.
- After DDL, provide the aligned Prisma schema model or instructions to run `prisma db pull`.
- Do not create duplicate tables when an existing table must be reused.
- For Draft Day Scorecard work, reuse the existing `DraftPick` table.
- Preserve existing table names and column names unless the task explicitly requires a migration plan.
- Include indexes, unique constraints, foreign keys, default values, and seed data when needed.

## API rules

- Use Express routers mounted under `/api` conventions already present in the app.
- Keep route handlers thin.
- Validate request params, query strings, and bodies before calling use cases.
- Return typed JSON response DTOs.
- Use consistent error handling through the app's error middleware.
- Include cURL examples when adding endpoints.
- Do not invent routes without showing route registration in `app.ts` or the appropriate aggregate router.

## Auth and RBAC

- Use `requireAuth` and `requirePermission(domainCode, actionCode)` for protected routes.
- Recognize permission actions: `VIEW`, `EDIT`, `CREATE`, `DELETE`, and `RUN`.
- Use feature domain codes such as `TEAMS`, `PLAYERS`, `GAMES`, `DRAFT`, `TEAM_NEEDS`, `JOBS`, `SCRAPERS`, and feature-specific codes already present in the database.
- Do not hard-code role names in business logic when permission checks are available.
- Use `GET /api/access/me` and `POST /api/access/assume-role` conventions for access context and role switching.
- JWT user extraction may use claims such as `sub`, `pid`, `id`, or `userId`; normalize to a typed authenticated user shape.

## External data and jobs

- For ESPN integrations, isolate HTTP calls in infrastructure external clients.
- Keep import orchestration in application use cases or services.
- Map ESPN IDs to DPA IDs explicitly.
- Preserve separation between Prospect imports and Player/DraftPick imports.
- Prospect imports populate and update the `Prospect` table for B4Me analytics.
- Current-year drafted-player imports populate or update Player, PlayerTeam, and existing DraftPick-related data as appropriate.
- Jobs should record status, logs, started/finished timestamps, result codes, and structured result JSON when supported by the current schema.

## Environment management

- Use `.env.development`, `.env.stage`, and `.env.production` files for environment-specific configuration.
- Load environment variables with `dotenv` in the application bootstrap.
- Never commit secrets or sensitive data to version control.
- Use `.env.example` as a template for required environment variables.
- Access variables via `process.env.VARIABLE_NAME` in server code.
- Validate required environment variables at application startup.
- See [server-environment.instructions.md](.github/instructions/server-environment.instructions.md) for detailed environment management guidelines.

## Logging

- Use the global logger service at `src/utils/Logger.ts` for all observability. Replace all `console.log`, `console.warn`, and `console.error` calls.
- Create module-specific loggers with `createLogger('ModuleName')` at the top of each file.
- Use log levels deliberately: `debug` for diagnostic detail, `info` for workflow events, `warn` for recoverable issues, `error` for failures.
- Log at architectural boundaries: use case entry/exit, repository operations, external API calls, and error contexts.
- Do not log passwords, tokens, sensitive credentials, or verbose repetitive data.
- Control logging via `ENABLE_DEBUG` and `LOG_LEVEL` environment variables.
- See [server-logging.instructions.md](.github/instructions/server-logging.instructions.md) for detailed examples and conventions.

## Output expectations for Copilot

- Provide complete files or precise diffs with exact paths.
- Include all imports.
- Include MySQL DDL before Prisma schema changes.
- Include route registration, dependency wiring, and integration steps.
- Include cURL/manual test steps.
- Include build/run guidance.
- Do not produce pseudo-code when implementation code is requested.
