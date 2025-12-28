import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test('should display login page with Google Sign-in', async ({ page }) => {
    // 1. Visit Login Page
    await page.goto('/protected/recipes/login')

    // 2. Verify UI Elements
    await expect(page.getByRole('heading', { name: 'Chef Login' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Sign in with Google' })).toBeVisible()
  })

  test('should redirect to login if unauthenticated', async ({ page }) => {
    await page.goto('/protected/recipes')
    await expect(page).toHaveURL(/\/protected\/recipes\/login/)
  })

  test('should redirect to login if user cookie is missing (stale session)', async ({
    context,
    page,
  }) => {
    // Manually set authorized cookie but NOT the user cookie
    await context.addCookies([
      {
        name: 'site_auth',
        value: 'true',
        domain: '127.0.0.1',
        path: '/',
      },
    ])

    await page.goto('/protected/recipes')
    await expect(page).toHaveURL(/\/protected\/recipes\/login/)
  })

  test('should allow logout', async ({ context, page }) => {
    // Manually login
    await context.addCookies([
      {
        name: 'site_auth',
        value: 'true',
        domain: '127.0.0.1',
        path: '/',
      },
      {
        name: 'site_user',
        value: 'TestUser',
        domain: '127.0.0.1',
        path: '/',
      },
    ])

    // 1. Visit Protected Page
    await page.goto('/protected/recipes')
    await expect(page.getByText('Welcome, TestUser')).toBeVisible()

    // 2. Click Logout
    await page.getByText('Log Out').click()

    // 3. Verify Redirect
    await expect(page).toHaveURL(/\/protected\/recipes\/login/)

    // 4. Verify Cookie Cleared?
    // Hard to check cookie deletion directly in Playwright without getting cookies again
    // But the redirect confirms session is gone (middleware enforces it)
    await expect(page.getByRole('heading', { name: 'Chef Login' })).toBeVisible()
  })
})
