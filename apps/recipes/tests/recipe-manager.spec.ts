import { test, expect } from './msw-setup'

test.describe('Recipe Manager', () => {
  // Bypass authentication for all tests in this file
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
          value: 'TestUser',
          domain: '127.0.0.1',
          path: '/',
          expires: -1,
          httpOnly: false,
          secure: false,
          sameSite: 'Lax',
        },
        {
          name: 'site_email',
          value: 'emilioeh1991@gmail.com',
          domain: '127.0.0.1',
          path: '/',
          expires: -1,
          httpOnly: false,
          secure: false,
          sameSite: 'Lax',
        },
      ],
      origins: [],
    },
  })

  test.beforeEach(async ({ page }) => {
    // Mock user data to keep the test environment clean and isolated
    await page.route('**/api/recipes*', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          json: {
            recipes: [],
          },
        })
      } else {
        await route.fulfill({ json: { success: true } })
      }
    })
  })

  test('should NOT show the Add Recipe button', async ({ page }) => {
    // 1. Go to the recipe manager
    await page.goto('/protected/recipes')

    // Check we are not redirected to login
    await expect(page).toHaveURL(/\/protected\/recipes/)
    await expect(page.getByText('CHEFBOARD')).toBeVisible()

    // 2. Ensure "Add" button is missing
    await expect(page.getByRole('button', { name: 'Add Recipe' })).not.toBeVisible()
    // Also check for "Add" text just in case
    await expect(page.getByRole('button', { name: 'Add', exact: true })).not.toBeVisible()
  })
})
