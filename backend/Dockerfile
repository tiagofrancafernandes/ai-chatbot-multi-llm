FROM node:22-alpine AS builder

WORKDIR /app

RUN npm install -g pnpm@11.10.0

COPY pnpm-lock.yaml package.json pnpm-workspace.yaml .npmrc ./
COPY backend/package.json ./backend/

RUN pnpm install --ignore-scripts --frozen-lockfile --filter backend

COPY backend ./backend

RUN pnpm --filter backend build

FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
RUN npm install -g pnpm@11.10.0

COPY pnpm-lock.yaml package.json pnpm-workspace.yaml .npmrc ./
COPY backend/package.json ./backend/

RUN pnpm install --prod --ignore-scripts --frozen-lockfile --filter backend

COPY --from=builder /app/backend/dist ./backend/dist

WORKDIR /app/backend

EXPOSE 3001

CMD ["node", "dist/main"]

