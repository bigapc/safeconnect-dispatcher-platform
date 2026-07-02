# SafeConnect Dispatcher Platform

SafeConnect Dispatcher Platform is a production-grade monorepo for dispatch operations across organizations.

## Monorepo Structure

- `apps/dispatcher-web`: Next.js 15 frontend for dispatch operations
- `apps/dispatcher-api`: NestJS backend API with Prisma, JWT auth, and realtime Socket.IO
- `packages/auth`: Shared auth contracts and validation
- `packages/database`: Prisma schema and database utilities
- `packages/ui`: Shared UI utility functions
- `packages/notifications`: Nodemailer and Twilio notification client
- `packages/maps`: Mapbox helper utilities
- `packages/ai`: Dispatch prioritization utilities
- `packages/billing`: Stripe client factory

## Quick Start

1. Copy environment template
2. Install dependencies
3. Start development services

```bash
cp .env.example .env
cp apps/dispatcher-web/.env.example apps/dispatcher-web/.env.local
npm install
npm run dev
```

## Commands

- `npm run dev`: run frontend and backend in development mode
- `npm run build`: compile all workspaces
- `npm run lint`: lint all workspaces
- `npm run typecheck`: type-check all workspaces

## Production Targets

- Frontend: Vercel
- Backend: Railway
- Database: Supabase PostgreSQL

See the `docs` directory for operational details.
