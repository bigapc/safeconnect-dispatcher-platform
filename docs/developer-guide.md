# Developer Guide

## Architecture

- Controller layer: request/response boundary (`apps/dispatcher-api/src/**/*.controller.ts`)
- Service layer: business logic (`apps/dispatcher-api/src/**/*.service.ts`)
- Repository layer: persistence abstraction (`apps/dispatcher-api/src/repositories`)
- Shared packages: reusable cross-app code (`packages/*`)

## TypeScript Standards

- `strict` mode enabled
- DTO-based validation in NestJS
- zod-based env validation for runtime safety

## Local Checks

```bash
npm run lint
npm run typecheck
npm run build
```
