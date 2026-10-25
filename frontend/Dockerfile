FROM node:22-alpine AS builder

WORKDIR /app

RUN npm install -g pnpm@11.10.0

COPY pnpm-lock.yaml package.json pnpm-workspace.yaml .npmrc ./
COPY frontend/package.json ./frontend/

RUN pnpm install --frozen-lockfile --filter frontend --config.ignore-scripts=true

COPY frontend ./frontend

RUN pnpm --filter frontend build

FROM nginx:alpine AS runner

COPY --from=builder /app/frontend/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 5173

CMD ["nginx", "-g", "daemon off;"]

