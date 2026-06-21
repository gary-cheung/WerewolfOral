# ── Build stage: compiles TypeScript + bundles frontend ──────────────────
FROM node:22-alpine AS build

WORKDIR /app

# Install ALL dependencies (including devDependencies needed for build)
COPY package*.json ./
RUN npm install

# Copy source
COPY . .

# Build: frontend (vite) + backend (esbuild)
# These run in parallel-ish — vite first, then esbuild
RUN npm run build

# ── Production stage: runtime-only dependencies ───────────────────────────
FROM node:22-alpine AS production

WORKDIR /app

# Only production dependencies
COPY package*.json ./
RUN npm install --omit=dev && npm install vite pg && npm cache clean --force

# Copy built artifacts from build stage
COPY --from=build /app/dist ./dist
COPY --from=build /app/shared ./shared

# Runtime env (overridden by Container App env vars)
ENV NODE_ENV=production
ENV PORT=5000

# Security: run as non-root
RUN addgroup -g 1001 appgroup && adduser -u 1001 -G appgroup -s /bin/sh -D appuser
USER appuser

EXPOSE 5000

CMD ["node", "dist/index.js"]
