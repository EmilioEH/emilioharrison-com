import { test, expect } from '@playwright/test'

test.describe('Back Button Navigation', () => {
  // We need to perform actual login to test history, so we don't use storageState here
  test.use({ storageState: { cookies: [], origins: [] } })

  test('should not return to login page after logging in and pressing back', async ({ page }) => {
    // 1. Go to a neutral starting page
    await page.goto('about:blank')

    // 2. Go to Login
    await page.goto('/protected/recipes/login')
    await expect(page.getByText('Chef Login')).toBeVisible()

    // 3. Perform Login
    await page.fill('input[name="name"]', 'Emilio')
    await page.fill('input[name="password"]', 'password123')
    await page.click('button[type="submit"]')

    // 4. Wait for redirection to app
    await expect(page).toHaveURL(/\/protected\/recipes/)
    await expect(page.getByText('CHEFBOARD')).toBeVisible()

    // 5. Press Back
    await page.goBack()

    // 6. Should NOT be at login. Should be at about:blank
    await expect(page).toHaveURL('about:blank')
    await expect(page).not.toHaveURL(/\/login/)
  })
})
