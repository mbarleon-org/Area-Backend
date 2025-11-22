# Workflows

Workflows are JSONC files (see `workflows/` directory) that describe triggers and actions composed from installed modules.

Location and seeding

- Example workflow files live in the top-level `workflows/` directory.
- On startup, the app may import/seed those files into the database (see `src/legacy/importAll.ts` and related helpers). Use `LEGACY_WORKFLOWS_DIR` to point to alternative locations.

File format (high level)

A workflow file typically contains metadata and a list of triggers and actions. The exact schema depends on installed modules (actions/triggers).

Minimal example (illustrative):

```jsonc
{
  "id": "print-every-minute",
  "name": "Every minute printer",
  "triggers": [
    {
      "type": "cron",
      "schedule": "* * * * *"
    }
  ],
  "actions": [
    {
      "module": "core",
      "action": "debug_print",
      "params": { "message": "Hello" }
    }
  ]
}
```

Authoring guidance

- Start from one of the sample files in `workflows/`.
- Use module `infos.ts` files (`src/modules/<module>/infos.ts`) to learn available actions, parameters and constraints.
- Keep secrets out of the repo; use credential references handled by `src/services/credentialStore.ts` instead.

Enabling/Disabling

- Workflows may be enabled or disabled via the HTTP API (see `docs/api.md`) or by setting appropriate flags in the DB.

Testing workflows locally

- Use the built-in cron or interval triggers for test runs. For external triggers (webhooks, imap, redis), provide the corresponding integration (e.g., Redis server, IMAP account).

Troubleshooting

- Check logs for errors during import or registration.
- Ensure module names referenced by actions/triggers match the directory names in `src/modules/`.
