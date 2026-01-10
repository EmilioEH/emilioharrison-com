import { test, expect } from './msw-setup'

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

    await page.goto('/protected/recipes')
  })

  test('should display admin dashboard and tabs', async ({ page }) => {
    // Open Burger Menu
    await page.getByRole('button', { name: /menu/i }).click()

    // Check for Admin Dashboard link (it should be visible for admins)
    const adminLink = page.getByText('Admin Dashboard')
    await expect(adminLink).toBeVisible()
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
})
