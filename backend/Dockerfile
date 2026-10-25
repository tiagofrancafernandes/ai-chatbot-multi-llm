FROM node:22-alpine AS builder

WORKDIR /app

ENV CI=true
RUN npm install -g pnpm@11.10.0

COPY pnpm-lock.yaml package.json pnpm-workspace.yaml ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/

RUN pnpm install --frozen-lockfile

COPY backend ./backend

RUN pnpm --filter backend build

FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
RUN npm install -g pnpm@11.10.0

COPY pnpm-lock.yaml package.json pnpm-workspace.yaml ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/

RUN pnpm install --prod --frozen-lockfile

COPY --from=builder /app/backend/dist ./backend/dist

WORKDIR /app/backend

EXPOSE 3001

CMD ["node", "dist/main"]
