import { beforeEach, describe, expect, it } from 'vitest';
import app from '../src/server/app';
import { resetAccounts } from '../src/server/store';

interface AccountResponse {
  id: string;
  handle: string;
  lastReadAt: string | null;
}

async function createAccount(handle: string): Promise<AccountResponse> {
  const response = await app.request('http://localhost/api/accounts', {
    method: 'POST',
    body: JSON.stringify({ handle }),
  });
  expect(response.status).toBe(201);
  return (await response.json()) as AccountResponse;
}

describe('account (Twitter LastRead) API', () => {
  beforeEach(() => {
    resetAccounts();
  });

  it('creates, lists, renames, and deletes accounts', async () => {
    const created = await createAccount('@alice');
    expect(created.handle).toBe('@alice');
    expect(created.lastReadAt).toBeNull();

    const listResponse = await app.request('http://localhost/api/accounts');
    expect(listResponse.status).toBe(200);
    const listed = (await listResponse.json()) as AccountResponse[];
    expect(listed).toHaveLength(1);
    expect(listed[0]).toEqual(
      expect.objectContaining({ id: created.id, handle: '@alice' })
    );

    const renameResponse = await app.request(
      `http://localhost/api/accounts/${created.id}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ handle: 'bob' }),
      }
    );
    expect(renameResponse.status).toBe(200);
    expect((await renameResponse.json()).handle).toBe('@bob');

    const deleteResponse = await app.request(
      `http://localhost/api/accounts/${created.id}`,
      { method: 'DELETE' }
    );
    expect(deleteResponse.status).toBe(204);

    const afterDelete = await app.request('http://localhost/api/accounts');
    expect(await afterDelete.json()).toEqual([]);
  });

  it('normalizes handles and rejects duplicates case-insensitively', async () => {
    await createAccount('alice');

    const duplicate = await app.request('http://localhost/api/accounts', {
      method: 'POST',
      body: JSON.stringify({ handle: '@ALICE' }),
    });
    expect(duplicate.status).toBe(400);

    const renameDuplicate = await createAccount('@bob');
    const response = await app.request(
      `http://localhost/api/accounts/${renameDuplicate.id}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ handle: '@Alice' }),
      }
    );
    expect(response.status).toBe(400);
  });

  it('rejects duplicates regardless of @ prefix', async () => {
    await createAccount('@alice');

    const withoutAt = await app.request('http://localhost/api/accounts', {
      method: 'POST',
      body: JSON.stringify({ handle: 'alice' }),
    });
    expect(withoutAt.status).toBe(400);
  });

  it('rejects empty and invalid handles', async () => {
    const empty = await app.request('http://localhost/api/accounts', {
      method: 'POST',
      body: JSON.stringify({ handle: '   ' }),
    });
    expect(empty.status).toBe(400);

    const invalid = await app.request('http://localhost/api/accounts', {
      method: 'POST',
      body: JSON.stringify({ handle: '@bad handle!' }),
    });
    expect(invalid.status).toBe(400);
  });

  it('marks as read with server timestamp', async () => {
    const created = await createAccount('@alice');
    const before = Date.now();

    const response = await app.request(
      `http://localhost/api/accounts/${created.id}/mark-as-read`,
      { method: 'POST' }
    );
    expect(response.status).toBe(200);
    const updated = (await response.json()) as AccountResponse;
    expect(updated.lastReadAt).not.toBeNull();

    const recorded = new Date(updated.lastReadAt as string).getTime();
    expect(recorded).toBeGreaterThanOrEqual(before - 1000);
    expect(recorded).toBeLessThanOrEqual(Date.now() + 1000);

    // 上書きされる（履歴は持たない）
    const second = await app.request(
      `http://localhost/api/accounts/${created.id}/mark-as-read`,
      { method: 'POST' }
    );
    const secondBody = (await second.json()) as AccountResponse;
    expect(
      new Date(secondBody.lastReadAt as string).getTime()
    ).toBeGreaterThanOrEqual(recorded);
  });

  it('edits and clears lastReadAt via PATCH', async () => {
    const created = await createAccount('@alice');

    const setResponse = await app.request(
      `http://localhost/api/accounts/${created.id}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ lastReadAt: '2026-07-25T09:30:00.000Z' }),
      }
    );
    expect(setResponse.status).toBe(200);
    expect((await setResponse.json()).lastReadAt).toBe(
      '2026-07-25T09:30:00.000Z'
    );

    const clearResponse = await app.request(
      `http://localhost/api/accounts/${created.id}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ lastReadAt: null }),
      }
    );
    expect(clearResponse.status).toBe(200);
    expect((await clearResponse.json()).lastReadAt).toBeNull();

    const invalidResponse = await app.request(
      `http://localhost/api/accounts/${created.id}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ lastReadAt: 'not-a-date' }),
      }
    );
    expect(invalidResponse.status).toBe(400);
  });

  it('returns 404 for unknown accounts', async () => {
    const patch = await app.request('http://localhost/api/accounts/unknown', {
      method: 'PATCH',
      body: JSON.stringify({ handle: '@nope' }),
    });
    expect(patch.status).toBe(404);

    const mark = await app.request(
      'http://localhost/api/accounts/unknown/mark-as-read',
      { method: 'POST' }
    );
    expect(mark.status).toBe(404);

    const del = await app.request('http://localhost/api/accounts/unknown', {
      method: 'DELETE',
    });
    expect(del.status).toBe(404);
  });
});
