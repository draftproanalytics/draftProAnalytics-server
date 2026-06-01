---
applyTo: "src/**/*.ts"
---

# DraftProAnalytics Server TypeScript Instructions

- Use strict TypeScript.
- Never use `any`.
- Include all imports.
- Annotate function return types.
- Annotate Express `Request`, `Response`, and `NextFunction` when used.
- Use explicit DTO interfaces for request and response bodies.
- Use `unknown` in catch blocks and narrow safely.
- Avoid untyped JSON blobs in application code; define specific JSON types or safe records.
- Use `Readonly` or readonly properties where immutability protects domain intent.
- Prefer small, focused functions with clear input and output types.
