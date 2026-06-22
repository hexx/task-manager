import { Hono } from 'hono';
import type { D1Database } from './types';
import {
  createFolder,
  createTask,
  deleteFolder,
  deleteTask,
  listFolders,
  listTasks,
  updateFolder,
  updateTask,
} from './store';

type AssetsBinding = {
  fetch(request: Request): Promise<Response>;
};

type Bindings = {
  ASSETS?: AssetsBinding;
  DB?: D1Database;
};

export type AppBindings = Bindings;

const api = new Hono<{ Bindings: AppBindings }>();

// Folder endpoints

api.get('/folders', async (c) => {
  const result = listFolders(c.env?.DB);
  return c.json(result instanceof Promise ? await result : result);
});

api.post('/folders', async (c) => {
  const body = (await c.req.json().catch(() => null)) as {
    name?: unknown;
  } | null;
  const name = typeof body?.name === 'string' ? body.name : '';

  if (!name.trim()) {
    return c.json({ message: 'Folder name is required.' }, 400);
  }

  const result = createFolder(c.env?.DB, { name });
  return c.json(result instanceof Promise ? await result : result, 201);
});

api.patch('/folders/:id', async (c) => {
  const body = (await c.req.json().catch(() => null)) as {
    name?: unknown;
  } | null;
  const name = typeof body?.name === 'string' ? body.name : undefined;

  if (name !== undefined && !name.trim()) {
    return c.json({ message: 'Folder name is required.' }, 400);
  }

  const result = updateFolder(c.env?.DB, c.req.param('id'), { name });
  const folder = result instanceof Promise ? await result : result;
  if (!folder) {
    return c.json({ message: 'Folder not found.' }, 404);
  }

  return c.json(folder);
});

api.delete('/folders/:id', async (c) => {
  const result = deleteFolder(c.env?.DB, c.req.param('id'));
  const removed = result instanceof Promise ? await result : result;
  if (!removed) {
    return c.json({ message: 'Folder not found.' }, 404);
  }

  return c.body(null, 204);
});

// Task endpoints

api.get('/tasks', async (c) => {
  const folderId = c.req.query('folderId');
  const result =
    folderId !== undefined
      ? listTasks(c.env?.DB, folderId === '' ? null : folderId)
      : listTasks(c.env?.DB);
  return c.json(result instanceof Promise ? await result : result);
});

api.post('/tasks', async (c) => {
  const body = (await c.req.json().catch(() => null)) as {
    title?: unknown;
    folderId?: unknown;
  } | null;
  const title = typeof body?.title === 'string' ? body.title : '';
  const folderId =
    typeof body?.folderId === 'string' ? body.folderId : null;

  if (!title.trim()) {
    return c.json({ message: 'Task title is required.' }, 400);
  }

  const result = createTask(c.env?.DB, { title, folderId });
  return c.json(result instanceof Promise ? await result : result, 201);
});

api.patch('/tasks/:id', async (c) => {
  const body = (await c.req.json().catch(() => null)) as {
    title?: unknown;
    completed?: unknown;
    folderId?: unknown;
  } | null;
  const completed =
    typeof body?.completed === 'boolean' ? body.completed : undefined;
  const title = typeof body?.title === 'string' ? body.title : undefined;
  let folderId: string | null | undefined;
  if (body?.folderId === null) {
    folderId = null;
  } else if (typeof body?.folderId === 'string') {
    folderId = body.folderId;
  } else {
    folderId = undefined;
  }

  if (title !== undefined && !title.trim()) {
    return c.json({ message: 'Task title is required.' }, 400);
  }

  const result = updateTask(c.env?.DB, c.req.param('id'), {
    title,
    completed,
    folderId,
  });
  const task = result instanceof Promise ? await result : result;
  if (!task) {
    return c.json({ message: 'Task not found.' }, 404);
  }

  return c.json(task);
});

api.delete('/tasks/:id', async (c) => {
  const result = deleteTask(c.env?.DB, c.req.param('id'));
  const removed = result instanceof Promise ? await result : result;
  if (!removed) {
    return c.json({ message: 'Task not found.' }, 404);
  }

  return c.body(null, 204);
});

const app = new Hono<{ Bindings: AppBindings }>();

app.route('/api', api);

app.get('*', async (c) => {
  if (!c.env.ASSETS) {
    return c.text('Task Manager API is running.', 200);
  }

  const url = new URL(c.req.url);
  if (url.pathname.startsWith('/assets/') || url.pathname === '/index.html') {
    return c.env.ASSETS.fetch(c.req.raw);
  }

  const indexUrl = new URL(c.req.url);
  indexUrl.pathname = '/index.html';
  return c.env.ASSETS.fetch(
    new Request(indexUrl.toString(), { headers: c.req.raw.headers })
  );
});

export default app;
