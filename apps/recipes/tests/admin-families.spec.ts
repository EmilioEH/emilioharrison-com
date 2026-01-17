import { test, expect, AUTH_COOKIES } from './msw-setup'

test.describe('Admin Family Management', () => {
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
    await expect(page.getByPlaceholder('Search recipes...')).toBeVisible({ timeout: 30000 })

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
    await expect(page.getByPlaceholder('Search recipes...')).toBeVisible({ timeout: 30000 })

    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('navigate-to-admin-dashboard'))
    })

    await page.getByText('Harrison Family').click()

    await expect(page.getByText('Members')).toBeVisible()
    await expect(page.getByText('Emilio', { exact: true })).toBeVisible()
    await expect(page.getByText('John', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Delete Family' })).toBeVisible()
  })

  test('Admin can delete a family', async ({ page }) => {
    // Mock initial list
    await page.route('**/api/admin/families', async (route) => {
      if (route.request().method() === 'GET') {
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
        return
      }
      if (route.request().method() === 'DELETE') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        })
        return
      }
    })

    // Setup dialog handler
    page.on('dialog', (dialog) => dialog.accept())

    // Add all required auth cookies
    await page.context().addCookies([...AUTH_COOKIES])

    await page.goto('/protected/recipes')

    // Wait for app
    await expect(page.getByPlaceholder('Search recipes...')).toBeVisible({ timeout: 30000 })

    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('navigate-to-admin-dashboard'))
    })

    await page.getByText('Families (2)').click()

    // Find delete button for Harrison Family
    // Identifying the row by text 'Harrison Family' and then finding the delete button within that row or using a more specific selector
    // The table structure is: tr > td (name) ... td (actions) > button (trash)
    // We can use Playwright's layout selectors
    const familyRow = page.getByRole('row', { name: 'Harrison Family' })
    const deleteBtn = familyRow.getByTitle('Delete Family')

    await expect(deleteBtn).toBeVisible()
    await deleteBtn.click()

    // Assert it disappears (optimistic update or re-fetch)
    // The implementation uses optimistic filter
    await expect(page.getByText('Harrison Family')).not.toBeVisible()
    await expect(page.getByText('Doe Family')).toBeVisible()
  })
})
