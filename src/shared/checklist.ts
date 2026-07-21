export interface Checklist {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChecklistItem {
  id: string;
  checklistId: string;
  title: string;
  checked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ChecklistWithItems extends Checklist {
  items: ChecklistItem[];
}

export interface CreateChecklistInput {
  name: string;
}

export interface UpdateChecklistInput {
  name?: string;
}

export interface CreateChecklistItemInput {
  title: string;
}

export interface UpdateChecklistItemInput {
  title?: string;
  checked?: boolean;
}
