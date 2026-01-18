import { test, expect } from './msw-setup'
import { setupApiMock } from './msw-setup'

test.describe('Family Management', () => {
  test.beforeEach(async ({ page }) => {
    // Setup API mocks
    await setupApiMock(page)

    // Cookie to skip initial setup and bypass Auth
    await page.context().addCookies([
      { name: 'site_user', value: 'Emilio', domain: '127.0.0.1', path: '/' },
      { name: 'skip_family_setup', value: 'true', domain: '127.0.0.1', path: '/' },
    ])

    await page.goto('/protected/recipes')
  })

  test('user can access and view family management', async ({ page }) => {
    // 1. Wait for loading to complete
    await expect(page.getByTestId('loading-indicator')).not.toBeVisible()

    // 2. Open Burger Menu
    await page.click('button[aria-label="Menu"]')

    // 2. Click Manage Family
    await page.click('text=Manage Family')

    // 3. Verify View
    await expect(page.locator('h2')).toContainText('Manage Family')
    await expect(page.locator('section:has-text("Family Identity")')).toBeVisible()
    await expect(page.locator('section:has-text("Members")')).toBeVisible()
  })

  test('admin can see rename and invite controls', async ({ page }) => {
    await page.click('button[aria-label="Menu"]')
    await page.click('text=Manage Family')

    // Should see "Rename" button (as we mocked an admin/creator role in msw-setup)
    await expect(page.locator('button:has-text("Rename")')).toBeVisible()

    // Should see "Invite" button
    await expect(page.locator('button:has-text("Invite")')).toBeVisible()
  })
})
