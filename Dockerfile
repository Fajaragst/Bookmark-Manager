FROM oven/bun:alpine
WORKDIR /app

# Setup production environment
ENV NODE_ENV=production

# Copy package.json and bun.lock
COPY package.json bun.lock ./

# Install dependencies
RUN bun install

# Copy source code
COPY . .

# Build the application
RUN bun run build

# Create a non-root user and switch to it
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs && \
    chown -R nodejs:nodejs /app
USER nodejs

# Start the server
CMD ["bun", "src/index.ts"]

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD bun fetch http://localhost:3000/ || exit 1