import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { createRoot } from 'react-dom/client';
import { taskApi } from './api';
import type { Task } from '../shared/task';
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
    <main className="app">
      <section className="card">
        <div className="header">
          <div>
            <h1>Task Manager</h1>
            <p>
              {completedCount}/{totalCount} completed
            </p>
          </div>
        </div>

        <form className="task-form" onSubmit={handleSubmit}>
          <label className="sr-only" htmlFor="task-title">
            Task title
          </label>
          <input
            id="task-title"
            name="title"
            placeholder="Add a new task"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
          <button type="submit" disabled={submitting}>
            {submitting ? 'Adding...' : 'Add task'}
          </button>
        </form>

        {error ? <p className="message" role="alert">{error}</p> : null}

        {loading ? <p className="empty-state">Loading tasks...</p> : null}

        {!loading && tasks.length === 0 ? (
          <p className="empty-state">No tasks yet. Add one above.</p>
        ) : null}

        <ul className="task-list">
          {tasks.map((task) => (
            <li key={task.id} className={`task-item${task.completed ? ' completed' : ''}`}>
              <div className="content">
                <input
                  aria-label={`Mark "${task.title}" as ${task.completed ? 'incomplete' : 'complete'}`}
                  type="checkbox"
                  checked={task.completed}
                  onChange={() => void toggleTask(task)}
                />
                <span className="title">{task.title}</span>
              </div>
              <button type="button" onClick={() => void removeTask(task.id)}>
                Delete
              </button>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root') as HTMLElement).render(<App />);
