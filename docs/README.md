# Area Backend — Docs

This `docs/` folder contains developer-facing documentation for the Area backend and runner architecture.

Start here:

- `DEPLOY.md` — build, run, Docker Compose, and Kubernetes guidance.
- `WORKFLOWS.md` — workflow file format, examples, and seeding.
- `MODULES.md` — how to author modules (actions, triggers, credentials).
- `API.md` — HTTP API endpoints and authentication for runners and management.

Quick start (Docker):

```bash
# build image
docker build -t area-backend:local .

# run with docker-compose
docker compose up -d
```

Environment is configured with environment variables defined in `src/config.ts`.

When editing docs, keep them short and link back to the code for definitive behavior (e.g., `src/routes/` and `src/modules/`).
