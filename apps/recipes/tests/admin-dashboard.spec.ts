import { test, expect, AUTH_COOKIES } from './msw-setup'

test.describe('Admin Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Mock Admin API endpoints
    await page.route('**/api/admin/users', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          users: [
            {
              id: 'TestUser',
              email: 'emilioeh1991@gmail.com',
              displayName: 'Emilio',
              status: 'approved',
              joinedAt: new Date().toISOString(),
              stats: { recipesAdded: 5, recipesCooked: 10 },
            },
            {
              id: 'User2',
              email: 'guest@example.com',
              displayName: 'Guest',
              status: 'pending',
              joinedAt: new Date().toISOString(),
              stats: { recipesAdded: 0, recipesCooked: 0 },
            },
          ],
        }),
      })
    })

    await page.route('**/api/admin/access-codes', async (route) => {
      const method = route.request().method()
      if (method === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, code: 'NEWCODE' }),
        })
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            invites: [
              {
                code: 'TEST12',
                createdBy: 'emilioeh1991@gmail.com',
                createdByName: 'Emilio',
                createdAt: new Date().toISOString(),
                status: 'accepted',
                acceptedBy: 'User2',
                acceptedByName: 'Guest',
                acceptedAt: new Date().toISOString(),
              },
            ],
          }),
        })
      }
    })

    await page.route('**/api/admin/invites', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          invites: [
            {
              id: 'inv-1',
              email: 'invitee@example.com',
              invitedByName: 'Emilio',
              familyId: 'fam-1',
              status: 'pending',
              createdAt: new Date().toISOString(),
            },
          ],
        }),
      })
    })

    // Mock Delete/Patch endpoints
    await page.route('**/api/admin/users', async (route) => {
      const method = route.request().method()
      if (method === 'DELETE') {
        await route.fulfill({ status: 200, body: JSON.stringify({ success: true }) })
      } else if (method === 'PUT') {
        await route.fulfill({ status: 200, body: JSON.stringify({ success: true }) })
      } else {
        await route.continue()
      }
    })

    await page.route('**/api/admin/access-codes', async (route) => {
      const method = route.request().method()
      if (method === 'DELETE') {
        await route.fulfill({ status: 200, body: JSON.stringify({ success: true }) })
      } else if (method === 'PATCH') {
        await route.fulfill({ status: 200, body: JSON.stringify({ success: true }) })
      } else {
        await route.continue() // Fallback to previous mock if GET/POST
      }
    })

    await page.route('**/api/admin/invites', async (route) => {
      const method = route.request().method()
      if (method === 'DELETE') {
        await route.fulfill({ status: 200, body: JSON.stringify({ success: true }) })
      } else {
        await route.continue()
      }
    })

    await page.context().addCookies([...AUTH_COOKIES])
    await page.goto('/protected/recipes')
  })

  test('should display admin dashboard and tabs', async ({ page }) => {
    // Debug: Check if user is recognized
    await expect(page.getByText(/Welcome/i)).toBeVisible({ timeout: 5000 })

    // Open Burger Menu
    await page.getByRole('button', { name: /menu/i }).click()

    // Check for Admin Dashboard link (it should be visible for admins)

    const adminLink = page.getByText('Admin Dashboard')
    await adminLink.click()

    // Verify Dashboard Headers/Tabs
    await expect(page.getByRole('heading', { name: 'Admin Dashboard' })).toBeVisible()

    // Tab: Users (Default)
    await expect(page.getByText('Users (2)')).toHaveClass(/text-orange-600/) // Active
    await expect(page.getByText('emilioeh1991@gmail.com')).toBeVisible()
    await expect(page.getByText('guest@example.com')).toBeVisible()
    // Check Stats
    await expect(page.getByText('Added: 5')).toBeVisible()
    await expect(page.getByText('Cooked: 10')).toBeVisible()

    // Switch to Access Codes
    await page.getByText('Access Codes').click()
    await expect(page.getByText('TEST12')).toBeVisible()
    await expect(page.getByText('Accepted By')).toBeVisible()
    await expect(page.getByText('Guest')).toBeVisible() // User who accepted

    // Switch to Family Invites
    await page.getByText('Family Invites').click()
    await expect(page.getByText('invitee@example.com')).toBeVisible()
    await expect(page.getByText('pending')).toBeVisible()
  })

  test('should handle user actions', async ({ page }) => {
    // Wait for hydration
    // Wait for hydration/rendering
    await page.waitForTimeout(3000)

    await page.getByRole('button', { name: /menu/i }).click()
    await page.getByText('Admin Dashboard').click()

    // Mock Dialog
    page.on('dialog', (dialog) => dialog.accept())

    // Test Delete User
    const deleteBtn = page.locator('button[title="Delete User"]').first()
    await deleteBtn.click()
    // In a real e2e with mock, we assume success removes the row locally.
    // Our mock implementation updates local state on success.
    await expect(page.getByText('emilioeh1991@gmail.com')).not.toBeVisible()

    // Test Toggle Status (on second user since first is gone)
    const toggleBtn = page.locator('button[title="Enable User"]').first() // 'status' was pending, so it should be "Enable" button?
    // Wait, User2 status is 'pending', logic says:
    // user.status === 'approved' ? 'Disable User' : 'Enable User'
    // So for pending, it is 'Enable User'.
    await toggleBtn.click()
    // It should flip to approved locally
    await expect(page.locator('button[title="Disable User"]').first()).toBeVisible()
  })

  test('should handle code and invite actions', async ({ page }) => {
    // Wait for hydration
    // Wait for hydration/rendering
    await page.waitForTimeout(3000)

    await page.getByRole('button', { name: /menu/i }).click()
    await page.getByText('Admin Dashboard').click()
    page.on('dialog', (dialog) => dialog.accept())

    // Codes
    await page.getByText('Access Codes').click()
    const deleteCodeBtn = page.locator('button[title="Delete Code"]').first()
    await deleteCodeBtn.click()
    await expect(page.getByText('TEST12')).not.toBeVisible()

    // Invites
    await page.getByText('Family Invites').click()
    const deleteInviteBtn = page.locator('button[title="Revoke Invite"]').first()
    await deleteInviteBtn.click()
    await expect(page.getByText('invitee@example.com')).not.toBeVisible()
  })
})
