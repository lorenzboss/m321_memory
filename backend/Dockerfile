# Ultra-lightweight production build for Backend
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependencies
COPY package*.json ./
COPY tsconfig.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy source and build
COPY src ./src
RUN npm run build

# Production stage - minimal image
FROM node:20-alpine

WORKDIR /app

# Install only production dependencies
COPY package*.json ./
RUN npm ci --only=production && \
    npm cache clean --force && \
    rm -rf /tmp/*

# Copy compiled code
COPY --from=builder /app/dist ./dist

# Security: non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 8000

CMD ["node", "dist/index.js"]
