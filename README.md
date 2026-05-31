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