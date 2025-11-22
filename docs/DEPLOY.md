# Deployment & Running

This page shows common ways to build and run the Area backend for development and production.

Environment variables

The app reads configuration from environment variables. Important ones (see `src/config.ts`):

- `BASE_PATH` (default: `/api`)
- `LISTEN_ADDRESS` (default: `3000`)
- `USE_RUNNERS` (`true`/`false`)
- `RUNNER_SHARED_SECRET` (runner HMAC secret)
- `RUNNER_CALLBACK_PATH` (default: `/api/runner/callback`)
- `REDIS_URL` (default `redis://localhost:6379`)
- `WORKFLOW_STREAM` (redis stream name)
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DATABASE_URL`
- `LEGACY_WORKFLOWS_DIR`, `LEGACY_CREDENTIALS_DIR`

Local development

1. Install deps:

```bash
npm install
```

2. Run the app (development):

- Option A: using Node + ts-node

```bash
npx ts-node src/index.ts
```

- Option B: build & run with node (production-like)

```bash
npx tsc
node dist/index.js
```

Docker (recommended for parity)

1. Build image:

```bash
docker build -t area-backend:latest .
```

3. Run with docker run (example):

```bash
docker run -p 3000:3000 \
  -e LISTEN_ADDRESS=3000 \
  -e DB_HOST=postgres \
  -e DB_USER=postgres \
  -e DB_PASSWORD=secret \
  -e REDIS_URL=redis://redis:6379 \
  area-backend:latest
```

4. Using `docker-compose` (if present):

```bash
docker compose up --build -d
```

Kubernetes (example)

- A `kind-config.yaml` is included for local Kubernetes-in-Docker testing. To run locally with `kind`:

```bash
# create a kind cluster
kind create cluster --config kind-config.yaml

# build image and load into kind
docker build -t area-backend:local .
kind load docker-image area-backend:local

# apply your deployment manifests
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
```

Note: there are no canonical production k8s manifests in this repo — adapt resource limits, probes, and secrets as needed. Use `RUNNER_SHARED_SECRET` as a Kubernetes secret for runner authentication.

Database migrations

- This repository currently relies on TypeORM entities and a `DataSource` in `src/services/dataSource.ts`. Run migrations or ensure the database schema is created prior to use.

Logging & debugging

- The app writes to stdout/stderr. In Kubernetes, configure a log aggregation solution and set probes for health checks.

Scaling runners

- The app can delegate execution to external runner processes if `USE_RUNNERS` is enabled. Use the `WORKFLOW_STREAM` Redis stream for job queuing.
