import type {
  CreateFolderInput,
  CreateTaskInput,
  Folder,
  Task,
  UpdateFolderInput,
  UpdateTaskInput,
} from '../shared/task';

const cloneFolder = (folder: Folder): Folder => ({ ...folder });
const cloneTask = (task: Task): Task => ({ ...task });

let folders: Folder[] = [];
let tasks: Task[] = [];

// Folder operations

export function listFolders(): Folder[] {
  return folders.map(cloneFolder);
}

export function resetFolders(nextFolders: Folder[] = []): void {
  folders = nextFolders.map(cloneFolder);
}

export function createFolder(input: CreateFolderInput): Folder {
  const name = input.name.trim();
  if (!name) {
    throw new Error('Folder name is required.');
  }

  const now = new Date().toISOString();
  const folder: Folder = {
    id: crypto.randomUUID(),
    name,
    createdAt: now,
    updatedAt: now,
  };

  folders = [folder, ...folders];
  return cloneFolder(folder);
}

export function updateFolder(
  id: string,
  input: UpdateFolderInput
): Folder | null {
  const index = folders.findIndex((folder) => folder.id === id);
  if (index < 0) {
    return null;
  }

  const current = folders[index];
  const next: Folder = {
    ...current,
    name: typeof input.name === 'string' ? (input.name.trim() || current.name) : current.name,
    updatedAt: new Date().toISOString(),
  };

  folders = [...folders.slice(0, index), next, ...folders.slice(index + 1)];
  return cloneFolder(next);
}

export function deleteFolder(id: string): boolean {
  const next = folders.filter((folder) => folder.id !== id);
  if (next.length === folders.length) {
    return false;
  }

  folders = next;

  // Move tasks from deleted folder to uncategorized (null)
  tasks = tasks.map((task) =>
    task.folderId === id ? { ...task, folderId: null, updatedAt: new Date().toISOString() } : task
  );

  return true;
}

// Task operations

export function listTasks(folderId?: string | null): Task[] {
  if (folderId !== undefined) {
    return tasks
      .filter((task) => task.folderId === folderId)
      .map(cloneTask);
  }
  return tasks.map(cloneTask);
}

export function resetTasks(nextTasks: Task[] = []): void {
  tasks = nextTasks.map(cloneTask);
}

export function createTask(input: CreateTaskInput): Task {
  const title = input.title.trim();
  if (!title) {
    throw new Error('Task title is required.');
  }

  const now = new Date().toISOString();
  const task: Task = {
    id: crypto.randomUUID(),
    title,
    completed: false,
    folderId: input.folderId ?? null,
    createdAt: now,
    updatedAt: now,
  };

  tasks = [task, ...tasks];
  return cloneTask(task);
}

export function updateTask(id: string, input: UpdateTaskInput): Task | null {
  const index = tasks.findIndex((task) => task.id === id);
  if (index < 0) {
    return null;
  }

  const current = tasks[index];
  const next: Task = {
    ...current,
    title: typeof input.title === 'string' ? (input.title.trim() || current.title) : current.title,
    completed:
      typeof input.completed === 'boolean' ? input.completed : current.completed,
    folderId: input.folderId !== undefined ? input.folderId : current.folderId,
    updatedAt: new Date().toISOString(),
  };

  tasks = [...tasks.slice(0, index), next, ...tasks.slice(index + 1)];
  return cloneTask(next);
}

export function deleteTask(id: string): boolean {
  const next = tasks.filter((task) => task.id !== id);
  if (next.length === tasks.length) {
    return false;
  }

  tasks = next;
  return true;
}
