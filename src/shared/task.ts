export interface Folder {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  folderId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFolderInput {
  name: string;
}

export interface UpdateFolderInput {
  name?: string;
}

export interface CreateTaskInput {
  title: string;
  folderId?: string | null;
}

export interface UpdateTaskInput {
  title?: string;
  completed?: boolean;
  folderId?: string | null;
}
