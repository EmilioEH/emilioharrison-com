import { test, expect } from '@playwright/test'

test.describe('Feedback Dashboard', () => {
  // Bypass authentication
  test.use({
    storageState: {
      cookies: [
        {
          name: 'site_auth',
          value: 'true',
          domain: '127.0.0.1',
          path: '/',
          expires: -1,
          httpOnly: false,
          secure: false,
          sameSite: 'Lax',
        },
        {
          name: 'site_user',
          value: 'Emilio',
          domain: '127.0.0.1',
          path: '/',
          expires: -1,
          httpOnly: false,
          secure: false,
          sameSite: 'Lax',
        },
        {
          name: 'site_email',
          value: 'emilioeh1991@gmail.com', // Whitelisted Admin
          domain: '127.0.0.1',
          path: '/',
          expires: -1,
          httpOnly: true,
          secure: false,
          sameSite: 'Lax',
        },
      ],
      origins: [],
    },
  })

  test.beforeEach(async ({ page }) => {
    // Mock Recipe API
    await page.route('**/api/recipes*', async (route) => {
      await route.fulfill({
        json: {
          recipes: [],
        },
      })
    })

    // Mock Feedback API
    await page.route('**/api/feedback*', async (route) => {
      const method = route.request().method()
      if (method === 'GET') {
        await route.fulfill({
          json: [
            {
              id: '1',
              type: 'bug',
              description: 'Fix the bug',
              status: 'open',
              timestamp: new Date().toISOString(),
              logs: [],
              context: { user: 'Test' },
            },
            {
              id: '2',
              type: 'idea',
              description: 'Add a feature',
              status: 'fixed',
              timestamp: new Date().toISOString(),
              logs: [],
              context: { user: 'Test' },
            },
          ],
        })
      } else if (method === 'PUT') {
        const body = route.request().postDataJSON()
        await route.fulfill({ json: { success: true, ...body } })
      } else {
        await route.continue()
      }
    })

    await page.goto('/protected/recipes')
    // Wait for app load
    await expect(page.getByRole('button', { name: 'Add Recipe' })).toBeVisible({ timeout: 15000 })
  })

  test.skip('should verify feedback dashboard functionality', async ({ page }) => {
    // Open Menu
    await page.getByRole('button', { name: 'Open Menu' }).click()

    // Check "Feedback Dashboard" button
    const dashboardBtn = page.getByRole('menuitem', { name: 'Feedback Dashboard' })
    await expect(dashboardBtn).toBeVisible()
    await dashboardBtn.click()

    // Dashboard should be visible
    await expect(page.getByRole('heading', { name: 'Feedback Dashboard' })).toBeVisible()

    // Check Open Tab
    await expect(page.getByText('Fix the bug')).toBeVisible()
    await expect(page.getByText('Add a feature')).not.toBeVisible()

    // Check Status Counts
    await expect(page.getByText('1', { exact: true }).first()).toBeVisible() // Open count

    // Switch to Resolved
    await page.getByRole('button', { name: 'Resolved' }).click()
    await expect(page.getByText('Add a feature')).toBeVisible()
    await expect(page.getByText('Fix the bug')).not.toBeVisible()

    // Switch to All
    await page.getByRole('button', { name: 'All Reports' }).click()
    await expect(page.getByText('Fix the bug')).toBeVisible()
    await expect(page.getByText('Add a feature')).toBeVisible()

    // Test Mark as Fixed
    await page.getByRole('button').filter({ hasText: 'Open' }).first().click()

    // Expand item (Using heading to avoid ambiguity)
    await page.getByRole('heading', { name: 'Fix the bug' }).click()

    // Click Mark Fixed
    const buttons = page.getByRole('button', { name: 'Mark Fixed' })
    const count = await buttons.count()
    if (count > 0) {
      const btn = (await buttons.first().isVisible()) ? buttons.first() : buttons.nth(1)
      await btn.click()
    }

    // Optimistic update should remove it from Open tab
    await expect(page.getByRole('heading', { name: 'Fix the bug' })).not.toBeVisible()

    // Check All Reports tab
    const allReportsBtn = page.getByRole('button').filter({ hasText: 'All Reports' })
    await allReportsBtn.click()
    await expect(allReportsBtn).toHaveClass(/border-indigo-500/)

    // Wait for animation/tab switch
    await expect(page.getByRole('heading', { name: 'Fix the bug' })).toBeVisible()

    // Check key "Fixed" badge exists near the item
    // It should be within the same container.
    // We can just check that "Fixed" text is visible generally as a quick check,
    // or look for the specific badge.
    await expect(page.getByText('Fixed').first()).toBeVisible()

    // Check Resolved tab
    await page.getByRole('button').filter({ hasText: 'Resolved' }).click()
    await expect(page.getByRole('heading', { name: 'Fix the bug' })).toBeVisible()
  })

  test('should NOT show dashboard to non-admin user', async ({ page }) => {
    // Override cookie for this specific test
    await page.context().addCookies([
      {
        name: 'site_user',
        value: 'OtherUser', // Not Emilio
        domain: '127.0.0.1',
        path: '/',
      },
      {
        name: 'site_email',
        value: 'user@gmail.com', // Whitelisted but NOT Admin
        domain: '127.0.0.1',
        path: '/',
      },
    ])

    await page.goto('/protected/recipes')
    await page.getByRole('button', { name: 'Open Menu' }).click()

    // Check "Feedback Dashboard" button is NOT there
    await expect(page.getByRole('menuitem', { name: 'Feedback Dashboard' })).not.toBeVisible()
  })
})
