/**
 * Twitter の閲覧記録（LastRead）機能の共有型と表示ヘルパー。
 * 仕様: docs/twitter-spec.md / 用語: CONTEXT.md（Account, LastRead, MarkAsRead）
 */

export interface Account {
  id: string;
  /** @xxx 形式。先頭の @ は正規化済み */
  handle: string;
  /** UTC の ISO 文字列。未記録は null */
  lastReadAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAccountInput {
  handle: string;
}

export interface UpdateAccountInput {
  handle?: string;
  /** null = 未記録に戻す / undefined = 変更なし */
  lastReadAt?: string | null;
}

/** ハンドルを @xxx 形式に正規化する。不正なら null を返す */
export function normalizeHandle(raw: string): string | null {
  const trimmed = raw.trim();
  const withAt = trimmed.startsWith('@') ? trimmed : `@${trimmed}`;
  return /^@[A-Za-z0-9_]{1,15}$/.test(withAt) ? withAt : null;
}

/** ハンドルの比較用キー（大文字小文字を区別しない） */
export function handleKey(handle: string): string {
  return handle.toLowerCase();
}

export interface LastReadDisplay {
  /** 例: 7/25 18:30 */
  absolute: string;
  /** 例: 3時間前 */
  relative: string;
}

/**
 * LastRead を「絶対 + 相対」の併記用データに変換する（ローカルタイムゾーン基準）。
 * 不正な日付（DB 損傷等）の場合は null を返す。
 */
export function formatLastRead(
  iso: string,
  now: Date = new Date()
): LastReadDisplay | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const absolute = `${date.getMonth() + 1}/${date.getDate()} ${String(
    date.getHours()
  ).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

  const diffMs = now.getTime() - date.getTime();
  if (diffMs < 0) {
    return { absolute, relative: '未来の日時' };
  }

  const minutes = Math.floor(diffMs / 60_000);
  let relative: string;
  if (minutes < 1) {
    relative = 'たった今';
  } else if (minutes < 60) {
    relative = `${minutes}分前`;
  } else if (minutes < 60 * 24) {
    relative = `${Math.floor(minutes / 60)}時間前`;
  } else {
    relative = `${Math.floor(minutes / (60 * 24))}日前`;
  }

  return { absolute, relative };
}

/** UTC ISO 文字列を <input type="datetime-local"> 用のローカル値に変換する */
export function toDatetimeLocalValue(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${mo}-${day}T${h}:${mi}`;
}

/** <input type="datetime-local"> のローカル値を UTC ISO 文字列に変換する */
export function fromDatetimeLocalValue(value: string): string {
  return new Date(value).toISOString();
}
