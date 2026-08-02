FROM node:22-bookworm-slim AS builder
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ARG NEXT_PUBLIC_APP_URL=https://africa.mcbuleli.org
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ARG ADMIN_EMAIL=editor@africa.mcbuleli.org
ARG ADMIN_PASSWORD=change-me-on-first-boot
ARG AUTH_SECRET=change-me-build-only
ENV ADMIN_EMAIL=$ADMIN_EMAIL
ENV ADMIN_PASSWORD=$ADMIN_PASSWORD
ENV AUTH_SECRET=$AUTH_SECRET
ENV DATABASE_URL=file:./data/africa-insight.db

RUN npm run build \
  && mkdir -p data \
  && npm run db:push \
  && npm run db:seed

FROM node:22-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV DATABASE_URL=file:./data/africa-insight.db

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates gosu \
  && rm -rf /var/lib/apt/lists/* \
  && addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/node_modules/better-sqlite3 ./node_modules/better-sqlite3
COPY --from=builder /app/data/africa-insight.db ./docker-seed/africa-insight.db
COPY ops/vps/docker-entrypoint.sh /app/docker-entrypoint.sh

RUN chmod +x /app/docker-entrypoint.sh \
  && mkdir -p /app/data /app/public/uploads \
  && chown -R nextjs:nodejs /app/data /app/public/uploads /app/docker-seed

EXPOSE 3000
ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["node", "server.js"]
