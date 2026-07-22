import type {
  CreateChecklistInput,
  CreateChecklistItemInput,
  Checklist,
  ChecklistItem,
  ChecklistWithItems,
  UpdateChecklistInput,
  UpdateChecklistItemInput,
} from '../shared/checklist';
import type {
  CreateFolderInput,
  CreateTaskInput,
  Folder,
  Task,
  UpdateFolderInput,
  UpdateTaskInput,
} from '../shared/task';
import type { D1Database } from './types';

// In-memory storage for testing/fallback
const cloneFolder = (folder: Folder): Folder => ({ ...folder });
const cloneTask = (task: Task): Task => ({ ...task });

let folders: Folder[] = [];
let tasks: Task[] = [];

// Helper to convert DB row to Folder
function rowToFolder(row: Record<string, unknown>): Folder {
  return {
    id: row.id as string,
    name: row.name as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

// Helper to convert DB row to Task
function rowToTask(row: Record<string, unknown>): Task {
  return {
    id: row.id as string,
    title: row.title as string,
    completed: Boolean(row.completed),
    folderId: (row.folder_id as string) || null,
    deadline: (row.deadline as string) || null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

// Folder operations

export function listFolders(db?: D1Database): Folder[] | Promise<Folder[]> {
  if (!db) {
    return folders.map(cloneFolder);
  }
  return db
    .prepare('SELECT * FROM folders ORDER BY created_at DESC')
    .all<Record<string, unknown>>()
    .then((result) => result.results.map(rowToFolder))
    .catch((err) => {
      console.error('Failed to list folders from D1:', err);
      throw new Error('Database operation failed.');
    });
}

export function resetFolders(nextFolders: Folder[] = []): void {
  folders = nextFolders.map(cloneFolder);
}

export function createFolder(
  db: D1Database | undefined,
  input: CreateFolderInput
): Folder | Promise<Folder> {
  const name = input.name.trim();
  if (!name) {
    throw new Error('Folder name is required.');
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  if (!db) {
    const folder: Folder = { id, name, createdAt: now, updatedAt: now };
    folders = [folder, ...folders];
    return cloneFolder(folder);
  }

  return db
    .prepare('INSERT INTO folders (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)')
    .bind(id, name, now, now)
    .run()
    .then(() => ({ id, name, createdAt: now, updatedAt: now }))
    .catch((err) => {
      console.error('Failed to create folder in D1:', err);
      throw new Error('Database operation failed.');
    });
}

export function updateFolder(
  db: D1Database | undefined,
  id: string,
  input: UpdateFolderInput
): Folder | null | Promise<Folder | null> {
  if (!db) {
    const index = folders.findIndex((folder) => folder.id === id);
    if (index < 0) return null;

    const current = folders[index];
    const next: Folder = {
      ...current,
      name:
        typeof input.name === 'string'
          ? input.name.trim() || current.name
          : current.name,
      updatedAt: new Date().toISOString(),
    };
    folders = [...folders.slice(0, index), next, ...folders.slice(index + 1)];
    return cloneFolder(next);
  }

  const now = new Date().toISOString();
  return db
    .prepare(
      'UPDATE folders SET name = COALESCE(?, name), updated_at = ? WHERE id = ? RETURNING *'
    )
    .bind(input.name?.trim() || null, now, id)
    .first<Record<string, unknown>>()
    .then((result) => (result ? rowToFolder(result) : null))
    .catch((err) => {
      console.error('Failed to update folder in D1:', err);
      throw new Error('Database operation failed.');
    });
}

export function deleteFolder(
  db: D1Database | undefined,
  id: string
): boolean | Promise<boolean> {
  if (!db) {
    const next = folders.filter((folder) => folder.id !== id);
    if (next.length === folders.length) return false;
    folders = next;
    tasks = tasks.map((task) =>
      task.folderId === id
        ? { ...task, folderId: null, updatedAt: new Date().toISOString() }
        : task
    );
    return true;
  }

  const now = new Date().toISOString();
  return db
    .batch([
      db.prepare('DELETE FROM folders WHERE id = ?').bind(id),
      db
        .prepare('UPDATE tasks SET folder_id = NULL, updated_at = ? WHERE folder_id = ?')
        .bind(now, id),
    ])
    .then((results) => results[0].meta.changes > 0)
    .catch((err) => {
      console.error('Failed to delete folder from D1:', err);
      throw new Error('Database operation failed.');
    });
}

// Task operations

export function listTasks(
  db?: D1Database,
  folderId?: string | null
): Task[] | Promise<Task[]> {
  if (!db) {
    if (folderId !== undefined) {
      return tasks.filter((task) => task.folderId === folderId).map(cloneTask);
    }
    return tasks.map(cloneTask);
  }

  if (folderId !== undefined) {
    return db
      .prepare('SELECT * FROM tasks WHERE folder_id IS ? ORDER BY created_at DESC')
      .bind(folderId)
      .all<Record<string, unknown>>()
      .then((result) => result.results.map(rowToTask))
      .catch((err) => {
        console.error('Failed to list tasks from D1:', err);
        throw new Error('Database operation failed.');
      });
  }
  return db
    .prepare('SELECT * FROM tasks ORDER BY created_at DESC')
    .all<Record<string, unknown>>()
    .then((result) => result.results.map(rowToTask))
    .catch((err) => {
      console.error('Failed to list tasks from D1:', err);
      throw new Error('Database operation failed.');
    });
}

export function resetTasks(nextTasks: Task[] = []): void {
  tasks = nextTasks.map(cloneTask);
}

export function createTask(
  db: D1Database | undefined,
  input: CreateTaskInput
): Task | Promise<Task> {
  const title = input.title.trim();
  if (!title) {
    throw new Error('Task title is required.');
  }

  const id = crypto.randomUUID();
  const folderId = input.folderId ?? null;
  const deadline = input.deadline ?? null;
  const now = new Date().toISOString();

  if (!db) {
    const task: Task = {
      id,
      title,
      completed: false,
      folderId,
      deadline,
      createdAt: now,
      updatedAt: now,
    };
    tasks = [task, ...tasks];
    return cloneTask(task);
  }

  return db
    .prepare(
      'INSERT INTO tasks (id, title, completed, folder_id, deadline, created_at, updated_at) VALUES (?, ?, 0, ?, ?, ?, ?)'
    )
    .bind(id, title, folderId, deadline, now, now)
    .run()
    .then(() => ({
      id,
      title,
      completed: false,
      folderId,
      deadline,
      createdAt: now,
      updatedAt: now,
    }))
    .catch((err) => {
      console.error('Failed to create task in D1:', err);
      throw new Error('Database operation failed.');
    });
}

export function updateTask(
  db: D1Database | undefined,
  id: string,
  input: UpdateTaskInput
): Task | null | Promise<Task | null> {
  if (!db) {
    const index = tasks.findIndex((task) => task.id === id);
    if (index < 0) return null;

    const current = tasks[index];
    const next: Task = {
      ...current,
      title:
        typeof input.title === 'string'
          ? input.title.trim() || current.title
          : current.title,
      completed:
        typeof input.completed === 'boolean'
          ? input.completed
          : current.completed,
      folderId: input.folderId !== undefined ? input.folderId : current.folderId,
      deadline: input.deadline !== undefined ? input.deadline : current.deadline,
      updatedAt: new Date().toISOString(),
    };
    tasks = [...tasks.slice(0, index), next, ...tasks.slice(index + 1)];
    return cloneTask(next);
  }

  const now = new Date().toISOString();
  return db
    .prepare(
      `UPDATE tasks 
       SET title = COALESCE(?, title),
           completed = COALESCE(?, completed),
           folder_id = CASE WHEN ? = 1 THEN ? ELSE folder_id END,
           deadline = CASE WHEN ? = 1 THEN ? ELSE deadline END,
           updated_at = ?
       WHERE id = ?
       RETURNING *`
    )
    .bind(
      input.title?.trim() || null,
      input.completed !== undefined ? (input.completed ? 1 : 0) : null,
      input.folderId !== undefined ? 1 : 0,
      input.folderId ?? null,
      input.deadline !== undefined ? 1 : 0,
      input.deadline ?? null,
      now,
      id
    )
    .first<Record<string, unknown>>()
    .then((result) => (result ? rowToTask(result) : null))
    .catch((err) => {
      console.error('Failed to update task in D1:', err);
      throw new Error('Database operation failed.');
    });
}

export function deleteTask(
  db: D1Database | undefined,
  id: string
): boolean | Promise<boolean> {
  if (!db) {
    const next = tasks.filter((task) => task.id !== id);
    if (next.length === tasks.length) return false;
    tasks = next;
    return true;
  }

  return db
    .prepare('DELETE FROM tasks WHERE id = ?')
    .bind(id)
    .run()
    .then((result) => result.meta.changes > 0)
    .catch((err) => {
      console.error('Failed to delete task from D1:', err);
      throw new Error('Database operation failed.');
    });
}

// Checklist operations

let checklists: ChecklistWithItems[] = [];

const cloneChecklist = (checklist: ChecklistWithItems): ChecklistWithItems => ({
  ...checklist,
  items: checklist.items.map((item) => ({ ...item })),
});

function rowToChecklist(row: Record<string, unknown>): Checklist {
  return {
    id: row.id as string,
    name: row.name as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function rowToChecklistItem(row: Record<string, unknown>): ChecklistItem {
  return {
    id: row.id as string,
    checklistId: row.checklist_id as string,
    title: row.title as string,
    checked: Boolean(row.checked),
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function resetChecklists(nextChecklists: ChecklistWithItems[] = []): void {
  checklists = nextChecklists.map(cloneChecklist);
}

export function listChecklists(
  db?: D1Database
): ChecklistWithItems[] | Promise<ChecklistWithItems[]> {
  if (!db) {
    return checklists.map(cloneChecklist);
  }
  return db
    .batch([
      db.prepare('SELECT * FROM checklists ORDER BY created_at DESC'),
      db.prepare('SELECT * FROM checklist_items ORDER BY created_at ASC, id ASC'),
    ])
    .then(([checklistResult, itemResult]) => {
      const items = itemResult.results.map(rowToChecklistItem);
      return checklistResult.results.map((row) => {
        const checklist = rowToChecklist(row);
        return {
          ...checklist,
          items: items.filter((item) => item.checklistId === checklist.id),
        };
      });
    })
    .catch((err) => {
      console.error('Failed to list checklists from D1:', err);
      throw new Error('Database operation failed.');
    });
}

export function getChecklist(
  db: D1Database | undefined,
  id: string
): ChecklistWithItems | null | Promise<ChecklistWithItems | null> {
  if (!db) {
    const found = checklists.find((checklist) => checklist.id === id);
    return found ? cloneChecklist(found) : null;
  }
  return db
    .batch([
      db.prepare('SELECT * FROM checklists WHERE id = ?').bind(id),
      db
        .prepare('SELECT * FROM checklist_items WHERE checklist_id = ? ORDER BY created_at ASC, id ASC')
        .bind(id),
    ])
    .then(([checklistResult, itemResult]) => {
      const row = checklistResult.results[0];
      if (!row) return null;
      return {
        ...rowToChecklist(row),
        items: itemResult.results.map(rowToChecklistItem),
      };
    })
    .catch((err) => {
      console.error('Failed to get checklist from D1:', err);
      throw new Error('Database operation failed.');
    });
}

export function createChecklist(
  db: D1Database | undefined,
  input: CreateChecklistInput
): ChecklistWithItems | Promise<ChecklistWithItems> {
  const name = input.name.trim();
  if (!name) {
    throw new Error('Checklist name is required.');
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const checklist: ChecklistWithItems = { id, name, items: [], createdAt: now, updatedAt: now };

  if (!db) {
    checklists = [checklist, ...checklists];
    return cloneChecklist(checklist);
  }

  return db
    .prepare('INSERT INTO checklists (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)')
    .bind(id, name, now, now)
    .run()
    .then(() => cloneChecklist(checklist))
    .catch((err) => {
      console.error('Failed to create checklist in D1:', err);
      throw new Error('Database operation failed.');
    });
}

export function updateChecklist(
  db: D1Database | undefined,
  id: string,
  input: UpdateChecklistInput
): Checklist | null | Promise<Checklist | null> {
  if (!db) {
    const index = checklists.findIndex((checklist) => checklist.id === id);
    if (index < 0) return null;

    const current = checklists[index];
    const next: ChecklistWithItems = {
      ...current,
      name:
        typeof input.name === 'string'
          ? input.name.trim() || current.name
          : current.name,
      updatedAt: new Date().toISOString(),
    };
    checklists = [...checklists.slice(0, index), next, ...checklists.slice(index + 1)];
    const { items: _items, ...checklist } = next;
    return { ...checklist };
  }

  const now = new Date().toISOString();
  return db
    .prepare(
      'UPDATE checklists SET name = COALESCE(?, name), updated_at = ? WHERE id = ? RETURNING *'
    )
    .bind(input.name?.trim() || null, now, id)
    .first<Record<string, unknown>>()
    .then((result) => (result ? rowToChecklist(result) : null))
    .catch((err) => {
      console.error('Failed to update checklist in D1:', err);
      throw new Error('Database operation failed.');
    });
}

export function deleteChecklist(
  db: D1Database | undefined,
  id: string
): boolean | Promise<boolean> {
  if (!db) {
    const next = checklists.filter((checklist) => checklist.id !== id);
    if (next.length === checklists.length) return false;
    checklists = next;
    return true;
  }

  return db
    .batch([
      db.prepare('DELETE FROM checklist_items WHERE checklist_id = ?').bind(id),
      db.prepare('DELETE FROM checklists WHERE id = ?').bind(id),
    ])
    .then((results) => results[1].meta.changes > 0)
    .catch((err) => {
      console.error('Failed to delete checklist from D1:', err);
      throw new Error('Database operation failed.');
    });
}

export function createChecklistItem(
  db: D1Database | undefined,
  checklistId: string,
  input: CreateChecklistItemInput
): ChecklistItem | Promise<ChecklistItem> {
  const title = input.title.trim();
  if (!title) {
    throw new Error('Checklist item title is required.');
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const item: ChecklistItem = {
    id,
    checklistId,
    title,
    checked: false,
    createdAt: now,
    updatedAt: now,
  };

  if (!db) {
    const index = checklists.findIndex((checklist) => checklist.id === checklistId);
    if (index < 0) {
      throw new ChecklistNotFoundError();
    }
    const current = checklists[index];
    const next: ChecklistWithItems = {
      ...current,
      items: [...current.items, item],
      updatedAt: now,
    };
    checklists = [...checklists.slice(0, index), next, ...checklists.slice(index + 1)];
    return { ...item };
  }

  return db
    .prepare(
      'INSERT INTO checklist_items (id, checklist_id, title, checked, created_at, updated_at) VALUES (?, ?, ?, 0, ?, ?)'
    )
    .bind(id, checklistId, title, now, now)
    .run()
    .then(() => item)
    .catch((err) => {
      console.error('Failed to create checklist item in D1:', err);
      throw new Error('Database operation failed.');
    });
}

export class ChecklistNotFoundError extends Error {
  constructor() {
    super('Checklist not found.');
    this.name = 'ChecklistNotFoundError';
  }
}

export function updateChecklistItem(
  db: D1Database | undefined,
  checklistId: string,
  itemId: string,
  input: UpdateChecklistItemInput
): ChecklistItem | null | Promise<ChecklistItem | null> {
  if (!db) {
    const index = checklists.findIndex((checklist) => checklist.id === checklistId);
    if (index < 0) return null;

    const current = checklists[index];
    const itemIndex = current.items.findIndex((item) => item.id === itemId);
    if (itemIndex < 0) return null;

    const item = current.items[itemIndex];
    const nextItem: ChecklistItem = {
      ...item,
      title:
        typeof input.title === 'string'
          ? input.title.trim() || item.title
          : item.title,
      checked:
        typeof input.checked === 'boolean' ? input.checked : item.checked,
      updatedAt: new Date().toISOString(),
    };
    const next: ChecklistWithItems = {
      ...current,
      items: [
        ...current.items.slice(0, itemIndex),
        nextItem,
        ...current.items.slice(itemIndex + 1),
      ],
      updatedAt: nextItem.updatedAt,
    };
    checklists = [...checklists.slice(0, index), next, ...checklists.slice(index + 1)];
    return { ...nextItem };
  }

  const now = new Date().toISOString();
  return db
    .prepare(
      `UPDATE checklist_items
       SET title = COALESCE(?, title),
           checked = COALESCE(?, checked),
           updated_at = ?
       WHERE id = ? AND checklist_id = ?
       RETURNING *`
    )
    .bind(
      input.title?.trim() || null,
      input.checked !== undefined ? (input.checked ? 1 : 0) : null,
      now,
      itemId,
      checklistId
    )
    .first<Record<string, unknown>>()
    .then((result) => (result ? rowToChecklistItem(result) : null))
    .catch((err) => {
      console.error('Failed to update checklist item in D1:', err);
      throw new Error('Database operation failed.');
    });
}

export function deleteChecklistItem(
  db: D1Database | undefined,
  checklistId: string,
  itemId: string
): boolean | Promise<boolean> {
  if (!db) {
    const index = checklists.findIndex((checklist) => checklist.id === checklistId);
    if (index < 0) return false;

    const current = checklists[index];
    const nextItems = current.items.filter((item) => item.id !== itemId);
    if (nextItems.length === current.items.length) return false;

    const next: ChecklistWithItems = {
      ...current,
      items: nextItems,
      updatedAt: new Date().toISOString(),
    };
    checklists = [...checklists.slice(0, index), next, ...checklists.slice(index + 1)];
    return true;
  }

  return db
    .prepare('DELETE FROM checklist_items WHERE id = ? AND checklist_id = ?')
    .bind(itemId, checklistId)
    .run()
    .then((result) => result.meta.changes > 0)
    .catch((err) => {
      console.error('Failed to delete checklist item from D1:', err);
      throw new Error('Database operation failed.');
    });
}

export function resetChecklistItems(
  db: D1Database | undefined,
  checklistId: string
): boolean | Promise<boolean> {
  if (!db) {
    const index = checklists.findIndex((checklist) => checklist.id === checklistId);
    if (index < 0) return false;

    const current = checklists[index];
    const now = new Date().toISOString();
    const next: ChecklistWithItems = {
      ...current,
      items: current.items.map((item) =>
        item.checked ? { ...item, checked: false, updatedAt: now } : item
      ),
      updatedAt: now,
    };
    checklists = [...checklists.slice(0, index), next, ...checklists.slice(index + 1)];
    return true;
  }

  const now = new Date().toISOString();
  return db
    .batch([
      db.prepare('SELECT id FROM checklists WHERE id = ?').bind(checklistId),
      db
        .prepare('UPDATE checklist_items SET checked = 0, updated_at = ? WHERE checklist_id = ?')
        .bind(now, checklistId),
    ])
    .then(([existsResult]) => existsResult.results.length > 0)
    .catch((err) => {
      console.error('Failed to reset checklist in D1:', err);
      throw new Error('Database operation failed.');
    });
}
