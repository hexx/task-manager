import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { createRoot } from 'react-dom/client';
import { folderApi, taskApi } from './api';
import type { Folder, Task } from '../shared/task';
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
import { FolderIcon, FolderPlusIcon, Trash2Icon, XIcon } from 'lucide-react';
import './styles.css';

function App() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [folderName, setFolderName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showFolderForm, setShowFolderForm] = useState(false);

  const totalCount = tasks.length;
  const completedCount = useMemo(
    () => tasks.filter((task) => task.completed).length,
    [tasks]
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
      setTasks(await taskApi.list(selectedFolderId));
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
  }, [selectedFolderId]);

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
      await taskApi.create({ title: nextTitle, folderId: selectedFolderId });
      setTitle('');
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

  async function removeFolder(folderId: string) {
    setError(null);
    try {
      await folderApi.remove(folderId);
      if (selectedFolderId === folderId) {
        setSelectedFolderId(null);
      } else {
        await loadTasks();
      }
      await loadFolders();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to delete folder.'
      );
    }
  }

  const selectedFolder = folders.find((f) => f.id === selectedFolderId);

  return (
    <main className="flex min-h-svh items-start justify-center p-4 pt-12">
      <div className="flex w-full max-w-3xl flex-col gap-4 md:flex-row">
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
                selectedFolderId === null ? 'bg-muted font-medium' : ''
              }`}
              onClick={() => setSelectedFolderId(null)}
            >
              <FolderIcon className="size-4 text-muted-foreground" />
              All tasks
            </button>

            {folders.map((folder) => (
              <div
                key={folder.id}
                className={`group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted ${
                  selectedFolderId === folder.id
                    ? 'bg-muted font-medium'
                    : ''
                }`}
              >
                <button
                  type="button"
                  className="flex flex-1 items-center gap-2 text-left"
                  onClick={() => setSelectedFolderId(folder.id)}
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
              <div>
                <CardTitle>
                  {selectedFolder ? selectedFolder.name : 'All tasks'}
                </CardTitle>
                <CardDescription>
                  {completedCount}/{totalCount} completed
                </CardDescription>
              </div>
              {/* Folder add button - mobile only */}
              <Button
                variant="ghost"
                size="icon-xs"
                className="md:hidden"
                onClick={() => setShowFolderForm(!showFolderForm)}
              >
                {showFolderForm ? <XIcon /> : <FolderPlusIcon />}
              </Button>
            </div>
          </CardHeader>

          <CardContent className="flex flex-col gap-4">
            {/* Folder tabs - mobile only */}
            <div className="flex gap-1 overflow-x-auto md:hidden" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={selectedFolderId === null}
                className={`flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs transition-colors hover:bg-muted ${
                  selectedFolderId === null
                    ? 'bg-muted font-medium'
                    : 'text-muted-foreground'
                }`}
                onClick={() => setSelectedFolderId(null)}
              >
                <FolderIcon className="size-3.5" />
                All
              </button>
              {folders.map((folder) => (
                <div
                  key={folder.id}
                  role="presentation"
                  className={`group flex shrink-0 items-center rounded-md transition-colors hover:bg-muted ${
                    selectedFolderId === folder.id
                      ? 'bg-muted font-medium'
                      : ''
                  }`}
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={selectedFolderId === folder.id}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs"
                    onClick={() => setSelectedFolderId(folder.id)}
                  >
                    <FolderIcon className="size-3.5 text-muted-foreground" />
                    {folder.name}
                  </button>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className="size-5 opacity-100 md:opacity-0 md:group-hover:opacity-100"
                    onClick={() => void removeFolder(folder.id)}
                  >
                    <Trash2Icon className="size-3" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Folder form - mobile */}
            {showFolderForm ? (
              <form
                onSubmit={handleFolderSubmit}
                className="flex gap-1 md:hidden"
              >
                <Input
                  placeholder="Folder name"
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                  className="h-8 text-sm"
                />
                <Button type="submit" size="sm" disabled={submitting}>
                  Add
                </Button>
              </form>
            ) : null}

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

            <ul className="flex flex-col gap-2">
              {tasks.map((task) => (
                <li
                  key={task.id}
                  className="flex items-center justify-between gap-4 rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
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
                  <Button
                    variant="destructive"
                    size="icon-sm"
                    onClick={() => void removeTask(task.id)}
                  >
                    <Trash2Icon />
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

createRoot(document.getElementById('root') as HTMLElement).render(<App />);
