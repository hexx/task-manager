import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { createRoot } from 'react-dom/client';
import { taskApi } from './api';
import type { Task } from '../shared/task';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Trash2Icon } from 'lucide-react';
import './styles.css';

function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const totalCount = tasks.length;
  const completedCount = useMemo(
    () => tasks.filter((task) => task.completed).length,
    [tasks]
  );

  async function loadTasks() {
    setLoading(true);
    setError(null);
    try {
      setTasks(await taskApi.list());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks.');
    } finally {
      setLoading(false);
    }
  }

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
      await taskApi.create({ title: nextTitle });
      setTitle('');
      await loadTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task.');
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

  return (
    <main className="flex min-h-svh items-start justify-center p-4 pt-12">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle>Task Manager</CardTitle>
          <CardDescription>
            {completedCount}/{totalCount} completed
          </CardDescription>
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
                  <Button type="submit" disabled={submitting}>
                    {submitting ? 'Adding...' : 'Add task'}
                  </Button>
                </div>
                {error ? <FieldError>{error}</FieldError> : null}
              </Field>
            </FieldGroup>
          </form>

          {loading ? (
            <p className="text-sm text-muted-foreground">Loading tasks...</p>
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
                    aria-label={`Mark "${task.title}" as ${task.completed ? 'incomplete' : 'complete'}`}
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
    </main>
  );
}

createRoot(document.getElementById('root') as HTMLElement).render(<App />);
