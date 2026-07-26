import { Hono } from 'hono';
import { normalizeHandle } from '../shared/account';
import type { D1Database } from './types';
import {
  createAccount,
  createChecklist,
  createChecklistItem,
  createFolder,
  createTask,
  deleteChecklist,
  deleteAccount,
  deleteChecklistItem,
  deleteFolder,
  deleteTask,
  getChecklist,
  listChecklists,
  listAccounts,
  findAccountByHandle,
  markAccountAsRead,
  updateAccount,
  listFolders,
  listTasks,
  resetChecklistItems,
  updateChecklist,
  updateChecklistItem,
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

const DEADLINE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

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
    deadline?: unknown;
  } | null;
  const title = typeof body?.title === 'string' ? body.title : '';
  const folderId =
    typeof body?.folderId === 'string' ? body.folderId : null;
  const deadline =
    typeof body?.deadline === 'string' ? body.deadline : undefined;

  if (!title.trim()) {
    return c.json({ message: 'Task title is required.' }, 400);
  }

  if (deadline !== undefined && !DEADLINE_PATTERN.test(deadline)) {
    return c.json({ message: 'Deadline must be a YYYY-MM-DD date.' }, 400);
  }

  const result = createTask(c.env?.DB, { title, folderId, deadline });
  return c.json(result instanceof Promise ? await result : result, 201);
});

