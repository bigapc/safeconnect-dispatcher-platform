# Deployment Guide

## Frontend on Vercel

1. Import repository in Vercel
2. Set root directory to `apps/dispatcher-web`
3. Configure `NEXT_PUBLIC_API_URL`
4. Deploy using `npm run build -w dispatcher-web`

## Backend on Railway

1. Create Railway service from repository
2. Set root directory to `apps/dispatcher-api`
3. Configure environment variables from `.env.example`
4. Build command: `npm run build -w dispatcher-api`
5. Start command: `npm run start -w dispatcher-api`

## Database on Supabase

1. Provision PostgreSQL project
2. Copy connection string into `DATABASE_URL`
3. Run Prisma migration pipeline before enabling traffic
