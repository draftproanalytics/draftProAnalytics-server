# DraftProAnalytics Architecture Overview

## Purpose

DraftProAnalytics (DPA) supports NFL schedule analysis, team and player management, draft preparation, draft-day operations, post-draft reporting, jobs/imports, role-based access control, and prospect evaluation.

The system is intentionally built as a modular monolith. Features share one deployable client and one deployable server, but each feature should maintain clear ownership of its application logic and persistence behavior.

## Repositories

### Client

- Vue 3
- Vite
- TypeScript
- PrimeVue
- Pinia
- Vue Router
- Axios

### Server

- Node.js
- Express
- TypeScript
- Prisma
- MySQL 8
- Vitest

## Architectural style

DPA follows:

- Domain-driven design
- SOLID principles
- Package-by-feature organization
- Modular-monolith deployment
- Manual dependency injection
- MySQL-first schema management

## Core layers

### Presentation

Responsible for:

- HTTP routing
- Request parsing
- Response mapping
- Client views and components
- User interaction
- Transport-level validation

Presentation code must not own core business rules.

### Application

Responsible for:

- Use cases
- Commands and queries
- Workflow orchestration
- Transaction boundaries
- Repository contracts
- Provider contracts

Application code coordinates domain behavior but should not depend directly on Express or UI frameworks.

### Domain

Responsible for:

- Domain terminology
- Invariants
- Business calculations
- Value objects
- Entities and domain services where useful

Not every feature requires elaborate entities. Use the lightest domain model that preserves clarity and correctness.

### Infrastructure

Responsible for:

- Prisma repositories
- MySQL persistence
- ESPN or other provider integrations
- Email providers
- Queue adapters
- Logging and environment adapters

Infrastructure implements contracts owned by the application or domain boundary.

## Current feature areas

- Teams
- Players
- Prospects
- Combine Scores
- Player Awards
- Player Teams
- Team Needs
- Games
- Schedules
- Upcoming Games
- Standings
- Playoff Bracket
- Draft Order
- Draft Simulator
- Draft Picks
- Draft Day Scorecard
- Post-Draft Reports
- B4Me Analysis
- Jobs and Imports
- Access Control
- User Administration

## General design rules

- Prefer explicit domain behavior over generic utility layers.
- Do not create cross-feature imports solely to avoid a small duplication.
- Share only concepts that are truly stable across modules.
- Keep provider-specific identifiers separate from DPA primary keys.
- Keep API contracts explicit and version-compatible.
- Avoid silent data repair or fallback behavior.
- Make import precedence and verification rules explicit.
- Preserve auditability for draft, evaluation, role, and import operations.

## Request flow

A normal server request should follow this direction:

```text
Express Router
  -> Request Validation / Controller
  -> Application Use Case
  -> Repository or Provider Contract
  -> Infrastructure Implementation
  -> MySQL / External Provider
```

A normal client request should follow this direction:

```text
View / Component
  -> Pinia Store or Feature Composable
  -> Typed API Module
  -> Server Endpoint
  -> Typed Mapping
  -> Reactive UI State
```

## Dependency rule

Dependencies should point inward toward stable domain and application contracts.

The following are discouraged:

- Route handler -> Prisma
- Vue component -> raw Axios scattered inline
- Use case -> Express `Request` or `Response`
- Domain code -> Prisma-generated client
- Feature module -> unrelated feature infrastructure

## Definition of a successful architecture change

A change is architecturally successful when:

- The business rule has one clear owner.
- Framework details remain at the edges.
- Tests can exercise the rule without requiring the full application.
- Data changes are explicit and reversible.
- The implementation uses DPA terminology.
- The change does not create unnecessary coupling.
