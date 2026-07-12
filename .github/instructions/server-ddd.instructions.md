---
applyTo: "src/**/*.ts"
---

# DraftProAnalytics Server DDD Instructions

- Follow DDD and SOLID principles.
- Use module-first vertical slices under `src/modules/<moduleName>/`.
- Keep domain, application, infrastructure, and presentation boundaries clear.
- Put repository interfaces in domain.
- Put Prisma repository implementations in infrastructure.
- Put use cases and DTOs in application.
- Put controllers, routes, and validators in presentation.
- Keep controllers thin.
- Do not use Prisma types in domain entities or value objects.
- Do not use Express `Request` or `Response` in application or domain layers.
- Use Ubiquitous Language in file names, method names, variables, DTOs, and route names.
- Prefer domain behavior names over generic CRUD names.
