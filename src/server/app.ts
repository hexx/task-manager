import { Hono } from 'hono';
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
};

export type AppBindings = Bindings;

const api = new Hono<{ Bindings: AppBindings }>();

// Folder endpoints

api.get('/folders', (c) => c.json(listFolders()));

api.post('/folders', async (c) => {
  const body = (await c.req.json().catch(() => null)) as {
    name?: unknown;
  } | null;
  const name = typeof body?.name === 'string' ? body.name : '';

  if (!name.trim()) {
    return c.json({ message: 'Folder name is required.' }, 400);
  }

  return c.json(createFolder({ name }), 201);
});

api.patch('/folders/:id', async (c) => {
  const body = (await c.req.json().catch(() => null)) as {
    name?: unknown;
  } | null;
  const name = typeof body?.name === 'string' ? body.name : undefined;

  if (name !== undefined && !name.trim()) {
    return c.json({ message: 'Folder name is required.' }, 400);
  }

  const folder = updateFolder(c.req.param('id'), { name });
  if (!folder) {
    return c.json({ message: 'Folder not found.' }, 404);
  }

  return c.json(folder);
});

api.delete('/folders/:id', (c) => {
  const removed = deleteFolder(c.req.param('id'));
  if (!removed) {
    return c.json({ message: 'Folder not found.' }, 404);
  }

  return c.body(null, 204);
});

// Task endpoints

api.get('/tasks', (c) => {
  const folderId = c.req.query('folderId');
  if (folderId !== undefined) {
    return c.json(listTasks(folderId === '' ? null : folderId));
  }
  return c.json(listTasks());
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

  return c.json(createTask({ title, folderId }), 201);
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

  const task = updateTask(c.req.param('id'), {
    title,
    completed,
    folderId,
  });
  if (!task) {
    return c.json({ message: 'Task not found.' }, 404);
  }

  return c.json(task);
});

api.delete('/tasks/:id', (c) => {
  const removed = deleteTask(c.req.param('id'));
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
