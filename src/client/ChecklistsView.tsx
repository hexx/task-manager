import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { checklistApi } from './api';
import type { ChecklistItem, ChecklistWithItems } from '../shared/checklist';
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
  CheckIcon,
  ClipboardListIcon,
  ListPlusIcon,
  PencilIcon,
  RotateCcwIcon,
  Trash2Icon,
  XIcon,
} from 'lucide-react';

function countChecked(checklist: ChecklistWithItems): number {
  return checklist.items.filter((item) => item.checked).length;
}

function isFullyChecked(checklist: ChecklistWithItems): boolean {
  return checklist.items.length > 0 && countChecked(checklist) === checklist.items.length;
}

function ChecklistItemRow({
  item,
  onToggle,
  onRename,
  onRemove,
}: {
  item: ChecklistItem;
  onToggle: () => void;
  onRename: (title: string) => void;
  onRemove: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.title);

  function startEditing() {
    setDraft(item.title);
    setEditing(true);
  }

  function commit() {
    const next = draft.trim();
    if (next && next !== item.title) {
      onRename(next);
    }
    setEditing(false);
  }

  if (editing) {
    return (
      <li className="flex items-center gap-2 rounded-lg border p-3">
        <Input
          autoFocus
          value={draft}
          aria-label={`Edit "${item.title}"`}
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
        <Button variant="ghost" size="icon-sm" onClick={commit} aria-label="Save title">
          <CheckIcon />
        </Button>
      </li>
    );
  }

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
      <div className="flex min-w-0 items-center gap-3">
        <Checkbox
          checked={item.checked}
          aria-label={`Mark "${item.title}" as ${item.checked ? 'unchecked' : 'checked'}`}
          onCheckedChange={onToggle}
        />
        <span className={item.checked ? 'text-muted-foreground line-through' : undefined}>
          {item.title}
        </span>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon-sm" onClick={startEditing} aria-label={`Edit "${item.title}"`}>
          <PencilIcon />
        </Button>
        <Button
          variant="destructive"
          size="icon-sm"
          onClick={onRemove}
          aria-label={`Delete "${item.title}"`}
        >
          <Trash2Icon />
        </Button>
      </div>
    </li>
  );
}

