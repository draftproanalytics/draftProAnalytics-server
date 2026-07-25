# Definition of Done

A DPA change is done only when it satisfies the applicable items below.

## Scope

- The requested behavior is implemented.
- Acceptance criteria are explicit.
- No unrelated refactoring is included.
- Assumptions are documented.

## Architecture

- The owning feature module contains the behavior.
- Business logic is not placed in routers or views.
- Repository/provider boundaries are preserved.
- Manual dependency injection is used for new server modules.
- DPA ubiquitous language is used.

## Client

- Vue 3 Composition API is used.
- TypeScript remains strict.
- No `any` was introduced.
- API integration is typed.
- Loading, empty, success, and error states are handled.
- Route authorization metadata is correct.
- Mutations refresh local state.
- The client build succeeds.

## Server

- Router/controller code is thin.
- Use-case behavior is testable.
- Prisma access is behind infrastructure repositories.
- Inputs are validated.
- HTTP status codes are appropriate.
- Async handlers return consistently.
- Errors flow to centralized middleware.
- The server build succeeds.

## Database

- MySQL DDL is provided first for schema changes.
- Data impact is understood.
- Constraints reflect domain invariants.
- Prisma schema matches MySQL.
- Prisma validation succeeds.
- No destructive command was run without approval.
- Rollback is defined for risky changes.

## Security

- Authentication and authorization are enforced server-side.
- Secrets are not logged or committed.
- Environment files were not changed without approval.
- CORS changes are explicit.
- Sensitive errors are not exposed to clients.

## Testing

- A regression test exists when practical.
- Relevant unit/application/integration tests pass.
- Broader build/tests were run.
- Manual smoke testing was performed where needed.
- Skipped tests and remaining risks are disclosed.

## Git

- `git status` is understood.
- The diff contains only intended files.
- No destructive Git command was used without approval.
- Commit and push occur only when requested.
- Generated artifacts are intentionally included or excluded.

## Delivery report

The final implementation report states:

- What changed
- Files changed
- API/database effects
- Commands run
- Test/build results
- Manual validation
- Risks or follow-up items
