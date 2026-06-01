---
applyTo: "**/*.{sql,prisma,ts,md}"
---

# DraftProAnalytics Database Instructions

- MySQL DDL is the source of truth.
- Provide native MySQL DDL before Prisma schema changes.
- Align Prisma by introspecting MySQL with `prisma db pull` unless a task explicitly requests another flow.
- Include indexes, unique constraints, foreign keys, default values, and seed data where needed.
- Do not create duplicate tables for existing domain concepts.
- Reuse the existing `DraftPick` table for Draft Day Scorecard work.
- Be careful with enum/table naming inconsistencies; propose a unification plan before broad changes.
- Keep database names aligned with established DPA schema conventions.
- Include rollback notes for destructive changes.
