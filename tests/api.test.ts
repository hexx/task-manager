import { beforeEach, describe, expect, it } from 'vitest';
import app from '../src/server/app';
import { resetFolders, resetTasks } from '../src/server/store';

describe('task API', () => {
  beforeEach(() => {
    resetTasks();
    resetFolders();
  });

  it('creates, updates, lists, and deletes tasks', async () => {
    const createResponse = await app.request('http://localhost/api/tasks', {
      method: 'POST',
      body: JSON.stringify({ title: 'Write tests' })
    });

    expect(createResponse.status).toBe(201);
    const created = (await createResponse.json()) as { id: string; title: string; completed: boolean };
    expect(created.title).toBe('Write tests');
    expect(created.completed).toBe(false);

    const listResponse = await app.request('http://localhost/api/tasks');
    expect(listResponse.status).toBe(200);
    expect(await listResponse.json()).toEqual([
      expect.objectContaining({
        id: created.id,
        title: 'Write tests',
        completed: false
      })
    ]);

    const updateResponse = await app.request(`http://localhost/api/tasks/${created.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ completed: true })
    });

    expect(updateResponse.status).toBe(200);
    expect(await updateResponse.json()).toEqual(
      expect.objectContaining({
        id: created.id,
        completed: true
      })
    );

    const deleteResponse = await app.request(`http://localhost/api/tasks/${created.id}`, {
      method: 'DELETE'
    });

    expect(deleteResponse.status).toBe(204);

    const emptyListResponse = await app.request('http://localhost/api/tasks');
    expect(await emptyListResponse.json()).toEqual([]);
  });

  it('rejects empty task titles', async () => {
    const response = await app.request('http://localhost/api/tasks', {
      method: 'POST',
      body: JSON.stringify({ title: '   ' })
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ message: 'Task title is required.' });
  });

  it('moves a task to another folder via folderId update', async () => {
    const folderResponse = await app.request('http://localhost/api/folders', {
      method: 'POST',
      body: JSON.stringify({ name: 'Work' })
    });

    expect(folderResponse.status).toBe(201);
    const folder = (await folderResponse.json()) as { id: string };

    const createResponse = await app.request('http://localhost/api/tasks', {
      method: 'POST',
      body: JSON.stringify({ title: 'Task to move' })
    });

    expect(createResponse.status).toBe(201);
    const created = (await createResponse.json()) as {
      id: string;
      folderId: string | null;
    };
    expect(created.folderId).toBeNull();

    const updateResponse = await app.request(
      `http://localhost/api/tasks/${created.id}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ folderId: folder.id })
      }
    );

    expect(updateResponse.status).toBe(200);
    expect(await updateResponse.json()).toEqual(
      expect.objectContaining({
        id: created.id,
        folderId: folder.id
      })
    );

    const listResponse = await app.request(
      `http://localhost/api/tasks?folderId=${folder.id}`
    );
    const listed = (await listResponse.json()) as { id: string }[];
    expect(listed.map((task) => task.id)).toContain(created.id);
  });
});
