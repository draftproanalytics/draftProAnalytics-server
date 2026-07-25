# Role-Based Access Control

## Roles

Current DPA roles:

| ID | Role |
|---:|---|
| 1 | public |
| 2 | dev |
| 3 | qa |
| 4 | admin |

A person may have assigned roles through `PersonRole`.

`Person.activeRid` represents the currently assumed or acting role.

`RoleAssumeRule` controls allowed role transitions.

## Current-user endpoint

The client uses:

```http
GET /api/access/me
```

The response should provide enough information to determine:

- Authenticated person
- Assigned roles
- Active role
- Allowed domains/actions
- Whether role assumption is available

## Assume-role endpoint

```http
POST /api/access/assume-role
Content-Type: application/json

{
  "roleName": "admin"
}
```

The server must validate:

- The target role exists
- The person is assigned or otherwise allowed to assume it
- A matching role-assumption rule permits the transition
- The person is active

## Visitor/public access

The public role currently allows these domains:

- DASHBOARD
- GAMES
- PLAYERS
- TEAMS
- SCHEDULES
- STANDINGS
- PLAYOFFS
- DRAFT_ORDER

Navigation requirements may be narrower than raw domain access. For the public role, the following top-level menu groups are intended to remain hidden where specified by the current UI policy:

- Players
- Draft Menu

Any apparent conflict between domain access and navigation visibility must be resolved deliberately rather than by guessing.

## Client responsibilities

The client should:

- Load the current access context
- Hide unavailable navigation items
- Attach domain/action metadata to protected routes
- Enforce route guards
- Update navigation and guards after role assumption
- Clear access state on logout
- Display an appropriate unauthorized/forbidden state

The client must not treat hidden navigation as security.

## Server responsibilities

The server should:

- Authenticate the caller
- Resolve the active role
- Validate domain/action permission
- Enforce role-assumption rules
- Reject inactive users
- Return `401` for unauthenticated requests
- Return `403` for authenticated but unauthorized requests
- Avoid exposing unnecessary role internals

## Route metadata

Protected Vue routes should use the established metadata convention, conceptually:

```ts
meta: {
  domain: 'JOBS',
  action: 'RUN'
}
```

Use exact existing domain/action constants where available.

## Menu filtering

Menu filtering should be derived from the same access model as route authorization.

Avoid:

- Hard-coding usernames
- Checking numeric role IDs throughout components
- Duplicating permission matrices in multiple files
- Assuming `admin` solely from a label in local storage

## Testing

RBAC changes should test:

- Public navigation
- Public direct-route access
- Admin access
- Inactive user behavior
- Missing authentication
- Forbidden access
- Successful role assumption
- Denied role assumption
- State refresh after assumption
- Logout state clearing
