FROM node:22-alpine

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json

RUN pnpm install --frozen-lockfile=false

COPY . .

RUN pnpm --filter @portal/api prisma:generate
RUN pnpm --filter @portal/api build

EXPOSE 3001

CMD ["node", "apps/api/dist/src/main.js"]
