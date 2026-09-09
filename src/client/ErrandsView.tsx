import { useState, type FormEvent } from 'react';
import type { Task } from '../shared/task';
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
import { ChevronDownIcon, Trash2Icon } from 'lucide-react';
import { cn } from '@/lib/utils';

function ErrandRow({
  task,
  pendingToggle,
  onToggle,
  onRemove,
}: {
  task: Task;
  pendingToggle: boolean;
  onToggle: (task: Task) => void;
  onRemove: (taskId: string) => void;
}) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
      <div className="flex min-w-0 items-center gap-3">
        <Checkbox
          checked={task.completed}
          disabled={pendingToggle}
          aria-label={`Mark "${task.title}" as ${
            task.completed ? 'incomplete' : 'complete'
          }`}
          onCheckedChange={() => void onToggle(task)}
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
        aria-label={`Delete "${task.title}"`}
        onClick={() => void onRemove(task.id)}
      >
        <Trash2Icon />
      </Button>
    </li>
  );
}

export function ErrandsView({
  tasks,
  pendingToggles,
  loading,
  error,
  onToggle,
  onRemove,
  onCreate,
}: {
  /** Errand（errand = true の Task）のみが渡される */
  tasks: Task[];
  pendingToggles: Set<string>;
  loading: boolean;
  error: string | null;
  onToggle: (task: Task) => void;
  onRemove: (taskId: string) => void;
  onCreate: (title: string) => Promise<void>;
}) {
  const [title, setTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  // モバイルの完了セクション開閉。デスクトップの showCompleted とは独立。
  // セッション内のみ保持（docs/mobile-show-completed-spec.md v3 と同パターン）。
  const [showCompletedSection, setShowCompletedSection] = useState(false);

  const totalCount = tasks.length;
  const completedCount = tasks.filter((task) => task.completed).length;
  // デスクトップ: 完了表示トグル駆動（既定 = 非表示、docs/errand-spec.md §3.4）
  const visibleTasks = showCompleted
    ? tasks
    : tasks.filter((task) => !task.completed);
  // モバイル: 一覧は常に未完了一覧、完了は末尾の開閉セクション
  const incompleteTasks = tasks.filter((task) => !task.completed);
  const completedTasks = tasks.filter((task) => task.completed);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextTitle = title.trim();
    if (!nextTitle) return;

    setSubmitting(true);
    try {
      await onCreate(nextTitle);
      setTitle('');
    } catch {
      // エラーは親（App）の error state に反映済み。共通エラー表示で見せる。
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <CardTitle>お出かけ</CardTitle>
            <CardDescription>
              {completedCount}/{totalCount} completed
            </CardDescription>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="xs"
              className="hidden md:inline-flex"
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
              <FieldLabel htmlFor="errand-title" className="sr-only">
                Errand title
              </FieldLabel>
              <div className="flex gap-2">
                <Input
                  id="errand-title"
                  name="title"
                  placeholder="Add an errand"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                />
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Adding...' : 'Add'}
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
            No errands yet. Add one above.
          </p>
        ) : null}
        {!loading && tasks.length > 0 && visibleTasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            All errands completed.
          </p>
        ) : null}

        {/* Mobile list: incomplete only */}
        <ul className="flex flex-col gap-2 md:hidden">
          {incompleteTasks.map((task) => (
            <ErrandRow
              key={task.id}
              task={task}
              pendingToggle={pendingToggles.has(task.id)}
              onToggle={onToggle}
              onRemove={onRemove}
            />
          ))}
        </ul>

        {/* Desktop list: toggle-driven */}
        <ul className="hidden md:flex md:flex-col md:gap-2">
          {visibleTasks.map((task) => (
            <ErrandRow
              key={task.id}
              task={task}
              pendingToggle={pendingToggles.has(task.id)}
              onToggle={onToggle}
              onRemove={onRemove}
            />
          ))}
        </ul>

        {/* Mobile completed section */}
        {completedCount > 0 ? (
          <button
            type="button"
            aria-expanded={showCompletedSection}
            onClick={() => setShowCompletedSection(!showCompletedSection)}
            className="flex items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition-colors hover:bg-muted md:hidden"
          >
            <span>
              {showCompletedSection
                ? `完了したタスク ${completedCount} 件を隠す`
                : `完了したタスク ${completedCount} 件を表示`}
            </span>
            <ChevronDownIcon
              className={cn(
                'size-4 shrink-0 text-muted-foreground transition-transform duration-300',
                showCompletedSection && 'rotate-180'
              )}
            />
          </button>
        ) : null}
        {showCompletedSection && completedTasks.length > 0 ? (
          <ul className="flex flex-col gap-2 md:hidden">
            {completedTasks.map((task) => (
              <ErrandRow
                key={task.id}
                task={task}
                pendingToggle={pendingToggles.has(task.id)}
                onToggle={onToggle}
                onRemove={onRemove}
              />
            ))}
          </ul>
        ) : null}
      </CardContent>
    </Card>
  );
}