/**
 * Deadline の表示用ヘルパー。
 * 日付はすべて `YYYY-MM-DD` 形式の文字列で扱い、
 * Overdue 判定はクライアントのローカル日付を基準にする（docs/deadline-spec.md 3.4）。
 */

/** ブラウザのローカル日付を `YYYY-MM-DD` で返す */
export function localToday(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** today から deadline までの日数差（deadline が未来なら正、過去なら負） */
export function daysDiff(today: string, deadline: string): number {
  const [ty, tm, td] = today.split('-').map(Number);
  const [dy, dm, dd] = deadline.split('-').map(Number);
  const t = Date.UTC(ty, tm - 1, td);
  const d = Date.UTC(dy, dm - 1, dd);
  return Math.round((d - t) / 86_400_000);
}

export interface DeadlineDisplay {
  /** 相対表示（例: 今日 / 明日 / 3日後 / 2日超過） */
  relative: string;
  /** 絶対日付の短縮表記（例: 8/1） */
  absolute: string;
  /** 期限超過か（今日より過去） */
  overdue: boolean;
}

/**
 * Deadline を「相対 + 絶対」の併記用データに変換する。
 * 例: `明日 (8/1)` / 超過時は `2日超過 (7/19)`
 */
export function formatDeadline(
  deadline: string,
  today: string = localToday()
): DeadlineDisplay {
  const diff = daysDiff(today, deadline);
  const [, m, d] = deadline.split('-').map(Number);
  const absolute = `${m}/${d}`;

  let relative: string;
  let overdue = false;
  if (diff === 0) {
    relative = '今日';
  } else if (diff === 1) {
    relative = '明日';
  } else if (diff > 1) {
    relative = `${diff}日後`;
  } else {
    overdue = true;
    relative = `${-diff}日超過`;
  }

  return { relative, absolute, overdue };
}
