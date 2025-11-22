FROM node:25-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --no-audit --prefer-offline || npm install
COPY . .
RUN npm run build

FROM node:25-alpine
ARG BUILD_DATE=unknown
ARG VCS_REF=unknown

LABEL org.opencontainers.image.title="area-backend" \
   org.opencontainers.image.description="Area project backend" \
   org.opencontainers.image.source="https://github.com/mbarleon-org/Area-Backend" \
   org.opencontainers.image.url="https://github.com/mbarleon-org/Area-Backend" \
   org.opencontainers.image.created="${BUILD_DATE}" \
   org.opencontainers.image.revision="${VCS_REF}"

WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
CMD ["sh", "-c", "node /app/dist/index.js"]
