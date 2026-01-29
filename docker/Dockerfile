# Build frontend
FROM oven/bun:1 AS frontend-builder

WORKDIR /app

# Copy workspace files
COPY package.json bun.lockb* ./
COPY shared/ ./shared/
COPY frontend/ ./frontend/

# Install dependencies and build frontend
RUN bun install
RUN cd frontend && bun run build

# Final image
FROM oven/bun:1

WORKDIR /app

# Install smartmontools for SMART data (using debian-based bun image)
USER root
RUN apt-get update && apt-get install -y smartmontools && rm -rf /var/lib/apt/lists/*
USER bun

# Copy workspace files
COPY package.json bun.lockb* ./
COPY shared/ ./shared/
COPY backend/ ./backend/

# Copy frontend build from builder
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Install only production dependencies
RUN bun install --production

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
CMD ["bun", "run", "src/index.ts"]
