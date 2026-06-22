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
  const now = new Date().toISOString();

  if (!db) {
    const task: Task = {
      id,
      title,
      completed: false,
      folderId,
      createdAt: now,
      updatedAt: now,
    };
    tasks = [task, ...tasks];
    return cloneTask(task);
  }

  return db
    .prepare(
      'INSERT INTO tasks (id, title, completed, folder_id, created_at, updated_at) VALUES (?, ?, 0, ?, ?, ?)'
    )
    .bind(id, title, folderId, now, now)
    .run()
    .then(() => ({
      id,
      title,
      completed: false,
      folderId,
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
           updated_at = ?
       WHERE id = ?
       RETURNING *`
    )
    .bind(
      input.title?.trim() || null,
      input.completed !== undefined ? (input.completed ? 1 : 0) : null,
      input.folderId !== undefined ? 1 : 0,
      input.folderId ?? null,
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
