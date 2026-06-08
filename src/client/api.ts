import type { CreateTaskInput, Task, UpdateTaskInput } from '../shared/task';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers
    },
    ...init
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(payload?.message ?? `Request failed with ${response.status}.`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export const taskApi = {
  list: () => request<Task[]>('/api/tasks'),
  create: (input: CreateTaskInput) =>
    request<Task>('/api/tasks', {
      method: 'POST',
      body: JSON.stringify(input)
    }),
  update: (id: string, input: UpdateTaskInput) =>
    request<Task>(`/api/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input)
    }),
  remove: (id: string) =>
    request<void>(`/api/tasks/${id}`, {
      method: 'DELETE'
    })
};
