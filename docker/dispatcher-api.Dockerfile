FROM node:20-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json* ./
COPY apps/dispatcher-api/package.json apps/dispatcher-api/package.json
COPY packages packages
RUN npm install

FROM deps AS build
COPY . .
RUN npm run build -w dispatcher-api

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/apps/dispatcher-api/dist ./dist
COPY --from=build /app/apps/dispatcher-api/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
EXPOSE 3001
CMD ["node", "dist/main.js"]
