FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/dispatcher-api/package.json apps/dispatcher-api/package.json
COPY packages ./packages
RUN npm ci

FROM deps AS build
WORKDIR /app
COPY . .
RUN npm run build -w dispatcher-api

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/apps/dispatcher-api/dist ./dist
COPY --from=build /app/apps/dispatcher-api/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
EXPOSE 3001
CMD ["node", "dist/main.js"]
