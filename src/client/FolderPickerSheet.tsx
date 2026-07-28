import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
  type Ref,
} from 'react';
import type { Folder, Task } from '../shared/task';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  CheckIcon,
  FolderIcon,
  InboxIcon,
  ListTodoIcon,
  PlusIcon,
  Trash2Icon,
} from 'lucide-react';

/**
 * タスク一覧の絞り込み条件。
 * All と Unclassified は Folder ではなく特別な絞り込み（CONTEXT.md 参照）。
 */
export type FolderSelection =
  | { type: 'all' }
  | { type: 'unclassified' }
  | { type: 'folder'; id: string };

export function selectionLabel(
  selection: FolderSelection,
  folders: Folder[]
): string {
  if (selection.type === 'all') return 'すべて';
  if (selection.type === 'unclassified') return '未分類';
  return folders.find((folder) => folder.id === selection.id)?.name ?? 'すべて';
}

type RowProps = {
  icon: ReactNode;
  label: string;
  count: number;
  selected: boolean;
  onSelect: () => void;
  rowRef?: Ref<HTMLDivElement>;
  trailing?: ReactNode;
};

function SelectionRow({
  icon,
  label,
  count,
  selected,
  onSelect,
  rowRef,
  trailing,
}: RowProps) {
  return (
    <div
      ref={rowRef}
      className={cn(
        'flex min-h-11 items-center rounded-lg pr-1 transition-colors duration-150',
        selected ? 'bg-muted' : 'hover:bg-muted/60',
        trailing ? '' : 'pr-0'
      )}
    >
      <button
        type="button"
        aria-pressed={selected}
        onClick={onSelect}
        className="flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-lg px-3 text-left"
      >
        <span className="text-muted-foreground">{icon}</span>
        <span
          className={cn(
            'min-w-0 flex-1 truncate text-sm transition-colors',
            selected ? 'font-medium text-foreground' : 'text-foreground/85'
          )}
        >
          {label}
        </span>
        {selected ? (
          <CheckIcon className="size-4 shrink-0 text-foreground" />
        ) : null}
        <Badge variant="secondary" className="tabular-nums">
          {count}
        </Badge>
      </button>
      {trailing}
    </div>
  );
}

type FolderPickerSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folders: Folder[];
  /** 全タスク（絞り込み前）。件数の集計と削除確認に使う */
  tasks: Task[];
  selection: FolderSelection;
  onSelect: (selection: FolderSelection) => void;
  onCreateFolder: (name: string) => Promise<void>;
  onDeleteFolder: (folderId: string) => Promise<void>;
};

