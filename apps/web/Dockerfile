FROM node:22-alpine

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json

RUN pnpm install --frozen-lockfile=false

COPY . .

RUN pnpm --dir apps/web build

RUN mkdir -p /app/apps/web/.next/standalone/apps/web/.next && \
    cp -r /app/apps/web/.next/static /app/apps/web/.next/standalone/apps/web/.next/static && \
    cp -r /app/apps/web/public /app/apps/web/.next/standalone/apps/web/public || true

EXPOSE 3000

CMD ["sh", "-c", "cd /app/apps/web/.next/standalone/apps/web && HOSTNAME=0.0.0.0 PORT=3000 node server.js"]