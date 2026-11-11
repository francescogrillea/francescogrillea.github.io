FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build:editor

FROM node:24-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production PORTFOLIO_MODE=editor HOSTNAME=0.0.0.0 PORT=12011 EDITOR_DATA_DIR=/data NEXT_TELEMETRY_DISABLED=1
RUN apt-get update && apt-get install -y --no-install-recommends git ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=build --chown=node:node /app/.next-editor/standalone ./
COPY --from=build --chown=node:node /app/.next-editor/static ./.next-editor/static
COPY --from=build --chown=node:node /app/public ./public
COPY --from=build --chown=node:node /app/content ./content
COPY --chown=node:node scripts/git-askpass.cjs ./scripts/git-askpass.cjs
RUN sed -i 's/\r$//' scripts/git-askpass.cjs && chmod +x scripts/git-askpass.cjs && mkdir -p /data /app/.next-editor/cache && chown -R node:node /data /app/.next-editor/cache
USER node
EXPOSE 12011
CMD ["node", "server.js"]
