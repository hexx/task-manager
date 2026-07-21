import { beforeEach, describe, expect, it } from 'vitest';
import app from '../src/server/app';
import { resetChecklists, resetFolders, resetTasks } from '../src/server/store';

interface ChecklistResponse {
  id: string;
  name: string;
  items: { id: string; title: string; checked: boolean }[];
}

interface ItemResponse {
  id: string;
  title: string;
  checked: boolean;
}

async function createChecklist(name: string): Promise<ChecklistResponse> {
  const response = await app.request('http://localhost/api/checklists', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
  expect(response.status).toBe(201);
  return (await response.json()) as ChecklistResponse;
}

async function createItem(checklistId: string, title: string): Promise<ItemResponse> {
  const response = await app.request(`http://localhost/api/checklists/${checklistId}/items`, {
    method: 'POST',
    body: JSON.stringify({ title }),
  });
  expect(response.status).toBe(201);
  return (await response.json()) as ItemResponse;
}

describe('checklist API', () => {
  beforeEach(() => {
    resetChecklists();
    resetTasks();
    resetFolders();
  });

  it('creates, renames, lists, and deletes checklists', async () => {
    const created = await createChecklist('Packing list');
    expect(created.name).toBe('Packing list');
    expect(created.items).toEqual([]);

    const listResponse = await app.request('http://localhost/api/checklists');
    expect(listResponse.status).toBe(200);
    const listed = (await listResponse.json()) as ChecklistResponse[];
    expect(listed).toHaveLength(1);
    expect(listed[0]).toEqual(expect.objectContaining({ id: created.id, name: 'Packing list' }));

    const renameResponse = await app.request(`http://localhost/api/checklists/${created.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Trip packing list' }),
    });
    expect(renameResponse.status).toBe(200);
    expect((await renameResponse.json()).name).toBe('Trip packing list');

    const deleteResponse = await app.request(`http://localhost/api/checklists/${created.id}`, {
      method: 'DELETE',
    });
    expect(deleteResponse.status).toBe(204);

    const afterDelete = await app.request('http://localhost/api/checklists');
    expect(await afterDelete.json()).toEqual([]);
  });

  it('rejects empty checklist names', async () => {
    const response = await app.request('http://localhost/api/checklists', {
      method: 'POST',
      body: JSON.stringify({ name: '   ' }),
    });
    expect(response.status).toBe(400);
  });

  it('returns 404 for unknown checklists', async () => {
    const patchResponse = await app.request('http://localhost/api/checklists/unknown', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Nope' }),
    });
    expect(patchResponse.status).toBe(404);

    const deleteResponse = await app.request('http://localhost/api/checklists/unknown', {
      method: 'DELETE',
    });
    expect(deleteResponse.status).toBe(404);

    const resetResponse = await app.request('http://localhost/api/checklists/unknown/reset', {
      method: 'POST',
    });
    expect(resetResponse.status).toBe(404);
  });

  it('adds items in insertion order, toggles, renames, and deletes them', async () => {
    const checklist = await createChecklist('Packing list');
    const wallet = await createItem(checklist.id, 'Wallet');
    const keys = await createItem(checklist.id, 'Keys');
    const phone = await createItem(checklist.id, 'Phone');

    const listResponse = await app.request('http://localhost/api/checklists');
    const listed = (await listResponse.json()) as ChecklistResponse[];
    expect(listed[0].items.map((item) => item.title)).toEqual(['Wallet', 'Keys', 'Phone']);
    expect(listed[0].items.every((item) => item.checked === false)).toBe(true);

    const toggleResponse = await app.request(
      `http://localhost/api/checklists/${checklist.id}/items/${wallet.id}`,
      { method: 'PATCH', body: JSON.stringify({ checked: true }) }
    );
    expect(toggleResponse.status).toBe(200);
    expect(((await toggleResponse.json()) as ItemResponse).checked).toBe(true);

    const renameResponse = await app.request(
      `http://localhost/api/checklists/${checklist.id}/items/${keys.id}`,
      { method: 'PATCH', body: JSON.stringify({ title: 'House keys' }) }
    );
    expect(renameResponse.status).toBe(200);
    expect(((await renameResponse.json()) as ItemResponse).title).toBe('House keys');

    const deleteResponse = await app.request(
      `http://localhost/api/checklists/${checklist.id}/items/${phone.id}`,
      { method: 'DELETE' }
    );
    expect(deleteResponse.status).toBe(204);

    const afterDelete = await app.request('http://localhost/api/checklists');
    const remaining = ((await afterDelete.json()) as ChecklistResponse[])[0].items;
    expect(remaining.map((item) => item.title)).toEqual(['Wallet', 'House keys']);
  });

  it('rejects empty item titles and unknown items', async () => {
    const checklist = await createChecklist('Packing list');

    const emptyResponse = await app.request(`http://localhost/api/checklists/${checklist.id}/items`, {
      method: 'POST',
      body: JSON.stringify({ title: '  ' }),
    });
    expect(emptyResponse.status).toBe(400);

    const unknownItemResponse = await app.request(
      `http://localhost/api/checklists/${checklist.id}/items/unknown`,
      { method: 'PATCH', body: JSON.stringify({ checked: true }) }
    );
    expect(unknownItemResponse.status).toBe(404);

    const unknownChecklistResponse = await app.request(
      'http://localhost/api/checklists/unknown/items',
      { method: 'POST', body: JSON.stringify({ title: 'Wallet' }) }
    );
    expect(unknownChecklistResponse.status).toBe(404);
  });

  it('scopes item operations to their checklist', async () => {
    const first = await createChecklist('First');
    const second = await createChecklist('Second');
    const item = await createItem(first.id, 'Wallet');

    const crossResponse = await app.request(
      `http://localhost/api/checklists/${second.id}/items/${item.id}`,
      { method: 'PATCH', body: JSON.stringify({ checked: true }) }
    );
    expect(crossResponse.status).toBe(404);

    const crossDeleteResponse = await app.request(
      `http://localhost/api/checklists/${second.id}/items/${item.id}`,
      { method: 'DELETE' }
    );
    expect(crossDeleteResponse.status).toBe(404);
  });

  it('resets all checked items', async () => {
    const checklist = await createChecklist('Packing list');
    const wallet = await createItem(checklist.id, 'Wallet');
    const keys = await createItem(checklist.id, 'Keys');

    for (const item of [wallet, keys]) {
      await app.request(`http://localhost/api/checklists/${checklist.id}/items/${item.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ checked: true }),
      });
    }

    const resetResponse = await app.request(
      `http://localhost/api/checklists/${checklist.id}/reset`,
      { method: 'POST' }
    );
    expect(resetResponse.status).toBe(204);

    const listResponse = await app.request('http://localhost/api/checklists');
    const listed = (await listResponse.json()) as ChecklistResponse[];
    expect(listed[0].items).toHaveLength(2);
    expect(listed[0].items.every((item) => item.checked === false)).toBe(true);
  });

  it('deletes items together with their checklist', async () => {
    const checklist = await createChecklist('Packing list');
    await createItem(checklist.id, 'Wallet');

    const deleteResponse = await app.request(`http://localhost/api/checklists/${checklist.id}`, {
      method: 'DELETE',
    });
    expect(deleteResponse.status).toBe(204);

    const listResponse = await app.request('http://localhost/api/checklists');
    expect(await listResponse.json()).toEqual([]);
  });
});
