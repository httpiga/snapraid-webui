# Build frontend
FROM node:22-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy package files
COPY frontend/package.json frontend/pnpm-lock.yaml* ./
COPY pnpm-workspace.yaml ../
COPY shared/ ../shared/

# Install pnpm and dependencies
RUN corepack enable && pnpm install --frozen-lockfile

# Copy source and build
COPY frontend/ ./
RUN pnpm run build

# Build backend
FROM node:22-alpine AS backend-builder

WORKDIR /app/backend

# Copy package files
COPY backend/package.json backend/pnpm-lock.yaml* ./
COPY pnpm-workspace.yaml ../
COPY shared/ ../shared/

# Install pnpm and dependencies
RUN corepack enable && pnpm install --frozen-lockfile

# Copy source
COPY backend/ ./

# Final image
FROM node:22-alpine

WORKDIR /app

# Install pnpm
RUN corepack enable

# Install smartmontools for SMART data
RUN apk add --no-cache smartmontools

# Copy backend dependencies and source
COPY --from=backend-builder /app/backend/node_modules ./backend/node_modules
COPY --from=backend-builder /app/backend/package.json ./backend/
COPY --from=backend-builder /app/backend/src ./backend/src
COPY --from=backend-builder /app/shared ./shared

# Copy frontend build
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Create config directory
RUN mkdir -p /app/config

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV CONFIG_PATH=/app/config
ENV SNAPRAID_BIN=/usr/bin/snapraid

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Start the server
WORKDIR /app/backend
CMD ["npx", "tsx", "src/index.ts"]
