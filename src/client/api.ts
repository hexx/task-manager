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
      const elapsed = Date.now() - parseInt(lastReload, 10);
      if (elapsed < 60000) { // 1分以内にリロード済み
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
    if (response.status === 401 || response.status === 403 || response.status >= 500) {
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
