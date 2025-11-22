# Modules — Structure and Conventions

The application is extended via modules placed under `src/modules/`. Modules provide triggers, actions, credentials definitions, and metadata.

Typical module tree

```
src/modules/<moduleName>/
  infos.ts               # module metadata (name, description, actions list)
  actions/
    <action>.ts         # action implementation
    src/
      <action>_handler.ts
  triggers/
    <trigger>.ts        # trigger registration (register function)
    src/
      <trigger>_handler.ts
  credentials/
    <credential>.ts     # credential definitions
```

Module `infos.ts`

- Exposes metadata used by the runner and the admin API to render available actions and parameters.
- Should include parameter descriptions, types, and whether fields are required.

Action & trigger contracts

- Actions receive a payload object and must return either a result or throw on error.
- Triggers must export a `register(...)` function used by `src/api/workflowRegistration.ts` to attach event listeners or schedule jobs.

How to add a module

1. Create `src/modules/<yourModule>/infos.ts` describing the module.
2. Implement actions under `actions/` and triggers under `triggers/`.
3. Add credentials types (if needed) under `credentials/`.
4. Restart the backend — modules are discovered dynamically from the `src/modules` tree.

Notes

- Module file structure and naming are conventions adopted by the project. See existing modules (`gmail`, `imap`, `redis`, `webhooks`, etc.) for examples.
- Keep actions small and pure where possible to make them testable.
