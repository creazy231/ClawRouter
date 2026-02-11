# ---- Build stage ----
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first (layer caching)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build
COPY tsup.config.ts tsconfig.json ./
COPY src/ src/
RUN npm run build

# ---- Production stage ----
FROM node:20-alpine

WORKDIR /app

# Install only production deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy built output
COPY --from=builder /app/dist/ dist/

# Bind to 0.0.0.0 inside the container
ENV CLAWROUTER_BIND_HOST=0.0.0.0
ENV BLOCKRUN_PROXY_PORT=8402

EXPOSE 8402

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8402/health || exit 1

ENTRYPOINT ["node", "dist/cli.js"]
