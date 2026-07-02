# Installation Guide

## Prerequisites

- Node.js 20+
- npm 10+
- PostgreSQL 15+

## Install

```bash
cp .env.example .env
cp apps/dispatcher-web/.env.example apps/dispatcher-web/.env.local
npm install
```

## Database

Set `DATABASE_URL` in `.env`.

Generate Prisma client:

```bash
npm run prisma:generate -w @safeconnect/database
```

Run migrations:

```bash
npm run prisma:migrate -w @safeconnect/database
```

## Run

```bash
npm run dev
```
