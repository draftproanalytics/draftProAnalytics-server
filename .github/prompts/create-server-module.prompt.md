---
name: create-server-module
description: Scaffold or extend a DraftProAnalytics backend module using DDD, strict TypeScript, Express, Prisma, and MySQL-first schema rules.
agent: agent
argument-hint: "module=<moduleName> feature=<featureName> endpoints=<endpoints>"
---

Create or extend a DraftProAnalytics backend module.

Follow these rules:

- Use DDD, SOLID, Ubiquitous Language, and modular monolith vertical slices.
- Use strict TypeScript and never use `any`.
- Use this module shape: domain, application, infrastructure, presentation.
- Put repository interfaces in domain and Prisma implementations in infrastructure.
- Keep controllers thin and use cases explicit.
- Validate request bodies, params, and queries.
- Protect routes with `requireAuth` and `requirePermission(domainCode, actionCode)` when appropriate.
- Provide native MySQL DDL first for database changes.
- Then provide aligned Prisma model/schema notes.
- Include route registration, dependency wiring, cURL tests, and build/run steps.

Before writing code, inspect existing route/module patterns in the workspace and align with them. If assumptions are required, list them clearly before the code.
