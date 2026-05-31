import type { CreateTaskInput, Task, UpdateTaskInput } from '../shared/task';

const cloneTask = (task: Task): Task => ({ ...task });

let tasks: Task[] = [];

export function listTasks(): Task[] {
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
    createdAt: now,
    updatedAt: now
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
    title: typeof input.title === 'string' ? input.title.trim() : current.title,
    completed: typeof input.completed === 'boolean' ? input.completed : current.completed,
    updatedAt: new Date().toISOString()
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
