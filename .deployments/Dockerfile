#### Stage 1: Builder – install all deps & build React Router
FROM oven/bun:1-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
  ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY . .

RUN bun install --frozen-lockfile

ENV NODE_ENV=production

RUN bun run build


#### Stage 2: Runtime – minimal image for running the server
FROM oven/bun:1-slim AS runner

WORKDIR /app

RUN useradd -m appuser

COPY . .

RUN bun install --frozen-lockfile

# React 19 ships a Bun-specific server build (react-dom/server.bun.js) that only
# exports the web-stream renderer, NOT renderToPipeableStream. Bun always picks
# the "bun" export condition, so React Router's server build (which calls
# renderToPipeableStream) crashes at startup. Re-export the Node server build,
# which does provide renderToPipeableStream, so the "bun" condition resolves to it.
RUN printf 'export * from "./server.node.js";\n' > node_modules/react-dom/server.bun.js

# Copy built assets from builder
COPY --from=builder /app/build ./build

ENV NODE_ENV=production
EXPOSE 3000

RUN chown -R appuser:appuser /app
USER appuser

# All runtime config (MONGODB_URI, JWT_*, OPENAI_API_KEY, etc.)
# injected via `docker run -e` or docker-compose `environment` / `env_file`.
# Run server.ts directly with Bun. `bun run start:prod` invokes tsx, which
# crashes under Bun 1.3.x resolving its own './cjs/index.cjs' subpath export.
CMD ["bun", "server.ts"]
