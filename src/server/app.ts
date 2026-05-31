import { Hono } from 'hono';
import { createTask, deleteTask, listTasks, updateTask } from './store';

type AssetsBinding = {
  fetch(request: Request): Promise<Response>;
};

type Bindings = {
  ASSETS?: AssetsBinding;
};

export type AppBindings = Bindings;

const api = new Hono<{ Bindings: AppBindings }>();

api.get('/tasks', (c) => c.json(listTasks()));

api.post('/tasks', async (c) => {
  const body = (await c.req.json().catch(() => null)) as { title?: unknown } | null;
  const title = typeof body?.title === 'string' ? body.title : '';

  if (!title.trim()) {
    return c.json({ message: 'Task title is required.' }, 400);
  }

  try {
    return c.json(createTask({ title }), 201);
  } catch {
    return c.json({ message: 'Task title is required.' }, 400);
  }
});

api.patch('/tasks/:id', async (c) => {
  const body = (await c.req.json().catch(() => null)) as { title?: unknown; completed?: unknown } | null;
  const completed = typeof body?.completed === 'boolean' ? body.completed : undefined;
  const title = typeof body?.title === 'string' ? body.title : undefined;

  if (title !== undefined && !title.trim()) {
    return c.json({ message: 'Task title is required.' }, 400);
  }

  const task = updateTask(c.req.param('id'), { title, completed });
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
  return c.env.ASSETS.fetch(new Request(indexUrl.toString(), { headers: c.req.raw.headers }));
});

export default app;
