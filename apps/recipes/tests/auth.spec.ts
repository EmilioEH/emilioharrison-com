import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test('should allow user to log in with password and name', async ({ page }) => {
    // 1. Visit Login Page
    await page.goto('/protected/recipes/login')

    // 2. Fill in credentials
    await page.getByLabel('Your Name').fill('TestUser')
    await page.getByLabel('Password').fill('password123') // Assuming default dev password

    // 3. Submit
    await page.getByRole('button', { name: 'Enter Kitchen' }).click()

    // 4. Verify Redirect to Protected App
    await expect(page).toHaveURL(/\/protected\/recipes/)

    // 5. Verify User Name in Header
    await expect(page.getByText('Welcome, TestUser')).toBeVisible()

    // 6. Verify Log Out
    await page.getByText('Log Out').click()
    await expect(page).toHaveURL(/\/protected\/recipes\/login/)
    await expect(page.getByRole('heading', { name: 'Chef Login' })).toBeVisible()
  })

  test('should show error for incorrect password', async ({ page }) => {
    await page.goto('/protected/recipes/login')
    await page.getByLabel('Your Name').fill('Hacker')
    await page.getByLabel('Password').fill('wrongpassword')
    await page.getByRole('button', { name: 'Enter Kitchen' }).click()

    await expect(page.getByText('Incorrect password')).toBeVisible()
  })

  test('should require name', async ({ page }) => {
    await page.goto('/protected/recipes/login')
    // Don't fill name
    await page.getByLabel('Password').fill('password123')
    await page.getByRole('button', { name: 'Enter Kitchen' }).click()

    await expect(page.getByText('Please enter your name')).toBeVisible()
  })

  test('should redirect to login if site_user cookie is missing (stale session)', async ({
    context,
    page,
  }) => {
    // Manually set authorized cookie but NOT the user cookie
    await context.addCookies([
      {
        name: 'site_auth',
        value: 'true',
        domain: 'localhost',
        path: '/',
      },
    ])

    await page.goto('/protected/recipes')

    // CURRENT BEHAVIOR (BUG): It stays on recipes page
    // DESIRED BEHAVIOR (FIX): It redirects to /login
    // We expect this to fail initially if we assert the redirect
    await expect(page).toHaveURL(/\/protected\/recipes\/login/)
  })
})
