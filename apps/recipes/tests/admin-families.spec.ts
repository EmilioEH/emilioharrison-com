import { test, expect, AUTH_COOKIES } from './msw-setup'

test.describe('Admin Family Management', () => {
  test('Non-admin cannot access admin dashboard API', async ({ page }) => {
    // Add non-admin auth cookies (different email from ADMIN_EMAILS)
    await page.context().addCookies([
      { name: 'site_auth', value: 'true', domain: '127.0.0.1', path: '/' },
      { name: 'site_user', value: 'NonAdminUser', domain: '127.0.0.1', path: '/' },
      { name: 'site_email', value: 'nonadmin@test.com', domain: '127.0.0.1', path: '/' },
      { name: 'skip_family_setup', value: 'true', domain: '127.0.0.1', path: '/' },
    ])

    // Navigate to app first to establish context
    await page.goto('/protected/recipes')

    // Make API request from within the page context to ensure cookies are sent
    const status = await page.evaluate(async () => {
      try {
        const response = await fetch('/protected/recipes/api/admin/families')
        return response.status
      } catch {
        return 0
      }
    })

    // It might be 401 if auth fails or 403 if admin check fails.
    // Both are "blocked" for non-admins.
    expect(status).toBeGreaterThanOrEqual(401)
    if (status !== 200) {
      // Just check it's not 200
      expect(status).not.toBe(200)
    }
  })

  test('Admin can view family dashboard', async ({ page }) => {
    // Mock the admin families API
    await page.route('**/api/admin/families', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          families: [
            { id: 'fam_1', name: 'Harrison Family', memberCount: 2, createdBy: 'u1' },
            { id: 'fam_2', name: 'Doe Family', memberCount: 4, createdBy: 'u2' },
          ],
        }),
      })
    })

    // Add all required auth cookies
    await page.context().addCookies([...AUTH_COOKIES])

    await page.goto('/protected/recipes')

    // Wait for app to hydrate/load - wait longer if needed
    await expect(page.getByPlaceholder('Search recipes...')).toBeVisible({ timeout: 10000 })

    // Navigate to admin dashboard
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('navigate-to-admin-dashboard'))
    })

    await expect(page.getByText('Admin Dashboard')).toBeVisible()
    await expect(page.getByText('Harrison Family')).toBeVisible()
    await expect(page.getByText('Doe Family')).toBeVisible()
  })

  test('Admin can drill into family details', async ({ page }) => {
    // Mock list
    await page.route('**/api/admin/families', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          families: [{ id: 'fam_1', name: 'Harrison Family', memberCount: 2, createdBy: 'u1' }],
        }),
      })
    })

    // Mock details for specific family override
    await page.route('**/api/families/current?familyId=fam_1', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          family: { id: 'fam_1', name: 'Harrison Family', createdBy: 'u1' },
          members: [
            { id: 'u1', displayName: 'Emilio', email: 'emilio@test.com', role: 'creator' },
            { id: 'u2', displayName: 'John', email: 'john@test.com', role: 'user' },
          ],
          outgoingInvites: [],
        }),
      })
    })

    // Add all required auth cookies
    await page.context().addCookies([...AUTH_COOKIES])

    await page.goto('/protected/recipes')

    // Wait for app to hydrate
    await expect(page.getByPlaceholder('Search recipes...')).toBeVisible({ timeout: 10000 })

    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('navigate-to-admin-dashboard'))
    })

    await page.getByText('Harrison Family').click()

    await expect(page.getByText('Members')).toBeVisible()
    await expect(page.getByText('Emilio')).toBeVisible()
    await expect(page.getByText('John')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Delete Family' })).toBeVisible()
  })
})
