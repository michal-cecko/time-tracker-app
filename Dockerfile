# syntax=docker/dockerfile:1.7
# ───── build stage ─────
FROM oven/bun:1-alpine AS build
WORKDIR /app

# Inject the production API base at build time.
ARG VITE_API_BASE=https://lapse.cecko.dev/api/v1
ENV VITE_API_BASE=${VITE_API_BASE}

COPY package.json bun.lockb* ./
RUN bun install --frozen-lockfile || bun install

COPY tsconfig.json vite.config.ts index.html ./
COPY src ./src
RUN bun run build

# ───── runtime stage ─────
FROM nginx:1.27-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
