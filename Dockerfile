# ─── Stage 1: Build ───────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# bcrypt requires native compilation
RUN apk add --no-cache python3 make g++

COPY package.json ./
RUN npm install

COPY . .
RUN npm run build

# ─── Stage 2: Production ──────────────────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

# bcrypt native modules need the same build tools at runtime
RUN apk add --no-cache python3 make g++

COPY package.json ./
RUN npm install --omit=dev

# Compiled JS and migrations
COPY --from=builder /app/dist ./dist
COPY migrations ./migrations

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

USER node

CMD ["node", "dist/app.js"]
