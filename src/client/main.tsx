import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { createRoot } from 'react-dom/client';
import { folderApi, taskApi } from './api';
import type { Folder, Task } from '../shared/task';
import { formatDeadline } from '../shared/deadline';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import {
  ChevronDownIcon,
  FolderIcon,
  FolderPlusIcon,
  Trash2Icon,
  XIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  FolderPickerSheet,
  selectionLabel,
  type FolderSelection,
} from './FolderPickerSheet';
import { ChecklistsView } from './ChecklistsView';
import { TwitterView } from './TwitterView';
import './styles.css';

type View = 'tasks' | 'checklists' | 'twitter';

function DeadlineLabel({ deadline, completed }: { deadline: string; completed: boolean }) {
  const display = formatDeadline(deadline);
  const showOverdue = display.overdue && !completed;
  return (
    <span
      className={`whitespace-nowrap text-xs ${
        showOverdue
          ? 'font-medium text-destructive'
          : 'text-muted-foreground'
      }`}
    >
      {display.relative} ({display.absolute})
    </span>
  );
}

function App() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [selection, setSelection] = useState<FolderSelection>({ type: 'all' });
  const [sheetOpen, setSheetOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [deadline, setDeadline] = useState('');
  const [folderName, setFolderName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showFolderForm, setShowFolderForm] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [view, setView] = useState<View>('tasks');

  const tasks = useMemo(() => {
    if (selection.type === 'all') return allTasks;
    if (selection.type === 'unclassified') {
      return allTasks.filter((task) => task.folderId === null);
    }
    return allTasks.filter((task) => task.folderId === selection.id);
  }, [allTasks, selection]);

  const totalCount = tasks.length;
  const completedCount = useMemo(
    () => tasks.filter((task) => task.completed).length,
    [tasks]
  );
  const visibleTasks = useMemo(
    () => (showCompleted ? tasks : tasks.filter((task) => !task.completed)),
    [tasks, showCompleted]
  );

  async function loadFolders() {
    setError(null);
    try {
      setFolders(await folderApi.list());
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load folders.'
      );
    }
  }

  async function loadTasks() {
    setLoading(true);
    setError(null);
    try {
      setAllTasks(await taskApi.list());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadFolders();
  }, []);

  useEffect(() => {
    void loadTasks();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextTitle = title.trim();
    if (!nextTitle) {
      setError('Task title is required.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await taskApi.create({
        title: nextTitle,
        folderId: selection.type === 'folder' ? selection.id : null,
        deadline: deadline || undefined,
      });
      setTitle('');
      setDeadline('');
      await loadTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleFolderSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextName = folderName.trim();
    if (!nextName) {
      setError('Folder name is required.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await folderApi.create({ name: nextName });
      setFolderName('');
      setShowFolderForm(false);
      await loadFolders();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to create folder.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleTask(task: Task) {
    setError(null);
    try {
      await taskApi.update(task.id, { completed: !task.completed });
      await loadTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update task.');
    }
  }

  async function removeTask(taskId: string) {
    setError(null);
    try {
      await taskApi.remove(taskId);
      await loadTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete task.');
    }
  }

  async function moveTaskToFolder(task: Task, folderId: string | null) {
    if (task.folderId === folderId) return;
    setError(null);
    try {
      await taskApi.update(task.id, { folderId });
      await loadTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to move task.');
    }
  }

  async function updateDeadline(task: Task, deadlineValue: string) {
    setError(null);
    try {
      await taskApi.update(task.id, { deadline: deadlineValue || null });
      await loadTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update task.');
    }
  }

  async function removeFolder(folderId: string) {
    setError(null);
    try {
      await folderApi.remove(folderId);
      // 選択中のフォルダが削除されたら「すべて」に戻す。
      // 関数形アップデートで最新の selection を参照し、クロージャの古い値を避ける。
      setSelection((prev) =>
        prev.type === 'folder' && prev.id === folderId ? { type: 'all' } : prev
      );
      // 削除されたフォルダのタスクは「未分類」に移動するため、
      // 選択状態に関係なく一覧を再取得する（絞り込みはクライアント側で行う）。
      await loadTasks();
      await loadFolders();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to delete folder.'
      );
    }
  }

  async function createFolderInSheet(name: string) {
    await folderApi.create({ name });
    await loadFolders();
  }

  const selectionTitle = selectionLabel(selection, folders);

  return (
    <main className="flex min-h-svh items-start justify-center p-4 pt-12">
      <div className="flex w-full max-w-3xl flex-col gap-4">
        {/* View switcher */}
        <div
          className="flex w-fit gap-1 rounded-lg border bg-muted/50 p-1"
          role="tablist"
          aria-label="View"
        >
          <button
            type="button"
            role="tab"
            aria-selected={view === 'tasks'}
            className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
              view === 'tasks'
                ? 'bg-background font-medium shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setView('tasks')}
          >
            Tasks
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === 'checklists'}
            className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
              view === 'checklists'
                ? 'bg-background font-medium shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setView('checklists')}
          >
            Checklists
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === 'twitter'}
            className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
              view === 'twitter'
                ? 'bg-background font-medium shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setView('twitter')}
          >
            Twitter
          </button>
        </div>

        {view === 'checklists' ? <ChecklistsView /> : view === 'twitter' ? <TwitterView /> : (
        <div className="flex w-full flex-col gap-4 md:flex-row">
        {/* Folder sidebar - desktop only */}
        <Card className="hidden w-56 shrink-0 md:flex">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Folders</CardTitle>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => setShowFolderForm(!showFolderForm)}
              >
                {showFolderForm ? <XIcon /> : <FolderPlusIcon />}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            {showFolderForm ? (
              <form onSubmit={handleFolderSubmit} className="flex gap-1">
                <Input
                  placeholder="Folder name"
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                  className="h-7 text-xs"
                />
                <Button type="submit" size="sm" disabled={submitting}>
                  Add
                </Button>
              </form>
            ) : null}

            <button
              type="button"
              className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted ${
                selection.type === 'all' ? 'bg-muted font-medium' : ''
              }`}
              onClick={() => setSelection({ type: 'all' })}
            >
              <FolderIcon className="size-4 text-muted-foreground" />
              すべて
            </button>

            {folders.map((folder) => (
              <div
                key={folder.id}
                className={`group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted ${
                  selection.type === 'folder' && selection.id === folder.id
                    ? 'bg-muted font-medium'
                    : ''
                }`}
              >
                <button
                  type="button"
                  className="flex flex-1 items-center gap-2 text-left"
                  onClick={() =>
                    setSelection({ type: 'folder', id: folder.id })
                  }
                >
                  <FolderIcon className="size-4 text-muted-foreground" />
                  <span className="truncate">{folder.name}</span>
                </button>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="opacity-0 group-hover:opacity-100"
                  onClick={() => void removeFolder(folder.id)}
                >
                  <Trash2Icon />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Task list */}
        <Card className="flex-1">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <CardTitle className="hidden md:block">
                  {selectionTitle}
                </CardTitle>
                {/* Folder picker trigger - mobile only */}
                <button
                  type="button"
                  aria-haspopup="dialog"
                  aria-expanded={sheetOpen}
                  onClick={() => setSheetOpen(true)}
                  className="-mx-1 flex min-w-0 items-center gap-1.5 rounded-lg px-1 py-0.5 text-left transition-colors hover:bg-muted md:hidden"
                >
                  <span className="truncate font-heading text-lg font-semibold tracking-tight">
                    {selectionTitle}
                  </span>
                  <ChevronDownIcon
                    className={cn(
                      'size-4 shrink-0 text-muted-foreground transition-transform duration-300',
                      sheetOpen && 'rotate-180'
                    )}
                  />
                </button>
                <CardDescription>
                  {completedCount}/{totalCount} completed
                </CardDescription>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => setShowCompleted(!showCompleted)}
                >
                  {showCompleted ? '完了を隠す' : '完了を表示'}
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="flex flex-col gap-4">
            <form onSubmit={handleSubmit}>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="task-title" className="sr-only">
                    Task title
                  </FieldLabel>
                  <div className="flex gap-2">
                    <Input
                      id="task-title"
                      name="title"
                      placeholder="Add a new task"
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                    />
                    <Input
                      type="date"
                      name="deadline"
                      aria-label="Deadline"
                      value={deadline}
                      onChange={(event) => setDeadline(event.target.value)}
                      className="w-auto"
                    />
                    <Button type="submit" disabled={submitting}>
                      {submitting ? 'Adding...' : 'Add task'}
                    </Button>
                  </div>
                  {error ? <FieldError>{error}</FieldError> : null}
                </Field>
              </FieldGroup>
            </form>

            {loading ? (
              <p className="text-sm text-muted-foreground">
                Loading tasks...
              </p>
            ) : null}

            {!loading && tasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No tasks yet. Add one above.
              </p>
            ) : null}
            {!loading && tasks.length > 0 && visibleTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                All tasks completed.
              </p>
            ) : null}

            <ul className="flex flex-col gap-2">
              {visibleTasks.map((task) => (
                <li
                  key={task.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Checkbox
                      checked={task.completed}
                      aria-label={`Mark "${task.title}" as ${
                        task.completed ? 'incomplete' : 'complete'
                      }`}
                      onCheckedChange={() => void toggleTask(task)}
                    />
                    <span
                      className={
                        task.completed
                          ? 'text-muted-foreground line-through'
                          : undefined
                      }
                    >
                      {task.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {task.deadline ? (
                      <DeadlineLabel
                        deadline={task.deadline}
                        completed={task.completed}
                      />
                    ) : null}
                    <input
                      type="date"
                      aria-label={`Deadline for "${task.title}"`}
                      value={task.deadline ?? ''}
                      onChange={(event) =>
                        void updateDeadline(task, event.target.value)
                      }
                      className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    />
                    <select
                      aria-label={`Move "${task.title}" to folder`}
                      value={task.folderId ?? ''}
                      onChange={(event) =>
                        void moveTaskToFolder(
                          task,
                          event.target.value || null
                        )
                      }
                      className="h-8 max-w-[12rem] truncate rounded-lg border border-input bg-transparent px-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    >
                      <option value="">未分類</option>
                      {folders.map((folder) => (
                        <option key={folder.id} value={folder.id}>
                          {folder.name}
                        </option>
                      ))}
                    </select>
                    <Button
                      variant="destructive"
                      size="icon-sm"
                      onClick={() => void removeTask(task.id)}
                    >
                      <Trash2Icon />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <FolderPickerSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          folders={folders}
          tasks={allTasks}
          selection={selection}
          onSelect={setSelection}
          onCreateFolder={createFolderInSheet}
          onDeleteFolder={removeFolder}
        />
        </div>
        )}
      </div>
    </main>
  );
}

createRoot(document.getElementById('root') as HTMLElement).render(<App />);
