FROM node:20-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json* ./
COPY apps/dispatcher-web/package.json apps/dispatcher-web/package.json
COPY packages packages
RUN npm install

FROM deps AS build
COPY . .
RUN npm run build -w dispatcher-web

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/apps/dispatcher-web/.next/standalone ./
COPY --from=build /app/apps/dispatcher-web/.next/static ./apps/dispatcher-web/.next/static
COPY --from=build /app/apps/dispatcher-web/public ./apps/dispatcher-web/public
EXPOSE 3000
CMD ["node", "apps/dispatcher-web/server.js"]
