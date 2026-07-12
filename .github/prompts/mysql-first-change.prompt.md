---
name: mysql-first-change
description: Design a DraftProAnalytics database change using native MySQL DDL first, then Prisma alignment and integration notes.
agent: ask
argument-hint: "feature/schema change description"
---

Design the requested DraftProAnalytics database change.

Required output order:

1. Native MySQL DDL as the source of truth.
2. Indexes, foreign keys, unique constraints, defaults, and seed data if needed.
3. Prisma schema alignment notes or expected introspected model shape.
4. Repository/use case impacts.
5. API impacts.
6. Client impacts if known.
7. Manual verification SQL.
8. Rollback notes for destructive changes.

Do not generate Prisma-first migrations. Do not create duplicate tables for existing DPA domain concepts.
