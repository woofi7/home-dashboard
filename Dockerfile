FROM node:24-slim AS builder

WORKDIR /app
RUN npm install -g pnpm@9

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
ARG APP_VERSION=dev
ENV APP_VERSION=${APP_VERSION}
RUN rm -rf node_modules/.cache/nuxt && pnpm run build

# ---

FROM node:24-alpine AS runtime

WORKDIR /app

RUN apk add --no-cache su-exec

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=::
ENV CONFIG_DIR=/config

COPY --from=builder /app/.output ./.output

COPY docker-entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=5s --start-period=10s \
  CMD wget -qO- http://localhost:${PORT}/api/healthcheck || exit 1

ENTRYPOINT ["/entrypoint.sh"]
CMD ["node", ".output/server/index.mjs"]
