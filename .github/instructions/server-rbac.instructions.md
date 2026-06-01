---
applyTo: "src/**/*.ts"
---

# DraftProAnalytics Server RBAC Instructions

- Protect routes with `requireAuth` and `requirePermission(domainCode, actionCode)` when the endpoint is not public.
- Recognize permission actions: `VIEW`, `EDIT`, `CREATE`, `DELETE`, and `RUN`.
- Prefer permission-based authorization over role-name checks.
- Use feature domain codes already present in the database.
- Keep auth extraction and permission enforcement in middleware or presentation wiring, not in domain logic.
- Normalize authenticated user claims into a typed shape before use cases need the person id.
- Preserve the existing access context shape: `personId`, `userName`, `activeRid`, `activeRoleName`, `assignedRoles`, and effective permissions by domain.
- For role switching, verify both assigned role and role-assumption rules before updating `Person.activeRid`.
