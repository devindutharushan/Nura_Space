# Build context must be the repo root (workspaces share a single lockfile).
FROM node:20-alpine AS builder
WORKDIR /repo
COPY package.json package-lock.json ./
COPY client/package.json ./client/
COPY server/package.json ./server/
RUN npm ci --workspace=nura-space-client --include-workspace-root=false
COPY client ./client
RUN npm run build --workspace=nura-space-client

FROM nginx:alpine
RUN apk add --no-cache gettext
COPY --from=builder /repo/client/dist /usr/share/nginx/html
COPY client/nginx.conf.template /etc/nginx/conf.d/default.conf.template
EXPOSE 80
CMD ["/bin/sh","-c","envsubst '${SERVER_HOST}' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]
