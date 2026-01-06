import { test, expect } from './msw-setup'

test.describe('Admin Family Management', () => {
  // Override the site_email cookie to simulate an admin
  // note: mock setup usually respects this if we inject it correctly

  test('Non-admin cannot access admin dashboard API', async ({ page }) => {
    // Normal user login
    await page.goto('/protected/recipes/library')

    const response = await page.request.get('/protected/recipes/api/admin/families')
    expect(response.status()).toBe(403)
  })

  // We need a way to mock the ADMIN_EMAILS env or the server response for this test.
  // Since we rely on msw-setup, we can mock the API response directly to verify the UI.

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

    await page.goto('/protected/recipes/library')

    // Wait for app to hydrate/load
    await expect(page.locator('input[placeholder="Search recipes..."]')).toBeVisible()

    // Evaluate script to trigger navigation (since menu is hidden for non-Emilio usually)
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

    await page.goto('/protected/recipes/library')
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