export function FolderPickerSheet({
  open,
  onOpenChange,
  folders,
  tasks,
  selection,
  onSelect,
  onCreateFolder,
  onDeleteFolder,
}: FolderPickerSheetProps) {
  const [creating, setCreating] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [deletingFolder, setDeletingFolder] = useState<Folder | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const selectedRowRef = useRef<HTMLDivElement | null>(null);

  const counts = useMemo(() => {
    const byFolder = new Map<string, number>();
    let unclassified = 0;
    let openTotal = 0;
    for (const task of tasks) {
      if (!task.completed) openTotal += 1;
      if (task.folderId === null) {
        if (!task.completed) unclassified += 1;
        continue;
      }
      if (!task.completed) {
        byFolder.set(task.folderId, (byFolder.get(task.folderId) ?? 0) + 1);
      }
    }
    return { byFolder, unclassified, openTotal };
  }, [tasks]);

  // 開いたとき、選択中の行が見える位置までスクロールする
  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      selectedRowRef.current?.scrollIntoView({ block: 'center' });
    });
    return () => cancelAnimationFrame(frame);
  }, [open]);

  // 閉じたら作成モードをリセットする
  useEffect(() => {
    if (open) return;
    setCreating(false);
    setNewFolderName('');
    setCreateError(null);
    setDeletingFolder(null);
  }, [open]);

  function handleSelect(next: FolderSelection) {
    onSelect(next);
    onOpenChange(false);
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newFolderName.trim();
    if (!name) {
      setCreateError('フォルダ名を入力してください。');
      return;
    }
    setCreateSubmitting(true);
    setCreateError(null);
    try {
      await onCreateFolder(name);
      // 作成後もシートは開いたまま。入力欄を空にして連続作成に備える
      setNewFolderName('');
    } catch (err) {
      setCreateError(
        err instanceof Error ? err.message : 'フォルダを作成できませんでした。'
      );
    } finally {
      setCreateSubmitting(false);
    }
  }

  const deleteCount = deletingFolder
    ? tasks.filter((task) => task.folderId === deletingFolder.id).length
    : 0;
  const deleteMessage = deletingFolder
    ? deleteCount > 0
      ? `フォルダ『${deletingFolder.name}』を削除しますか？中のタスク${deleteCount}件は『未分類』になります。`
      : `フォルダ『${deletingFolder.name}』を削除しますか？`
    : '';

  async function handleDeleteConfirmed() {
    if (!deletingFolder) return;
    setDeleteSubmitting(true);
    try {
      await onDeleteFolder(deletingFolder.id);
    } finally {
      setDeleteSubmitting(false);
      setDeletingFolder(null);
    }
  }

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange} showSwipeHandle>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>フォルダを選択</DrawerTitle>
            <DrawerDescription>
              未完了 {counts.openTotal} 件 / 全 {tasks.length} 件
            </DrawerDescription>
          </DrawerHeader>

          <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-2 py-3">
            <SelectionRow
              icon={<ListTodoIcon className="size-4" />}
              label="すべて"
              count={counts.openTotal}
              selected={selection.type === 'all'}
              onSelect={() => handleSelect({ type: 'all' })}
              rowRef={selection.type === 'all' ? selectedRowRef : undefined}
            />

            <Separator className="mx-3 my-1.5" />

            {folders.map((folder) => {
              const selected =
                selection.type === 'folder' && selection.id === folder.id;
              return (
                <SelectionRow
                  key={folder.id}
                  icon={<FolderIcon className="size-4" />}
                  label={folder.name}
                  count={counts.byFolder.get(folder.id) ?? 0}
                  selected={selected}
                  onSelect={() => handleSelect({ type: 'folder', id: folder.id })}
                  rowRef={selected ? selectedRowRef : undefined}
                  trailing={
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label={`フォルダ「${folder.name}」を削除`}
                      onClick={() => setDeletingFolder(folder)}
                    >
                      <Trash2Icon />
                    </Button>
                  }
                />
              );
            })}

            {folders.length > 0 ? <Separator className="mx-3 my-1.5" /> : null}

            <SelectionRow
              icon={<InboxIcon className="size-4" />}
              label="未分類"
              count={counts.unclassified}
              selected={selection.type === 'unclassified'}
              onSelect={() => handleSelect({ type: 'unclassified' })}
              rowRef={
                selection.type === 'unclassified' ? selectedRowRef : undefined
              }
            />
          </div>

          <div className="shrink-0 border-t p-2">
            {creating ? (
              <form onSubmit={handleCreate} className="flex flex-col gap-1">
                <div className="flex gap-2">
                  <Input
                    autoFocus
                    placeholder="フォルダ名"
                    value={newFolderName}
                    onChange={(event) => setNewFolderName(event.target.value)}
                    aria-invalid={createError ? true : undefined}
                  />
                  <Button type="submit" disabled={createSubmitting}>
                    {createSubmitting ? '作成中...' : '作成'}
                  </Button>
                </div>
                {createError ? (
                  <p className="px-1 text-xs text-destructive">{createError}</p>
                ) : null}
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setCreating(true)}
                className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm text-muted-foreground transition-colors duration-150 hover:bg-muted/60 hover:text-foreground"
              >
                <PlusIcon className="size-4" />
                新しいフォルダ
              </button>
            )}
          </div>
        </DrawerContent>
      </Drawer>

      <AlertDialog
        open={deletingFolder != null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setDeletingFolder(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>フォルダの削除</AlertDialogTitle>
            <AlertDialogDescription>{deleteMessage}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteSubmitting}>
              キャンセル
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleteSubmitting}
              onClick={() => void handleDeleteConfirmed()}
            >
              {deleteSubmitting ? '削除中...' : '削除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
