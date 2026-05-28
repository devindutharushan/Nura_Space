# Build context must be the repo root (workspaces share a single lockfile).
FROM node:20-alpine AS builder
WORKDIR /repo
COPY package.json package-lock.json ./
COPY server/package.json ./server/
COPY client/package.json ./client/
RUN npm ci --workspace=nura-space-server --include-workspace-root=false
COPY server ./server
RUN npm run build --workspace=nura-space-server

FROM node:20-alpine
WORKDIR /repo
COPY package.json package-lock.json ./
COPY server/package.json ./server/
COPY client/package.json ./client/
RUN npm ci --workspace=nura-space-server --include-workspace-root=false --omit=dev
COPY --from=builder /repo/server/dist ./server/dist
WORKDIR /repo/server
EXPOSE 3001
CMD ["node", "dist/index.js"]
