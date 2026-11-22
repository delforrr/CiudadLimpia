FROM node:24-bookworm-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && npm install --global npm@11.17.0 --ignore-scripts --no-audit --no-fund
WORKDIR /app

FROM base AS build
COPY package.json package-lock.json .npmrc ./
RUN npm ci --ignore-scripts --no-audit --no-fund
COPY . .
RUN DATABASE_URL=postgresql://localhost/build npm run prisma:generate \
    && npm run build

FROM build AS production-dependencies
RUN npm prune --omit=dev --omit=optional --ignore-scripts --no-audit --no-fund

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=production-dependencies /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/prisma.config.ts ./prisma.config.ts
COPY --from=build /app/prisma ./prisma
USER node
EXPOSE 3000
CMD ["sh", "-c", "npm run prisma:migrate && exec node dist/main.js"]