export function ChecklistsView() {
  const [checklists, setChecklists] = useState<ChecklistWithItems[]>([]);
  const [selectedChecklistId, setSelectedChecklistId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showChecklistForm, setShowChecklistForm] = useState(false);
  const [checklistName, setChecklistName] = useState('');
  const [itemTitle, setItemTitle] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [renameDraft, setRenameDraft] = useState('');

  const selectedChecklist = useMemo(
    () => checklists.find((checklist) => checklist.id === selectedChecklistId) ?? null,
    [checklists, selectedChecklistId]
  );

  async function loadChecklists() {
    setLoading(true);
    setError(null);
    try {
      setChecklists(await checklistApi.list());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load checklists.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadChecklists();
  }, []);

  async function handleChecklistSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextName = checklistName.trim();
    if (!nextName) {
      setError('Checklist name is required.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const created = await checklistApi.create({ name: nextName });
      setChecklistName('');
      setShowChecklistForm(false);
      setSelectedChecklistId(created.id);
      await loadChecklists();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create checklist.');
    } finally {
      setSubmitting(false);
    }
  }

  async function removeChecklist(checklistId: string) {
    const target = checklists.find((checklist) => checklist.id === checklistId);
    const message = target
      ? `Delete "${target.name}" and all of its items?`
      : 'Delete this checklist?';
    if (!window.confirm(message)) return;

    setError(null);
    try {
      await checklistApi.remove(checklistId);
      if (selectedChecklistId === checklistId) {
        setSelectedChecklistId(null);
      }
      await loadChecklists();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete checklist.');
    }
  }

  async function handleItemSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedChecklist) return;
    const nextTitle = itemTitle.trim();
    if (!nextTitle) {
      setError('Checklist item title is required.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await checklistApi.createItem(selectedChecklist.id, { title: nextTitle });
      setItemTitle('');
      await loadChecklists();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add item.');
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleItem(item: ChecklistItem) {
    if (!selectedChecklist) return;
    setError(null);
    try {
      await checklistApi.updateItem(selectedChecklist.id, item.id, {
        checked: !item.checked,
      });
      await loadChecklists();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update item.');
    }
  }

  async function renameItem(item: ChecklistItem, title: string) {
    if (!selectedChecklist) return;
    setError(null);
    try {
      await checklistApi.updateItem(selectedChecklist.id, item.id, { title });
      await loadChecklists();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rename item.');
    }
  }

  async function removeItem(item: ChecklistItem) {
    if (!selectedChecklist) return;
    setError(null);
    try {
      await checklistApi.removeItem(selectedChecklist.id, item.id);
      await loadChecklists();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete item.');
    }
  }

  async function handleReset() {
    if (!selectedChecklist) return;
    const checkedCount = countChecked(selectedChecklist);
    if (
      checkedCount > 0 &&
      !window.confirm(`Reset all ${checkedCount} checked item(s)?`)
    ) {
      return;
    }

    setError(null);
    try {
      await checklistApi.reset(selectedChecklist.id);
      await loadChecklists();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset checklist.');
    }
  }

  async function handleRenameSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedChecklist) return;
    const nextName = renameDraft.trim();
    if (!nextName) {
      setError('Checklist name is required.');
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      await checklistApi.update(selectedChecklist.id, { name: nextName });
      setRenaming(false);
      await loadChecklists();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rename checklist.');
    } finally {
      setSubmitting(false);
    }
  }

  const checkedCount = selectedChecklist ? countChecked(selectedChecklist) : 0;
  const totalCount = selectedChecklist ? selectedChecklist.items.length : 0;

  const sidebarEntries = (
    <>
      {checklists.map((checklist) => {
        const fullyChecked = isFullyChecked(checklist);
        const checked = countChecked(checklist);
        return (
          <div
            key={checklist.id}
            className={`group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted ${
              selectedChecklistId === checklist.id ? 'bg-muted font-medium' : ''
            }`}
          >
            <button
              type="button"
              className="flex min-w-0 flex-1 items-center gap-2 text-left"
              onClick={() => {
                setSelectedChecklistId(checklist.id);
                setRenaming(false);
              }}
            >
              {fullyChecked ? (
                <CheckIcon className="size-4 shrink-0 text-green-600" />
              ) : (
                <ClipboardListIcon className="size-4 shrink-0 text-muted-foreground" />
              )}
              <span className="truncate">{checklist.name}</span>
              <span
                className={`ml-auto shrink-0 text-xs ${
                  fullyChecked ? 'font-medium text-green-600' : 'text-muted-foreground'
                }`}
              >
                {checked}/{checklist.items.length}
              </span>
            </button>
            <Button
              variant="ghost"
              size="icon-xs"
              className="opacity-0 group-hover:opacity-100"
              onClick={() => void removeChecklist(checklist.id)}
              aria-label={`Delete checklist "${checklist.name}"`}
            >
              <Trash2Icon />
            </Button>
          </div>
        );
      })}
    </>
  );

  return (
    <div className="flex w-full flex-col gap-4 md:flex-row">
      {/* Checklist sidebar - desktop only */}
      <Card className="hidden w-56 shrink-0 md:flex">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Checklists</CardTitle>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => setShowChecklistForm(!showChecklistForm)}
              aria-label="New checklist"
            >
              {showChecklistForm ? <XIcon /> : <ListPlusIcon />}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-1">
          {showChecklistForm ? (
            <form onSubmit={handleChecklistSubmit} className="flex gap-1">
              <Input
                placeholder="Checklist name"
                value={checklistName}
                onChange={(e) => setChecklistName(e.target.value)}
                className="h-7 text-xs"
              />
              <Button type="submit" size="sm" disabled={submitting}>
                Add
              </Button>
            </form>
          ) : null}

          {checklists.length === 0 && !showChecklistForm ? (
            <p className="text-xs text-muted-foreground">
              No checklists yet. Create one with the + button.
            </p>
          ) : null}

          {sidebarEntries}
        </CardContent>
      </Card>

      {/* Checklist detail */}
      <Card className="flex-1">
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              {renaming && selectedChecklist ? (
                <form onSubmit={handleRenameSubmit} className="flex gap-1">
                  <Input
                    value={renameDraft}
                    aria-label="Checklist name"
                    onChange={(e) => setRenameDraft(e.target.value)}
                    className="h-8"
                  />
                  <Button type="submit" size="sm" disabled={submitting}>
                    {submitting ? 'Saving...' : 'Save'}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setRenaming(false)}
                    aria-label="Cancel rename"
                  >
                    <XIcon />
                  </Button>
                </form>
              ) : (
                <>
                  <CardTitle className="truncate">
                    {selectedChecklist ? selectedChecklist.name : 'Checklists'}
                  </CardTitle>
                  {selectedChecklist ? (
                    <CardDescription
                      className={
                        isFullyChecked(selectedChecklist)
                          ? 'font-medium text-green-600'
                          : undefined
                      }
                    >
                      {isFullyChecked(selectedChecklist)
                        ? `${checkedCount}/${totalCount} checked — all done!`
                        : `${checkedCount}/${totalCount} checked`}
                    </CardDescription>
                  ) : (
                    <CardDescription>Select or create a checklist.</CardDescription>
                  )}
                </>
              )}
            </div>
            {selectedChecklist && !renaming ? (
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => {
                    setRenameDraft(selectedChecklist.name);
                    setRenaming(true);
                  }}
                  aria-label={`Rename checklist "${selectedChecklist.name}"`}
                >
                  <PencilIcon />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void handleReset()}
                  aria-label="Reset checklist"
                >
                  <RotateCcwIcon />
                  Reset
                </Button>
                {/* Checklist add button - mobile only */}
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="md:hidden"
                  onClick={() => setShowChecklistForm(!showChecklistForm)}
                  aria-label="New checklist"
                >
                  {showChecklistForm ? <XIcon /> : <ListPlusIcon />}
                </Button>
              </div>
            ) : null}
          </div>
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          {/* Checklist tabs - mobile only */}
          <div className="flex gap-1 overflow-x-auto md:hidden" role="tablist">
            {checklists.map((checklist) => {
              const fullyChecked = isFullyChecked(checklist);
              return (
                <button
                  key={checklist.id}
                  type="button"
                  role="tab"
                  aria-selected={selectedChecklistId === checklist.id}
                  className={`flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs transition-colors hover:bg-muted ${
                    selectedChecklistId === checklist.id
                      ? 'bg-muted font-medium'
                      : 'text-muted-foreground'
                  }`}
                  onClick={() => {
                    setSelectedChecklistId(checklist.id);
                    setRenaming(false);
                  }}
                >
                  {fullyChecked ? (
                    <CheckIcon className="size-3.5 text-green-600" />
                  ) : (
                    <ClipboardListIcon className="size-3.5" />
                  )}
                  {checklist.name}
                </button>
              );
            })}
          </div>

          {/* Checklist form - mobile */}
          {showChecklistForm ? (
            <form onSubmit={handleChecklistSubmit} className="flex gap-1 md:hidden">
              <Input
                placeholder="Checklist name"
                value={checklistName}
                onChange={(e) => setChecklistName(e.target.value)}
                className="h-8 text-sm"
              />
              <Button type="submit" size="sm" disabled={submitting}>
                Add
              </Button>
            </form>
          ) : null}

          {selectedChecklist ? (
            <>
              <form onSubmit={handleItemSubmit}>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="checklist-item-title" className="sr-only">
                      Item title
                    </FieldLabel>
                    <div className="flex gap-2">
                      <Input
                        id="checklist-item-title"
                        name="title"
                        placeholder="Add an item"
                        value={itemTitle}
                        onChange={(event) => setItemTitle(event.target.value)}
                      />
                      <Button type="submit" disabled={submitting}>
                        {submitting ? 'Adding...' : 'Add item'}
                      </Button>
                    </div>
                    {error ? <FieldError>{error}</FieldError> : null}
                  </Field>
                </FieldGroup>
              </form>

              {selectedChecklist.items.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No items yet. Add one above.
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {selectedChecklist.items.map((item) => (
                    <ChecklistItemRow
                      key={item.id}
                      item={item}
                      onToggle={() => void toggleItem(item)}
                      onRename={(title) => void renameItem(item, title)}
                      onRemove={() => void removeItem(item)}
                    />
                  ))}
                </ul>
              )}
            </>
          ) : (
            <>
              {error ? <FieldError>{error}</FieldError> : null}
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading checklists...</p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Select a checklist, or create one to get started.
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
