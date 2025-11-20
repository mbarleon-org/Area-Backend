FROM node:25-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --no-audit --prefer-offline || npm install
COPY . .
RUN npm run build

FROM node:25-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
RUN npm install -g dotenv-cli
EXPOSE 3000
CMD ["sh", "-c", "node dist/index.js"]
