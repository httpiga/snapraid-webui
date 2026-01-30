# See https://bun.com/docs/guides/ecosystem/docker
# Install dependencies into a temp directory to cache them and avoid workspace symlink issues.

FROM oven/bun:1 AS base
WORKDIR /app

# Install dependencies into temp directory (speeds up future builds)
FROM base AS install
RUN mkdir -p /temp/dev
COPY package.json bun.lock* /temp/dev/
COPY shared/package.json /temp/dev/shared/package.json
COPY frontend/package.json /temp/dev/frontend/package.json
COPY backend/package.json /temp/dev/backend/package.json
RUN cd /temp/dev && bun install --frozen-lockfile
COPY shared/ /temp/dev/shared/
COPY frontend/ /temp/dev/frontend/
COPY backend/ /temp/dev/backend/

# Build frontend
FROM base AS frontend-builder
COPY --from=install /temp/dev /app
RUN cd /app/frontend && bun run build

# Install production dependencies into temp directory
FROM base AS install-prod
RUN mkdir -p /temp/prod
COPY package.json bun.lock* /temp/prod/
COPY shared/package.json /temp/prod/shared/package.json
COPY backend/package.json /temp/prod/backend/package.json
COPY frontend/package.json /temp/prod/frontend/package.json
RUN cd /temp/prod && bun install --frozen-lockfile --production --ignore-scripts
COPY shared/ /temp/prod/shared/
COPY backend/ /temp/prod/backend/
COPY --from=frontend-builder /app/frontend/dist /temp/prod/frontend/dist

# Final image: copy production node_modules and source (no bun install in final stage)
FROM base AS release
USER root
RUN apt-get update && apt-get install -y smartmontools snapraid && rm -rf /var/lib/apt/lists/*

COPY --from=install-prod /temp/prod /app
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

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
