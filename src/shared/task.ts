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
  deadline: string | null;
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
  deadline?: string;
}

export interface UpdateTaskInput {
  title?: string;
  completed?: boolean;
  folderId?: string | null;
  /** undefined = 変更なし / null = 消去 / string = 設定 */
  deadline?: string | null;
}
