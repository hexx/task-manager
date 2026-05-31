import { expect, test } from '@playwright/test';

test('adds, completes, and deletes a task', async ({ page }) => {
  await page.goto('/');

  const taskTitle = `Playwright task ${Date.now()}`;

  await page.getByPlaceholder('Add a new task').fill(taskTitle);
  await page.getByRole('button', { name: 'Add task' }).click();

  await expect(page.getByText(taskTitle)).toBeVisible();
  await expect(page.getByText('0/1 completed')).toBeVisible();

  await page.getByLabel(`Mark "${taskTitle}" as complete`).click();
  await expect(page.getByText('1/1 completed')).toBeVisible();

  await page.getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByText(taskTitle)).toHaveCount(0);
  await expect(page.getByText('No tasks yet. Add one above.')).toBeVisible();
});
