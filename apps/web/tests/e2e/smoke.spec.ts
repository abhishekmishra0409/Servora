import { expect, test } from '@playwright/test';

const tableContext = {
  branch: { id: 'branch-1', name: 'Harbor Grill Downtown', serviceMode: 'waiter_confirmed', slug: 'downtown' },
  qr: { id: 'qr-1', token: 'qr-t1', version: 1 },
  table: { capacity: 4, id: 'table-1', status: 'free', tableNo: '1' },
  tableSession: null,
  tenant: { id: 'tenant-1', legalName: 'Harbor Grill', slug: 'harbor-grill' },
};

test('login page renders the Servora brand and sign-in form', async ({ page }) => {
  await page.goto('/login');

  await expect(page.getByRole('heading', { name: 'Sign in to your workspace' })).toBeVisible();
  await expect(page.getByText('Servora').first()).toBeVisible();
  await expect(page.getByLabel('Email address')).toBeVisible();
  await expect(page.getByLabel('Password', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeEnabled();
  await expect(page.locator('.material-symbols-outlined')).toHaveCount(0);
});

test('guest landing renders the bottom nav and join form with a mocked API', async ({ page }) => {
  await page.route('**/api/v1/public/table-context**', (route) =>
    route.fulfill({ body: JSON.stringify(tableContext), contentType: 'application/json' }),
  );

  await page.goto('/r/harbor-grill/downtown/t/qr-t1');

  await expect(page.getByRole('navigation', { name: 'Guest navigation' }).getByRole('link')).toHaveCount(5);
  await expect(page.getByLabel('Your name for this visit')).toBeVisible();
  await expect(page.getByRole('button', { name: /Join table|Loading table/ })).toBeVisible();
  await expect(page.locator('.material-symbols-outlined')).toHaveCount(0);
});

test('unauthenticated workspace routes redirect to login', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login$/);
});
