import { describe, expect, it } from 'vitest';
import { daysDiff, formatDeadline } from '../src/shared/deadline';

describe('daysDiff', () => {
  it('returns positive days for future deadlines', () => {
    expect(daysDiff('2026-07-21', '2026-07-22')).toBe(1);
    expect(daysDiff('2026-07-21', '2026-08-01')).toBe(11);
  });

  it('returns zero for today', () => {
    expect(daysDiff('2026-07-21', '2026-07-21')).toBe(0);
  });

  it('returns negative days for past deadlines', () => {
    expect(daysDiff('2026-07-21', '2026-07-19')).toBe(-2);
  });

  it('handles month boundaries', () => {
    expect(daysDiff('2026-07-31', '2026-08-01')).toBe(1);
    expect(daysDiff('2026-12-31', '2027-01-01')).toBe(1);
  });
});

describe('formatDeadline', () => {
  const today = '2026-07-21';

  it('formats today', () => {
    expect(formatDeadline('2026-07-21', today)).toEqual({
      relative: '今日',
      absolute: '7/21',
      overdue: false,
    });
  });

  it('formats tomorrow', () => {
    expect(formatDeadline('2026-07-22', today)).toEqual({
      relative: '明日',
      absolute: '7/22',
      overdue: false,
    });
  });

  it('formats future days', () => {
    expect(formatDeadline('2026-07-24', today)).toEqual({
      relative: '3日後',
      absolute: '7/24',
      overdue: false,
    });
  });

  it('formats overdue days', () => {
    expect(formatDeadline('2026-07-19', today)).toEqual({
      relative: '2日超過',
      absolute: '7/19',
      overdue: true,
    });
  });
});
