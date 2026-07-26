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
- `GET /api/checklists`
- `POST /api/checklists`
- `PATCH /api/checklists/:id`
- `DELETE /api/checklists/:id`
- `POST /api/checklists/:id/items`
- `PATCH /api/checklists/:id/items/:itemId`
- `DELETE /api/checklists/:id/items/:itemId`
- `POST /api/checklists/:id/reset`
- `GET /api/accounts`
- `POST /api/accounts`
- `PATCH /api/accounts/:id`
- `DELETE /api/accounts/:id`
- `POST /api/accounts/:id/mark-as-read`

## Frontend

The React UI fetches the REST API and supports:

- listing tasks
- adding tasks
- toggling completed state
- deleting tasks
- reusable checklists (create, add/check/rename/delete items, reset all checks)

## Tests

```bash
npm test
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