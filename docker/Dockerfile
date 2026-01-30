# See https://bun.com/docs/guides/ecosystem/docker
# Install dependencies into a temp directory to cache them and avoid workspace symlink issues.

FROM oven/bun:1 AS base
WORKDIR /app

# Install dependencies into temp directory (speeds up future builds)
FROM base AS install
RUN mkdir -p /temp/dev
COPY package.json bun.lock* /temp/dev/
COPY shared/ /temp/dev/shared/
COPY frontend/ /temp/dev/frontend/
COPY backend/ /temp/dev/backend/
RUN cd /temp/dev && bun install --frozen-lockfile

# Build frontend
FROM base AS frontend-builder
COPY --from=install /temp/dev/node_modules /app/node_modules
COPY package.json bun.lock* ./
COPY shared/ ./shared/
COPY frontend/ ./frontend/
COPY backend/ ./backend/
RUN cd frontend && bun run build

# Install production dependencies into temp directory
FROM base AS install-prod
RUN mkdir -p /temp/prod
COPY package.json bun.lock* /temp/prod/
COPY shared/ /temp/prod/shared/
COPY backend/ /temp/prod/backend/
COPY frontend/ /temp/prod/frontend/
COPY --from=frontend-builder /app/frontend/dist /temp/prod/frontend/dist
RUN cd /temp/prod && bun install --frozen-lockfile --production --ignore-scripts

# Final image: copy production node_modules and source (no bun install in final stage)
FROM base AS release
USER root
RUN apt-get update && apt-get install -y smartmontools snapraid && rm -rf /var/lib/apt/lists/*

COPY --from=install-prod /temp/prod/node_modules /app/node_modules
COPY package.json bun.lock* ./
COPY shared/ ./shared/
COPY backend/ ./backend/
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

RUN mkdir -p /app/config && chown -R bun:bun /app
USER bun

ENV NODE_ENV=production
ENV PORT=3000
ENV CONFIG_PATH=/app/config
ENV SNAPRAID_BIN=/usr/bin/snapraid

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

WORKDIR /app/backend
CMD ["bun", "run", "src/index.ts"]
