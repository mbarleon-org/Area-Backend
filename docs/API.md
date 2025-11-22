# API — Endpoints Overview

All endpoints are mounted under the configured `BASE_PATH` (default: `/api`), see `src/config.ts`.

Health

- `GET {BASE_PATH}/healthz` — simple health check that returns 200 when the service is up.

Workflows (management)

- `GET {BASE_PATH}/workflows` — list workflows
- `GET {BASE_PATH}/workflows/:id` — get a single workflow
- `POST {BASE_PATH}/workflows` — create or update a workflow (payload is the workflow JSON)
- `POST {BASE_PATH}/workflows/:id/enable` — enable a workflow
- `POST {BASE_PATH}/workflows/:id/disable` — disable a workflow

Runner endpoints

These endpoints are intended for runner processes and programmatic access. The runner authentication uses a shared secret (HMAC) and nonces — see `src/services/runnerAuth.ts`.

- `GET {BASE_PATH}/runner/workflows/:workflowId` — retrieve workflow manifest for a runner
- `POST {BASE_PATH}/runner/credentials` — post credentials used by runner executions (may be used to store temporary credentials)
- `GET {BASE_PATH}/runner/modules` — list installed modules
- `GET {BASE_PATH}/runner/modules/manifest` — module manifest describing actions/parameters
- `POST {BASE_PATH}/runner/callback` (or configured `RUNNER_CALLBACK_PATH`) — runner -> server callback to report job status

Authentication

- Runners authenticate using an HMAC token generated with the `RUNNER_SHARED_SECRET`. See `src/services/runnerAuth.ts` for the exact scheme (nonce + HMAC).

Notes

- These routes are implemented in `src/routes/` — consult route handlers for exact request/response schemas.
- The admin API may evolve; prefer relying on code for definitive schemas or implement a small integration test to validate endpoint shapes.
