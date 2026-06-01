---
name: review-server-module
description: Review a DraftProAnalytics backend module for DDD boundaries, strict typing, RBAC, route wiring, and database correctness.
agent: ask
argument-hint: "module or selected files"
---

Review the selected DraftProAnalytics backend code.

Check for:

- DDD layer violations.
- SOLID violations.
- Use of `any` or implicit untyped values.
- Missing imports or return types.
- Prisma types leaking into domain.
- Express objects leaking into application/domain layers.
- Controllers doing business logic.
- Missing request validation.
- Missing `requireAuth` or `requirePermission` on protected routes.
- Route mounting mistakes that can cause 404s.
- MySQL-first schema alignment issues.
- Duplicate table creation where an existing table should be reused.
- Missing cURL/manual test steps.

Return a prioritized issue list first. Then provide exact code patches for the highest-impact fixes.
