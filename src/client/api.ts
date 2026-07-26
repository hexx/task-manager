import type {
  CreateAccountInput,
  Account,
  UpdateAccountInput,
} from '../shared/account';
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

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const shouldReload = (): boolean => {
    const lastReload = sessionStorage.getItem('lastReload');
    if (lastReload) {
      const lastTime = parseInt(lastReload, 10);
      if (isNaN(lastTime) || Date.now() - lastTime < 60000) { // 1分以内にリロード済み
        return false;
      }
    }
    return true;
  };

  const reloadPage = () => {
    if (shouldReload()) {
      sessionStorage.setItem('lastReload', Date.now().toString());
      window.location.reload();
    }
  };

  try {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...init?.headers,
      },
      ...init,
    });

    // ステータスコードがCloudflareのログインページが返されたと推測される場合
    if (response.status === 401 || response.status === 403) {
      reloadPage();
      throw new Error(`Request failed with ${response.status}.`);
    }

    // Content-TypeがHTMLである場合（Cloudflareのログインページ）
    const contentType = response.headers.get('Content-Type');
    if (contentType && contentType.includes('text/html')) {
      reloadPage();
      throw new Error('Unexpected HTML response, possibly Cloudflare login page.');
    }

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as {
        message?: string;
      } | null;
      throw new Error(
        payload?.message ?? `Request failed with ${response.status}.`
      );
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  } catch (error) {
    // ネットワークエラー (TypeError: Failed to fetch 等)
    if (error instanceof TypeError) {
      reloadPage();
    }
    throw error;
  }
}

export const folderApi = {
  list: () => request<Folder[]>('/api/folders'),
  create: (input: CreateFolderInput) =>
    request<Folder>('/api/folders', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  update: (id: string, input: UpdateFolderInput) =>
    request<Folder>(`/api/folders/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),
  remove: (id: string) =>
    request<void>(`/api/folders/${id}`, {
      method: 'DELETE',
    }),
};

export const taskApi = {
  list: (folderId?: string | null) => {
    const params =
      folderId != null ? `?folderId=${encodeURIComponent(folderId)}` : '';
    return request<Task[]>(`/api/tasks${params}`);
  },
  create: (input: CreateTaskInput) =>
    request<Task>('/api/tasks', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  update: (id: string, input: UpdateTaskInput) =>
    request<Task>(`/api/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),
  remove: (id: string) =>
    request<void>(`/api/tasks/${id}`, {
      method: 'DELETE',
    }),
};

export const accountApi = {
  list: () => request<Account[]>('/api/accounts'),
  create: (input: CreateAccountInput) =>
    request<Account>('/api/accounts', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  update: (id: string, input: UpdateAccountInput) =>
    request<Account>(`/api/accounts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),
  remove: (id: string) =>
    request<void>(`/api/accounts/${id}`, {
      method: 'DELETE',
    }),
  markAsRead: (id: string) =>
    request<Account>(`/api/accounts/${id}/mark-as-read`, {
      method: 'POST',
    }),
};

export const checklistApi = {
  list: () => request<ChecklistWithItems[]>('/api/checklists'),
  create: (input: CreateChecklistInput) =>
    request<ChecklistWithItems>('/api/checklists', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  update: (id: string, input: UpdateChecklistInput) =>
    request<Checklist>(`/api/checklists/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),
  remove: (id: string) =>
    request<void>(`/api/checklists/${id}`, {
      method: 'DELETE',
    }),
  createItem: (checklistId: string, input: CreateChecklistItemInput) =>
    request<ChecklistItem>(`/api/checklists/${checklistId}/items`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  updateItem: (checklistId: string, itemId: string, input: UpdateChecklistItemInput) =>
    request<ChecklistItem>(`/api/checklists/${checklistId}/items/${itemId}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),
  removeItem: (checklistId: string, itemId: string) =>
    request<void>(`/api/checklists/${checklistId}/items/${itemId}`, {
      method: 'DELETE',
    }),
  reset: (checklistId: string) =>
    request<void>(`/api/checklists/${checklistId}/reset`, {
      method: 'POST',
    }),
};
