import { useEffect, useState, type FormEvent } from 'react';
import { accountApi } from './api';
import type { Account } from '../shared/account';
import {
  formatLastRead,
  fromDatetimeLocalValue,
  toDatetimeLocalValue,
} from '../shared/account';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import {
  CheckIcon,
  EyeIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  XIcon,
} from 'lucide-react';

function AccountRow({
  account,
  onMarkAsRead,
  onRename,
  onEditLastRead,
  onRemove,
}: {
  account: Account;
  onMarkAsRead: () => void;
  onRename: (handle: string) => void;
  onEditLastRead: (value: string) => void;
  onRemove: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(account.handle);

  function startEditing() {
    setDraft(account.handle);
    setEditing(true);
  }

  function commit() {
    const next = draft.trim();
    if (next && next !== account.handle) {
      onRename(next);
    }
    setEditing(false);
  }

  const display = account.lastReadAt
    ? formatLastRead(account.lastReadAt)
    : null;

  return (
    <li className="flex flex-col gap-3 rounded-lg border p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {editing ? (
          <div className="flex flex-1 items-center gap-2">
            <Input
              autoFocus
              value={draft}
              aria-label={`Edit handle ${account.handle}`}
              onChange={(event) => setDraft(event.target.value)}
              onBlur={commit}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  commit();
                } else if (event.key === 'Escape') {
                  setEditing(false);
                }
              }}
            />
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={commit}
              aria-label="Save handle"
            >
              <CheckIcon />
            </Button>
          </div>
        ) : (
          <div className="flex min-w-0 items-center gap-2">
            <span className="font-medium">{account.handle}</span>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={startEditing}
              aria-label={`Edit ${account.handle}`}
            >
              <PencilIcon />
            </Button>
          </div>
        )}
        <Button
          variant="destructive"
          size="icon-sm"
          onClick={onRemove}
          aria-label={`Delete ${account.handle}`}
        >
          <Trash2Icon />
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={
              display
                ? 'text-sm text-muted-foreground'
                : 'text-sm text-muted-foreground italic'
            }
          >
            {display
              ? `${display.absolute}（${display.relative}）まで見た`
              : '未記録'}
          </span>
          <input
            type="datetime-local"
            aria-label={`Last read for ${account.handle}`}
            value={
              account.lastReadAt
                ? toDatetimeLocalValue(account.lastReadAt)
                : ''
            }
            onChange={(event) => onEditLastRead(event.target.value)}
            className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </div>
        <Button size="sm" onClick={onMarkAsRead}>
          <EyeIcon />
          今この瞬間まで見た
        </Button>
      </div>
    </li>
  );
}

export function TwitterView() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [handle, setHandle] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  async function loadAccounts() {
    setLoading(true);
    setError(null);
    try {
      setAccounts(await accountApi.list());
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load accounts.'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAccounts();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextHandle = handle.trim();
    if (!nextHandle) {
      setError('Handle is required.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await accountApi.create({ handle: nextHandle });
      setHandle('');
      setShowForm(false);
      await loadAccounts();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to create account.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function markAsRead(account: Account) {
    setError(null);
    try {
      await accountApi.markAsRead(account.id);
      await loadAccounts();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to mark as read.'
      );
    }
  }

  async function renameAccount(account: Account, nextHandle: string) {
    setError(null);
    try {
      await accountApi.update(account.id, { handle: nextHandle });
      await loadAccounts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rename.');
    }
  }

  async function editLastRead(account: Account, value: string) {
    setError(null);
    try {
      await accountApi.update(account.id, {
        lastReadAt: value ? fromDatetimeLocalValue(value) : null,
      });
      await loadAccounts();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to update last read.'
      );
    }
  }

  async function removeAccount(account: Account) {
    if (
      !window.confirm(
        `${account.handle} を削除しますか？閲覧記録も一緒に消えます。`
      )
    ) {
      return;
    }
    setError(null);
    try {
      await accountApi.remove(account.id);
      await loadAccounts();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to delete account.'
      );
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Twitter</CardTitle>
            <CardDescription>
              アカウントごとに「どこまで見たか」を記録する
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => setShowForm(!showForm)}
            aria-label={showForm ? 'Close form' : 'Add account'}
          >
            {showForm ? <XIcon /> : <PlusIcon />}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {showForm ? (
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="account-handle" className="sr-only">
                  Handle
                </FieldLabel>
                <div className="flex gap-2">
                  <Input
                    id="account-handle"
                    name="handle"
                    placeholder="@handle"
                    value={handle}
                    onChange={(event) => setHandle(event.target.value)}
                  />
                  <Button type="submit" disabled={submitting}>
                    {submitting ? 'Adding...' : 'Add account'}
                  </Button>
                </div>
                {error ? <FieldError>{error}</FieldError> : null}
              </Field>
            </FieldGroup>
          </form>
        ) : null}

        {!showForm && error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : null}

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading accounts...</p>
        ) : null}

        {!loading && accounts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No accounts yet. Add one with the + button.
          </p>
        ) : null}

        <ul className="flex flex-col gap-2">
          {accounts.map((account) => (
            <AccountRow
              key={account.id}
              account={account}
              onMarkAsRead={() => void markAsRead(account)}
              onRename={(next) => void renameAccount(account, next)}
              onEditLastRead={(value) => void editLastRead(account, value)}
              onRemove={() => void removeAccount(account)}
            />
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