api.patch('/tasks/:id', async (c) => {
  const body = (await c.req.json().catch(() => null)) as {
    title?: unknown;
    completed?: unknown;
    folderId?: unknown;
    deadline?: unknown;
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
  let deadline: string | null | undefined;
  if (body?.deadline === null) {
    deadline = null;
  } else if (typeof body?.deadline === 'string') {
    deadline = body.deadline;
  } else {
    deadline = undefined;
  }

  if (title !== undefined && !title.trim()) {
    return c.json({ message: 'Task title is required.' }, 400);
  }

  if (typeof deadline === 'string' && !DEADLINE_PATTERN.test(deadline)) {
    return c.json({ message: 'Deadline must be a YYYY-MM-DD date.' }, 400);
  }

  const result = updateTask(c.env?.DB, c.req.param('id'), {
    title,
    completed,
    folderId,
    deadline,
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

// Checklist endpoints

api.get('/checklists', async (c) => {
  const result = listChecklists(c.env?.DB);
  return c.json(result instanceof Promise ? await result : result);
});

api.post('/checklists', async (c) => {
  const body = (await c.req.json().catch(() => null)) as {
    name?: unknown;
  } | null;
  const name = typeof body?.name === 'string' ? body.name : '';

  if (!name.trim()) {
    return c.json({ message: 'Checklist name is required.' }, 400);
  }

  const result = createChecklist(c.env?.DB, { name });
  return c.json(result instanceof Promise ? await result : result, 201);
});

api.patch('/checklists/:id', async (c) => {
  const body = (await c.req.json().catch(() => null)) as {
    name?: unknown;
  } | null;
  const name = typeof body?.name === 'string' ? body.name : undefined;

  if (name !== undefined && !name.trim()) {
    return c.json({ message: 'Checklist name is required.' }, 400);
  }

  const result = updateChecklist(c.env?.DB, c.req.param('id'), { name });
  const checklist = result instanceof Promise ? await result : result;
  if (!checklist) {
    return c.json({ message: 'Checklist not found.' }, 404);
  }

  return c.json(checklist);
});

api.delete('/checklists/:id', async (c) => {
  const result = deleteChecklist(c.env?.DB, c.req.param('id'));
  const removed = result instanceof Promise ? await result : result;
  if (!removed) {
    return c.json({ message: 'Checklist not found.' }, 404);
  }

  return c.body(null, 204);
});

api.post('/checklists/:id/items', async (c) => {
  const checklistId = c.req.param('id');
  const existing = getChecklist(c.env?.DB, checklistId);
  if (!(existing instanceof Promise ? await existing : existing)) {
    return c.json({ message: 'Checklist not found.' }, 404);
  }

  const body = (await c.req.json().catch(() => null)) as {
    title?: unknown;
  } | null;
  const title = typeof body?.title === 'string' ? body.title : '';

  if (!title.trim()) {
    return c.json({ message: 'Checklist item title is required.' }, 400);
  }

  const result = createChecklistItem(c.env?.DB, checklistId, { title });
  return c.json(result instanceof Promise ? await result : result, 201);
});

api.patch('/checklists/:id/items/:itemId', async (c) => {
  const body = (await c.req.json().catch(() => null)) as {
    title?: unknown;
    checked?: unknown;
  } | null;
  const title = typeof body?.title === 'string' ? body.title : undefined;
  const checked =
    typeof body?.checked === 'boolean' ? body.checked : undefined;

  if (title !== undefined && !title.trim()) {
    return c.json({ message: 'Checklist item title is required.' }, 400);
  }

  const result = updateChecklistItem(
    c.env?.DB,
    c.req.param('id'),
    c.req.param('itemId'),
    { title, checked }
  );
  const item = result instanceof Promise ? await result : result;
  if (!item) {
    return c.json({ message: 'Checklist item not found.' }, 404);
  }

  return c.json(item);
});

api.delete('/checklists/:id/items/:itemId', async (c) => {
  const result = deleteChecklistItem(
    c.env?.DB,
    c.req.param('id'),
    c.req.param('itemId')
  );
  const removed = result instanceof Promise ? await result : result;
  if (!removed) {
    return c.json({ message: 'Checklist item not found.' }, 404);
  }

  return c.body(null, 204);
});

api.post('/checklists/:id/reset', async (c) => {
  const result = resetChecklistItems(c.env?.DB, c.req.param('id'));
  const found = result instanceof Promise ? await result : result;
  if (!found) {
    return c.json({ message: 'Checklist not found.' }, 404);
  }

  return c.body(null, 204);
});

// Account (Twitter) endpoints

const LAST_READ_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

api.get('/accounts', async (c) => {
  const result = listAccounts(c.env?.DB);
  return c.json(result instanceof Promise ? await result : result);
});

api.post('/accounts', async (c) => {
  const body = (await c.req.json().catch(() => null)) as {
    handle?: unknown;
  } | null;
  const handle = typeof body?.handle === 'string' ? body.handle : '';

  if (!handle.trim()) {
    return c.json({ message: 'Handle is required.' }, 400);
  }

  const normalized = normalizeHandle(handle);
  if (!normalized) {
    return c.json({ message: 'Invalid handle.' }, 400);
  }

  const existing = findAccountByHandle(c.env?.DB, normalized);
  if (existing instanceof Promise ? await existing : existing) {
    return c.json({ message: 'Handle already exists.' }, 400);
  }

  const result = createAccount(c.env?.DB, { handle: normalized });
  return c.json(result instanceof Promise ? await result : result, 201);
});

api.patch('/accounts/:id', async (c) => {
  const body = (await c.req.json().catch(() => null)) as {
    handle?: unknown;
    lastReadAt?: unknown;
  } | null;
  const handle =
    typeof body?.handle === 'string' ? body.handle : undefined;
  let lastReadAt: string | null | undefined;
  if (body?.lastReadAt === null) {
    lastReadAt = null;
  } else if (typeof body?.lastReadAt === 'string') {
    lastReadAt = body.lastReadAt;
  } else {
    lastReadAt = undefined;
  }

  if (handle !== undefined && !handle.trim()) {
    return c.json({ message: 'Handle is required.' }, 400);
  }

  let normalized: string | undefined;
  if (handle !== undefined) {
    const n = normalizeHandle(handle);
    if (!n) {
      return c.json({ message: 'Invalid handle.' }, 400);
    }
    normalized = n;
  }

  if (
    typeof lastReadAt === 'string' &&
    (!LAST_READ_PATTERN.test(lastReadAt) ||
      Number.isNaN(Date.parse(lastReadAt)))
  ) {
    return c.json({ message: 'lastReadAt must be an ISO datetime.' }, 400);
  }

  if (normalized !== undefined) {
    const existing = findAccountByHandle(
      c.env?.DB,
      normalized,
      c.req.param('id')
    );
    if (existing instanceof Promise ? await existing : existing) {
      return c.json({ message: 'Handle already exists.' }, 400);
    }
  }

  const result = updateAccount(c.env?.DB, c.req.param('id'), {
    handle: normalized,
    lastReadAt,
  });
  const account = result instanceof Promise ? await result : result;
  if (!account) {
    return c.json({ message: 'Account not found.' }, 404);
  }

  return c.json(account);
});

api.delete('/accounts/:id', async (c) => {
  const result = deleteAccount(c.env?.DB, c.req.param('id'));
  const removed = result instanceof Promise ? await result : result;
  if (!removed) {
    return c.json({ message: 'Account not found.' }, 404);
  }

  return c.body(null, 204);
});

api.post('/accounts/:id/mark-as-read', async (c) => {
  const result = markAccountAsRead(c.env?.DB, c.req.param('id'));
  const account = result instanceof Promise ? await result : result;
  if (!account) {
    return c.json({ message: 'Account not found.' }, 404);
  }

  return c.json(account);
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
