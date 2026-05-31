# Task Manager

Cloudflare Workers + Hono + React task manager starter.

## Setup

```bash
npm install
npm run dev
```

## Backend

- `GET /api/tasks`
- `POST /api/tasks`
- `PATCH /api/tasks/:id`
- `DELETE /api/tasks/:id`

## Frontend

The React UI fetches the REST API and supports:

- listing tasks
- adding tasks
- toggling completed state
- deleting tasks

## Tests

```bash
npm test
npm run test:e2e
```

## Deploy

```bash
npm run build
npm run deploy
```

## org-mode utilities

```bash
npm run org -- import --format json --input input.json --output output.org
npm run org -- export --format markdown --input input.org --output output.md
```

The library exports `importToOrg`, `exportFromOrg`, `importFileToOrg`, and `exportFileFromOrg` from `src/org-mode/`.